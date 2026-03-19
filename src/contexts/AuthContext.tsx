import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loginWithCredentials } from '../auth/keycloakApi';
import { userService } from '../services/UserService';
import { getClient } from '../lib/http-client';
import { useUser } from '../hooks/useUser';
import { getTnCData, needsTnCAcceptance, TnCData } from '../services/TnCService';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  /** Demo toggle — sets authenticated without API call */
  login: () => void;
  /** Real login — calls Keycloak via backend */
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  needsTnC: boolean;
  tncData: TnCData | null;
  completeTnC: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_HEADER_KEY = 'X-Authenticated-User-Token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Initialize state directly from UserService (already initialized by AppInitializer)
  const [isAuthenticated, setIsAuthenticated] = useState(() => userService.isLoggedIn());
  const [userId, setUserId] = useState(() => userService.getUserId());
  const [tncDismissed, setTncDismissed] = useState(false);

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
  const handleLoginWithCredentials = useCallback(async (email: string, password: string): Promise<void> => {
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

    // Invalidate cached profile so useUser refetches fresh from server
    await queryClient.invalidateQueries({ queryKey: ['user-profile', currentUserId] });
  }, [queryClient]);

  const completeTnC = useCallback(() => {
    setTncDismissed(true);
  }, []);

  const logout = useCallback(async () => {
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
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        login,
        loginWithCredentials: handleLoginWithCredentials,
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
