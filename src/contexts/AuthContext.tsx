import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, startTransition, ReactNode } from 'react';
import { loginWithCredentials, loginWithGoogleToken } from '../auth/keycloakApi';
import { userService } from '../services/UserService';
import { getClient } from '../lib/http-client';
import { useUser } from '../hooks/useUser';
import { useAppInitialized } from '../hooks/useAppInitialized';
import { getTnCData, needsTnCAcceptance, TnCData } from '../services/TnCService';
import { socialLoginService } from '../services/auth/socialLogin/socialLogin.service';
import { resetOnboardingComplete } from '../App';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_HEADER_KEY = 'X-Authenticated-User-Token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  // Initialize state directly from UserService (already initialized by AppInitializer)
  const [isAuthenticated, setIsAuthenticated] = useState(() => userService.isLoggedIn());
  const [userId, setUserId] = useState(() => userService.getUserId());
  const [tncDismissed, setTncDismissed] = useState(false);

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

  // Demo toggle (keeps backward compat with existing code)
  const login = useCallback(() => setIsAuthenticated(true), []);

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

  }, []);

  // Google login via native plugin + backend
  const handleLoginWithGoogle = useCallback(async () => {
    const googleResult = await socialLoginService.loginWithGoogle();

    if (!googleResult.idToken || !googleResult.email) {
      throw new Error('Google sign-in failed');
    }

    try {
      const tokens = await loginWithGoogleToken(googleResult.idToken, googleResult.email);
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
    } catch (err) {
      // Backend call failed — clean up the Google session to prevent stale state
      try {
        await socialLoginService.logoutGoogle();
      } catch {
        // Ignore Google cleanup errors
      }
      throw err;
    }
  }, []);

  const completeTnC = useCallback(() => {
    setTncDismissed(true);
  }, []);

  const logout = useCallback(async () => {
    // Disconnect Google session if logged in via Google
    if (userService.getLoginProvider() === 'google') {
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
    resetOnboardingComplete();
  }, []);

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
