import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { loginWithCredentials } from '../auth/keycloakApi';
import { userService } from '../services/UserService';
import { getClient } from '../lib/http-client';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  /** Demo toggle — sets authenticated without API call */
  login: () => void;
  /** Real login — calls Keycloak via backend */
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_HEADER_KEY = 'X-Authenticated-User-Token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state directly from UserService (already initialized by AppInitializer)
  const [isAuthenticated, setIsAuthenticated] = useState(() => userService.isLoggedIn());
  const [userId, setUserId] = useState(() => userService.getUserId());

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

    setUserId(userService.getUserId());
    setIsAuthenticated(true);
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
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        login,
        loginWithCredentials: handleLoginWithCredentials,
        logout,
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
