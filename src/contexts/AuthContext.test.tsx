import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

// Mock secure storage so async logout resolves immediately
vi.mock('capacitor-secure-storage-plugin', () => ({
  SecureStoragePlugin: {
    get: vi.fn().mockRejectedValue(new Error('No value')),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock keycloakApi to avoid CapacitorHttp import issues
vi.mock('../auth/keycloakApi', () => ({
  loginWithCredentials: vi.fn(),
}));

// Mock useUser hook to avoid real API calls
vi.mock('../hooks/useUser', () => ({
  useUser: () => ({ data: null, isLoading: false, error: null }),
}));

// Mock UserService
vi.mock('../services/UserService', () => ({
  userService: {
    isLoggedIn: () => false,
    getUserId: () => null,
    getAccessToken: () => null,
    getLoginProvider: () => null,
    clearAccount: vi.fn().mockResolvedValue(undefined),
    saveAccount: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock socialLoginService
vi.mock('../services/auth/socialLogin/socialLogin.service', () => ({
  socialLoginService: {
    loginWithGoogle: vi.fn(),
    logoutGoogle: vi.fn().mockResolvedValue(undefined),
    trySilentGoogleLogin: vi.fn().mockResolvedValue(null),
  },
}));

// Mock http-client
vi.mock('../lib/http-client', () => ({
  getClient: () => ({
    updateHeaders: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Test component to use the AuthContext
const TestComponent = () => {
  const { isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <button data-testid="login-btn" onClick={login}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  it('provides initial authentication state as false', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
  });

  it('allows user to login', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
  });

  it('allows user to logout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    // First login
    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');

    // Then logout (async — clearSession is awaited)
    fireEvent.click(screen.getByTestId('logout-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within AuthProvider');

    consoleSpy.mockRestore();
  });

  it('maintains authentication state across multiple interactions', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    // Initial state
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');

    // Login -> Logout -> Login cycle
    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');

    fireEvent.click(screen.getByTestId('logout-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
  });
});
