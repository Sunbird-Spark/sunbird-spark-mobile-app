import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { decodeJwt } from 'jose';
import { loginWithCredentials } from '../auth/keycloakApi';
import { saveSession, getSession, clearSession } from '../auth/tokenStorage';

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

  // Recover session on mount
  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (session) {
          setUserId(session.userId);
          setIsAuthenticated(true);
        }
      } catch {
        // No saved session — stay logged out
      } finally {
        setSessionLoading(false);
      }
    })();
  }, []);

  // Demo toggle (keeps backward compat with existing code)
  const login = useCallback(() => setIsAuthenticated(true), []);

  // Real login via backend
  const handleLoginWithCredentials = useCallback(async (email: string, password: string) => {
    const tokens = await loginWithCredentials(email, password);

    // Decode userId from access_token JWT sub claim
    const payload = decodeJwt(tokens.access_token);
    const sub = payload.sub as string;
    if (!sub) {
      throw new Error('LOGIN_FAILED');
    }

    const expiresAt = payload.exp
      ? payload.exp * 1000
      : Date.now() + 3600 * 1000;

    await saveSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? '',
      userId: sub,
      expires_at: expiresAt,
    });

    setUserId(sub);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
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
