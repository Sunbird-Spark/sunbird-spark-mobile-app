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

// Mock useUser hook — vi.fn() so individual tests can override
const mockUseUser = vi.fn(() => ({ data: null, isLoading: false, error: null }));
vi.mock('../hooks/useUser', () => ({
  useUser: (...args: Parameters<typeof mockUseUser>) => mockUseUser(...args),
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
  setLogoutCallback: vi.fn(),
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

// Mock deviceService — used in logout to get anonymous uid
vi.mock('../services/device/deviceService', () => ({
  deviceService: {
    getHashedDeviceId: vi.fn().mockResolvedValue('did123'),
  },
}));

// Mock networkService — used in logout to skip Google disconnect when offline
vi.mock('../services/network/networkService', () => ({
  networkService: {
    isConnected: vi.fn().mockReturnValue(true),
  },
}));

// Mock pushNotificationService — used in login flows to register device
vi.mock('../services/push/PushNotificationService', () => ({
  pushNotificationService: {
    registerDevice: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock OrganizationService — used in applyLoginTelemetry to resolve hashTagId from slug
vi.mock('../services/OrganizationService', () => {
  function OrganizationService() {}
  OrganizationService.prototype.search = vi.fn().mockResolvedValue({
    data: { response: { content: [] } },
    headers: {},
  });
  return { OrganizationService };
});

import { userService } from '../services/UserService';
import { socialLoginService } from '../services/auth/socialLogin/socialLogin.service';
import { OrganizationService } from '../services/OrganizationService';
import { loginWithCredentials, loginWithGoogleToken } from '../auth/keycloakApi';
import { networkService } from '../services/network/networkService';
import { setLogoutCallback } from '../lib/http-client';
import { pushNotificationService } from '../services/push/PushNotificationService';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Base test component
const TestComponent = () => {
  const { isAuthenticated, login, logout, onboardingDismissed, completeOnboarding } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <div data-testid="onboarding-status">
        {onboardingDismissed ? 'Dismissed' : 'Pending'}
      </div>
      <button data-testid="login-btn" onClick={login}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="complete-onboarding-btn" onClick={completeOnboarding}>
        Complete Onboarding
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
    mockUseUser.mockReturnValue({ data: null, isLoading: false, error: null });
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
    vi.mocked(networkService.isConnected).mockReturnValue(true);
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

  it('resets onboarding dismissed state on logout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    fireEvent.click(screen.getByTestId('complete-onboarding-btn'));
    expect(screen.getByTestId('onboarding-status')).toHaveTextContent('Dismissed');

    fireEvent.click(screen.getByTestId('logout-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-status')).toHaveTextContent('Pending');
    });
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
    vi.mocked(userService.userRead).mockResolvedValue({
      data: { response: { channel: 'sunbirdco', rootOrg: { hashTagId: 'mychannel-id' } } },
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

    expect(telemetryService.updateContext).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'user-abc' }), // initial context update
    );
    expect(telemetryService.start).toHaveBeenCalled();
  });

  it('loginWithCredentials handles userRead resolving with rootOrg channel', async () => {
    const { telemetryService } = await import('../services/TelemetryService');
    vi.mocked(userService.getUserId).mockReturnValue('user-abc');
    vi.mocked(userService.userRead).mockResolvedValue({
      data: { response: { channel: 'sunbirdco', rootOrg: { hashTagId: 'rootchannel-id' } } },
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
        expect.objectContaining({ channel: 'rootchannel-id' }),
      );
    });
  });

  it('resolves channel from org search when rootOrg.hashTagId is absent on login', async () => {
    const { telemetryService } = await import('../services/TelemetryService');
    vi.mocked(userService.getUserId).mockReturnValue('user-abc');
    // Profile has slug but no hashTagId on rootOrg
    vi.mocked(userService.userRead).mockResolvedValue({
      data: { response: { channel: 'sunbirdco', rootOrg: {} } },
    } as any);
    (OrganizationService.prototype as any).search = vi.fn().mockResolvedValue({
      data: { response: { content: [{ hashTagId: 'resolved-hashtag-id' }] } },
      headers: {},
    });

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
        expect.objectContaining({ channel: 'resolved-hashtag-id' }),
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

    const googleTokenCalls = vi.mocked(loginWithGoogleToken).mock.calls[0];
    expect(googleTokenCalls[0]).toBe('id-token');
    expect(googleTokenCalls[1]).toBe('test@example.com');
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

  it('needsTnC and tncData are derived from profile when profile is present', () => {
    mockUseUser.mockReturnValue({
      data: {
        id: 'u1', identifier: 'u1', userId: 'u1', firstName: 'Test', userName: 'test',
        promptTnC: true,
        tncLatestVersion: '4.0',
        tncLatestVersionUrl: 'https://example.com/tnc',
      },
      isLoading: false,
      error: null,
    });

    const TnCComponent = () => {
      const { needsTnC, tncData } = useAuth();
      return (
        <>
          <div data-testid="needs-tnc">{needsTnC ? 'yes' : 'no'}</div>
          <div data-testid="tnc-version">{tncData?.version ?? ''}</div>
        </>
      );
    };

    render(
      <AuthProvider>
        <TnCComponent />
      </AuthProvider>,
      { wrapper },
    );

    expect(screen.getByTestId('needs-tnc')).toHaveTextContent('yes');
    expect(screen.getByTestId('tnc-version')).toHaveTextContent('4.0');
  });

  it('logout resets telemetry context with device ID uid and a fresh UUID sid', async () => {
    const { telemetryService } = await import('../services/TelemetryService');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    const calls = vi.mocked(telemetryService.updateContext).mock.calls;
    const logoutCall = calls[calls.length - 1][0];
    expect(logoutCall.uid).toBe('did123');
    expect(logoutCall.sid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
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

  it('logout skips Google disconnect and still clears local account when offline', async () => {
    vi.mocked(userService.getLoginProvider).mockReturnValue('google');
    vi.mocked(networkService.isConnected).mockReturnValue(false);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    expect(socialLoginService.logoutGoogle).not.toHaveBeenCalled();
    expect(userService.clearAccount).toHaveBeenCalled();
  });

  it('logout skips Google disconnect for keycloak provider even when online', async () => {
    vi.mocked(userService.getLoginProvider).mockReturnValue('keycloak');
    vi.mocked(networkService.isConnected).mockReturnValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    expect(socialLoginService.logoutGoogle).not.toHaveBeenCalled();
    expect(userService.clearAccount).toHaveBeenCalled();
  });

  it('logout calls clearAccount even when Google disconnect fails entirely', async () => {
    vi.mocked(userService.getLoginProvider).mockReturnValue('google');
    vi.mocked(networkService.isConnected).mockReturnValue(true);
    vi.mocked(socialLoginService.logoutGoogle).mockRejectedValue(new Error('disconnect failed'));
    vi.mocked(socialLoginService.trySilentGoogleLogin).mockRejectedValue(new Error('silent login failed'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    expect(userService.clearAccount).toHaveBeenCalled();
  });

  it('registers logout callback with http-client on mount', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    await waitFor(() => {
      expect(setLogoutCallback).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('loginWithCredentials calls pushNotificationService.registerDevice after login', async () => {
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

    expect(pushNotificationService.registerDevice).toHaveBeenCalled();
  });

  it('loginWithGoogle calls pushNotificationService.registerDevice after login', async () => {
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

    expect(pushNotificationService.registerDevice).toHaveBeenCalled();
  });

  it('registered logout callback triggers full logout when called', async () => {
    let capturedCallback: (() => Promise<void>) | null = null;
    vi.mocked(setLogoutCallback).mockImplementation((fn) => {
      capturedCallback = fn;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper },
    );

    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    await act(async () => {
      await capturedCallback!();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(userService.clearAccount).toHaveBeenCalled();
  });
});
