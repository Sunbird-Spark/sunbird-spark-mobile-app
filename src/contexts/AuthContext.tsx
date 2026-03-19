import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loginWithCredentials } from '../auth/keycloakApi';
import { userService } from '../services/UserService';
import { getClient } from '../lib/http-client';

const AUTH_HEADER_KEY = 'X-Authenticated-User-Token';

const setUserTokenHeader = (token: string) => {
  try {
    getClient().updateHeaders([{ key: AUTH_HEADER_KEY, value: token, action: 'add' }]);
  } catch {
    // HTTP client may not be initialized in test environment
  }
};

const clearUserTokenHeader = () => {
  try {
    getClient().updateHeaders([{ key: AUTH_HEADER_KEY, value: '', action: 'remove' }]);
  } catch {
    // HTTP client may not be initialized in test environment
  }
};

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  /** Demo toggle — sets authenticated without API call */
  login: () => void;
  /** Real login — calls Keycloak via backend */
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sessionLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Sync React state with UserService (already initialized by AppInitializer)
  useEffect(() => {
    if (userService.isLoggedIn()) {
      setUserId(userService.getUserId());
      setIsAuthenticated(true);
    }
    setSessionLoading(false);
  }, []);

  // Demo toggle (keeps backward compat with existing code)
  const login = useCallback(() => setIsAuthenticated(true), []);

  // Real login via backend
  const handleLoginWithCredentials = useCallback(async (email: string, password: string) => {
    const tokens = await loginWithCredentials(email, password);
    await userService.saveAccount(tokens, 'keycloak');

    setUserTokenHeader(userService.getAccessToken()!);
    setUserId(userService.getUserId());
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await userService.clearAccount();
    clearUserTokenHeader();
    setUserId(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        login,
        loginWithCredentials: handleLoginWithCredentials,
        logout,
        sessionLoading,
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
