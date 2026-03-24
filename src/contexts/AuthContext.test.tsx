import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
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
  loginWithCredentials: vi.fn().mockResolvedValue({ access_token: 'token' }),
  loginWithGoogleToken: vi.fn().mockResolvedValue({ access_token: 'token' }),
}));

// Mock useUser hook to avoid real API calls
vi.mock('../hooks/useUser', () => ({
  useUser: () => ({ data: null, isLoading: false, error: null }),
}));

// Mock UserService — using vi.fn() so individual tests can override
vi.mock('../services/UserService', () => ({
  userService: {
    isLoggedIn: vi.fn().mockReturnValue(false),
    getUserId: vi.fn().mockReturnValue(null),
    getAccessToken: vi.fn().mockReturnValue(null),
    getLoginProvider: vi.fn().mockReturnValue(null),
    clearAccount: vi.fn().mockResolvedValue(undefined),
    saveAccount: vi.fn().mockResolvedValue(undefined),
    userRead: vi.fn().mockRejectedValue(new Error('no user')),
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock socialLoginService
vi.mock('../services/auth/socialLogin/socialLogin.service', () => ({
  socialLoginService: {
    loginWithGoogle: vi.fn().mockResolvedValue({ idToken: 'id-token', email: 'test@example.com' }),
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

// Mock useAppInitialized to return true (sync)
vi.mock('../hooks/useAppInitialized', () => ({
  useAppInitialized: () => true,
}));

// Mock TelemetryService so telemetry calls are no-ops
vi.mock('../services/TelemetryService', () => ({
  telemetryService: {
    updateContext: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
  },
}));

import { userService } from '../services/UserService';
import { socialLoginService } from '../services/auth/socialLogin/socialLogin.service';
import { loginWithCredentials, loginWithGoogleToken } from '../auth/keycloakApi';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Base test component
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

// Extended component exposing more auth actions
const ExtendedTestComponent = () => {
  const { isAuthenticated, completeTnC, loginWithCredentials: credLogin, loginWithGoogle } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <button data-testid="complete-tnc-btn" onClick={completeTnC}>
        CompleteTnC
      </button>
      <button data-testid="cred-login-btn" onClick={() => credLogin('user@test.com', 'pass')}>
        CredLogin
      </button>
      <button data-testid="google-login-btn" onClick={loginWithGoogle}>
        GoogleLogin
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish default return values after clearAllMocks
    vi.mocked(userService.isLoggedIn).mockReturnValue(false);
    vi.mocked(userService.getUserId).mockReturnValue(null);
    vi.mocked(userService.getAccessToken).mockReturnValue(null);
    vi.mocked(userService.getLoginProvider).mockReturnValue(null);
    vi.mocked(userService.clearAccount).mockResolvedValue(undefined);
    vi.mocked(userService.saveAccount).mockResolvedValue(undefined);
    vi.mocked(userService.userRead).mockRejectedValue(new Error('no user'));
    vi.mocked(socialLoginService.loginWithGoogle).mockResolvedValue({ idToken: 'id-token', email: 'test@example.com' });
    vi.mocked(socialLoginService.logoutGoogle).mockResolvedValue(undefined);
    vi.mocked(socialLoginService.trySilentGoogleLogin).mockResolvedValue(null as any);
    vi.mocked(loginWithCredentials).mockResolvedValue({ access_token: 'token' } as any);
    vi.mocked(loginWithGoogleToken).mockResolvedValue({ access_token: 'token' } as any);
  });
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

  it('loginWithCredentials authenticates the user', async () => {
    vi.mocked(userService.getUserId).mockReturnValue('user-123');

    render(
      <AuthProvider>
        <ExtendedTestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('cred-login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    expect(loginWithCredentials).toHaveBeenCalledWith('user@test.com', 'pass');
    expect(userService.saveAccount).toHaveBeenCalled();
  });

  it('loginWithCredentials calls applyLoginTelemetry with userId', async () => {
    const { telemetryService } = await import('../services/TelemetryService');
    vi.mocked(userService.getUserId).mockReturnValue('user-abc');
    vi.mocked(userService.userRead).mockResolvedValue({ data: { response: { channel: 'mychannel' } } } as any);

    render(
      <AuthProvider>
        <ExtendedTestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('cred-login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    expect(telemetryService.updateContext).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'user-abc' }),
    );
    expect(telemetryService.start).toHaveBeenCalled();
  });

  it('loginWithCredentials handles userRead resolving with rootOrg channel', async () => {
    const { telemetryService } = await import('../services/TelemetryService');
    vi.mocked(userService.getUserId).mockReturnValue('user-abc');
    vi.mocked(userService.userRead).mockResolvedValue({
      data: { response: { rootOrg: { hashTagId: 'rootchannel' } } },
    } as any);

    render(
      <AuthProvider>
        <ExtendedTestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('cred-login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    await waitFor(() => {
      expect(telemetryService.updateContext).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'rootchannel' }),
      );
    });
  });

  it('loginWithGoogle authenticates the user via Google', async () => {
    vi.mocked(userService.getUserId).mockReturnValue('google-user');

    render(
      <AuthProvider>
        <ExtendedTestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('google-login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    expect(loginWithGoogleToken).toHaveBeenCalledWith('id-token', 'test@example.com');
    expect(userService.saveAccount).toHaveBeenCalledWith(expect.anything(), 'google');
  });

  it('loginWithGoogle cleans up Google session on backend failure', async () => {
    vi.mocked(loginWithGoogleToken).mockRejectedValue(new Error('backend error'));

    // Local component that catches the async error to prevent unhandled rejection
    const GoogleErrComponent = () => {
      const { loginWithGoogle } = useAuth();
      return (
        <button
          data-testid="google-err-btn"
          onClick={() => { loginWithGoogle().catch(() => { /* swallow */ }); }}
        />
      );
    };

    render(
      <AuthProvider>
        <GoogleErrComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('google-err-btn'));

    await waitFor(() => {
      expect(socialLoginService.logoutGoogle).toHaveBeenCalled();
    });
  });

  it('loginWithGoogle does not authenticate when idToken is missing', async () => {
    vi.mocked(socialLoginService.loginWithGoogle).mockResolvedValue({ idToken: null as any, email: 'test@example.com' });

    const GoogleErrComponent = () => {
      const { isAuthenticated, loginWithGoogle } = useAuth();
      return (
        <>
          <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
          <button
            data-testid="google-err-btn"
            onClick={() => { loginWithGoogle().catch(() => { /* swallow */ }); }}
          />
        </>
      );
    };

    render(
      <AuthProvider>
        <GoogleErrComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('google-err-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('completeTnC dismisses the TnC prompt', async () => {
    render(
      <AuthProvider>
        <ExtendedTestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('complete-tnc-btn'));
    // After dismissal, component still renders correctly (tncDismissed=true → needsTnC=false)
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
  });

  it('logout calls logoutGoogle when login provider is google', async () => {
    vi.mocked(userService.getLoginProvider).mockReturnValue('google');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(socialLoginService.logoutGoogle).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('logout falls back to trySilentGoogleLogin when logoutGoogle fails', async () => {
    vi.mocked(userService.getLoginProvider).mockReturnValue('google');
    vi.mocked(socialLoginService.logoutGoogle)
      .mockRejectedValueOnce(new Error('first logout failed'))
      .mockResolvedValue(undefined);
    vi.mocked(socialLoginService.trySilentGoogleLogin).mockResolvedValue(null as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(socialLoginService.trySilentGoogleLogin).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });
});
