import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, startTransition, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loginWithCredentials, loginWithGoogleToken } from '../auth/keycloakApi';
import { userService } from '../services/UserService';
import { getClient, setLogoutCallback } from '../lib/http-client';
import { networkService } from '../services/network/networkService';
import { useUser } from '../hooks/useUser';
import { useAppInitialized } from '../hooks/useAppInitialized';
import { getTnCData, needsTnCAcceptance, TnCData } from '../services/TnCService';
import { socialLoginService } from '../services/auth/socialLogin/socialLogin.service';
import { telemetryService } from '../services/TelemetryService';
import { deviceService } from '../services/device/deviceService';
import { OrganizationService } from '../services/OrganizationService';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  /** Demo toggle — sets authenticated without API call */
  login: () => void;
  /** Real login — calls Keycloak via backend */
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  /** Google login — native plugin + backend token exchange */
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  needsTnC: boolean;
  tncData: TnCData | null;
  completeTnC: () => void;
  onboardingDismissed: boolean;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_HEADER_KEY = 'X-Authenticated-User-Token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  // Initialize state directly from UserService (already initialized by AppInitializer)
  const [isAuthenticated, setIsAuthenticated] = useState(() => userService.isLoggedIn());
  const [userId, setUserId] = useState(() => userService.getUserId());
  const [tncDismissed, setTncDismissed] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const isAppInitialized = useAppInitialized();

  // AppInitializer loads the session from secure storage asynchronously.
  // The useState initialisers above run before that completes, so userId may
  // be null even for a logged-in user.  Sync once initialisation is done.
  useEffect(() => {
    if (!isAppInitialized) return;
    startTransition(() => {
      setUserId(userService.getUserId());
      setIsAuthenticated(userService.isLoggedIn());
    });
  }, [isAppInitialized]);

  // Fetch user profile reactively when userId is set
  const { data: profile } = useUser(userId);

  // Derive TnC state from profile — no separate state needed
  const tncData = useMemo(() => {
    if (tncDismissed || !profile) return null;
    return getTnCData(profile);
  }, [profile, tncDismissed]);

  const needsTnC = useMemo(() => {
    if (tncDismissed || !profile) return false;
    return needsTnCAcceptance(profile);
  }, [profile, tncDismissed]);

  // Shared helper: update telemetry context and fire SESSION START after every login.
  // Channel is resolved best-effort from user profile (non-blocking).
  const applyLoginTelemetry = useCallback((currentUserId: string | null) => {
    telemetryService.updateContext({ uid: currentUserId || 'anonymous', sid: uuidv4() });
    void telemetryService.start({ type: 'session', mode: '', duration: 0, pageid: '' }, '', '', {});
    if (currentUserId) {
      void (async () => {
        try {
          const res = await userService.userRead(currentUserId);
          const userData = (res.data as any)?.response;
          // Use hashTagId as channel — never fall back to the human-readable slug
          let channel = (userData?.rootOrg as any)?.hashTagId || '';
          const channelSlug = userData?.channel || '';
          // Resolve hashTagId via org search when it is absent from the profile
          if (!channel && channelSlug) {
            const orgService = new OrganizationService();
            const orgResponse = await orgService.search({
              request: { filters: { isTenant: true, slug: channelSlug } },
            });
            channel = orgResponse?.data?.response?.content?.[0]?.hashTagId || '';
          }
          if (channel) {
            telemetryService.updateContext({ channel, tags: [channel], rollup: { l1: channel } });
          }
        } catch { /* keep existing channel if fetch fails */ }
      })();
    }
  }, []);

  // Demo toggle (keeps backward compat with existing code)
  const login = useCallback(() => {
    setIsAuthenticated(true);
    const uid = userService.getUserId();
    if (uid) telemetryService.updateContext({ uid: uid || 'anonymous', sid: uuidv4() });
  }, []);

  // Real login via backend
  const handleLoginWithCredentials = useCallback(async (email: string, password: string) => {
    const tokens = await loginWithCredentials(email, password);
    await userService.saveAccount(tokens, 'keycloak');

    try {
      getClient().updateHeaders([
        { key: AUTH_HEADER_KEY, value: userService.getAccessToken()!, action: 'add' },
      ]);
    } catch {
      // HTTP client may not be initialized in test environment
    }

    const currentUserId = userService.getUserId();
    setTncDismissed(false);
    setUserId(currentUserId);
    setIsAuthenticated(true);
    applyLoginTelemetry(currentUserId);
  }, [applyLoginTelemetry]);

  // Google login via native plugin + backend
  const handleLoginWithGoogle = useCallback(async () => {
    const googleResult = await socialLoginService.loginWithGoogle();

    if (!googleResult.idToken || !googleResult.email) {
      throw new Error('Google sign-in failed');
    }

    try {
      const tokens = await loginWithGoogleToken(googleResult.idToken, googleResult.email, googleResult.displayName);
      await userService.saveAccount(tokens, 'google');

      try {
        getClient().updateHeaders([
          { key: AUTH_HEADER_KEY, value: userService.getAccessToken()!, action: 'add' },
        ]);
      } catch {
        // HTTP client may not be initialized in test environment
      }

      const currentUserId = userService.getUserId();
      setTncDismissed(false);
      setUserId(currentUserId);
      setIsAuthenticated(true);
      applyLoginTelemetry(currentUserId);
    } catch (err) {
      // Backend call failed — clean up the Google session to prevent stale state
      try {
        await socialLoginService.logoutGoogle();
      } catch {
        // Ignore Google cleanup errors
      }
      throw err;
    }
  }, [applyLoginTelemetry]);

  const completeTnC = useCallback(() => {
    setTncDismissed(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
  }, []);

  const logout = useCallback(async () => {
    const isOnline = networkService.isConnected();

    // Disconnect Google session if logged in via Google — skip if offline (network call would fail)
    if (userService.getLoginProvider() === 'google' && isOnline) {
      try {
        await socialLoginService.logoutGoogle();
      } catch {
        // Fallback: re-establish session then disconnect (matches legacy pattern)
        try {
          await socialLoginService.trySilentGoogleLogin();
          await socialLoginService.logoutGoogle();
        } catch {
          // Best-effort cleanup — ignore errors
        }
      }
    }

    await userService.clearAccount();

    try {
      getClient().updateHeaders([
        { key: AUTH_HEADER_KEY, value: '', action: 'remove' },
      ]);
    } catch {
      // HTTP client may not be initialized in test environment
    }

    setUserId(null);
    setIsAuthenticated(false);
    setTncDismissed(false);
    setOnboardingDismissed(false);
    const did = await deviceService.getHashedDeviceId().catch(() => '');
    telemetryService.updateContext({ uid: did || 'anonymous', sid: uuidv4() });
  }, []);

  // Register logout with the HTTP client so the interceptor can trigger
  // auto-logout when token refresh fails permanently.
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        login,
        loginWithCredentials: handleLoginWithCredentials,
        loginWithGoogle: handleLoginWithGoogle,
        logout,
        needsTnC,
        tncData,
        completeTnC,
        onboardingDismissed,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
