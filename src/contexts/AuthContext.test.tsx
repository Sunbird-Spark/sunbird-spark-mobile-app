import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
  });

  it('allows user to login', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
  });

  it('allows user to logout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
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
      </AuthProvider>
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
