import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
    console.log('[Auth] Login attempt for:', email);
    const tokens = await loginWithCredentials(email, password);
    await userService.saveAccount(tokens, 'keycloak');
    console.log('[Auth] Login success — userId:', userService.getUserId());

    // Set user token header on HTTP client for subsequent API calls
    try {
      const httpClient = getClient();
      httpClient.updateHeaders([
        { key: 'X-Authenticated-User-Token', value: userService.getAccessToken()!, action: 'add' },
      ]);
    } catch {
      // HTTP client may not be initialized in test environment
    }

    setUserId(userService.getUserId());
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    console.log('[Auth] Logout called');
    await userService.clearAccount();
    console.log('[Auth] Session cleared');

    // Remove user token header
    try {
      const httpClient = getClient();
      httpClient.updateHeaders([
        { key: 'X-Authenticated-User-Token', value: '', action: 'remove' },
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
