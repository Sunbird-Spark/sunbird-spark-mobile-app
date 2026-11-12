import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { mockRouterPush, mockCompleteOnboarding, mockUpdateUser } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockCompleteOnboarding: vi.fn(),
  mockUpdateUser: vi.fn(),
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonSpinner: ({ name }: any) => <span data-testid="ion-spinner" data-name={name} />,
  IonToast: ({ isOpen, message, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-toast">
        {message}
        <button data-testid="toast-dismiss" onClick={onDidDismiss}>x</button>
      </div>
    ) : null,
  useIonRouter: () => ({ push: mockRouterPush, goBack: vi.fn() }),
}));

vi.mock('./OnboardingPage.css', () => ({}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { dir: () => 'ltr', language: 'en' } }),
}));

let mockUserId: string | null | undefined = 'test-user-123';
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    userId: mockUserId,
    isAuthenticated: true,
    completeOnboarding: mockCompleteOnboarding,
  }),
}));

let capturedBackHandler: (() => boolean) | undefined;
vi.mock('../hooks/useBackButton', () => ({
  useBackButtonOverride: (_route: string, handler: () => boolean) => { capturedBackHandler = handler; },
}));

vi.mock('../services/UserService', () => ({
  userService: { updateUser: (...args: any[]) => mockUpdateUser(...args) },
}));
vi.mock('../constants/assets', () => ({ ASSETS: { SUNBIRD_LOGO: 'sunbird-logo.svg' } }));

let mockFormResponse: any;
vi.mock('../hooks/useFormRead', () => ({
  useFormRead: () => ({ data: mockFormResponse, isLoading: false, isError: false }),
}));

import OnboardingPage from './OnboardingPage';

const wrapForm = (data: unknown) => ({ data: { form: { data } } });

const baseForm = {
  isEnabled: true,
  initialScreenId: 'language',
  screens: {
    language: {
      title: 'Language?',
      selectionType: 'single' as const,
      fields: [
        { id: 'english', index: 0, label: 'English', nextScreenId: 'role' },
        { id: 'hindi', index: 1, label: 'Hindi', nextScreenId: 'role' },
      ],
    },
    role: {
      title: 'Role?',
      selectionType: 'single' as const,
      fields: [{ id: 'teacher', index: 0, label: 'Teacher' }],
    },
  },
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <OnboardingPage />
    </QueryClientProvider>,
  );

describe('OnboardingPage — workflow edges', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = 'test-user-123';
    mockFormResponse = wrapForm(baseForm);
    mockUpdateUser.mockResolvedValue({});
    capturedBackHandler = undefined;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('workflow disabled by the backend', () => {
    it('marks onboarding done and forwards the user without showing any question', async () => {
      mockFormResponse = wrapForm({ ...baseForm, isEnabled: false });
      renderPage();
      await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1));
      expect(mockRouterPush).toHaveBeenCalledWith('/home', 'root', 'replace');
      expect(screen.queryByText('Language?')).toBeNull();
      expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
    });
  });

  describe('malformed workflow data', () => {
    it('offers an escape hatch when the initial screen is missing', async () => {
      mockFormResponse = wrapForm({ isEnabled: true, initialScreenId: 'ghost', screens: {} });
      renderPage();
      expect(screen.getByText('onboarding.somethingWentWrong')).toBeInTheDocument();

      fireEvent.click(screen.getByText('onboarding.goToHome'));
      await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({
        userId: 'test-user-123',
        framework: { onboardingDetails: { isSkipped: true, data: {} } },
      }));
      expect(mockRouterPush).toHaveBeenCalledWith('/home', 'root', 'replace');
    });

    it('refuses to advance to a screen that does not exist and reports it', () => {
      mockFormResponse = wrapForm({
        isEnabled: true,
        initialScreenId: 'language',
        screens: {
          language: {
            title: 'Language?',
            selectionType: 'single' as const,
            fields: [{ id: 'english', index: 0, label: 'English', nextScreenId: 'ghost' }],
          },
        },
      });
      renderPage();
      fireEvent.click(screen.getByText('English'));
      fireEvent.click(screen.getByText('onboarding.saveAndProceed'));

      expect(screen.getByText('Language?')).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Invalid nextScreenId: "ghost" does not exist in onboarding screens',
      );
    });

    it('stops counting steps at the first missing screen', () => {
      mockFormResponse = wrapForm({
        isEnabled: true,
        initialScreenId: 'language',
        screens: {
          language: {
            title: 'Language?',
            selectionType: 'single' as const,
            nextScreenId: 'ghost',
            fields: [{ id: 'english', index: 0, label: 'English' }],
          },
        },
      });
      renderPage();
      // current screen + the dangling one it points at, then the trace stops.
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });
  });

  describe('answers changed after looping back to an earlier screen', () => {
    // A workflow can legitimately point back at a screen the user already
    // answered, which puts that screen in the history twice.
    const cyclicForm = {
      isEnabled: true,
      initialScreenId: 'language',
      screens: {
        language: {
          title: 'Language?',
          selectionType: 'single' as const,
          fields: [{ id: 'english', index: 0, label: 'English', nextScreenId: 'role' }],
        },
        role: {
          title: 'Role?',
          selectionType: 'single' as const,
          fields: [{ id: 'teacher', index: 0, label: 'Teacher', nextScreenId: 'language' }],
        },
      },
    };

    const loopBack = () => {
      renderPage();
      fireEvent.click(screen.getByText('English'));
      fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
      fireEvent.click(screen.getByText('Teacher'));
      fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
    };

    beforeEach(() => {
      mockFormResponse = wrapForm(cyclicForm);
    });

    it('rewinds the trail when the earlier answer is changed', () => {
      loopBack();
      expect(screen.getByText('Language?')).toBeInTheDocument();
      expect(screen.getByText('3/4')).toBeInTheDocument();

      fireEvent.click(screen.getByText('English'));
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    it('discards the answers recorded after that screen', async () => {
      loopBack();
      fireEvent.click(screen.getByText('English'));

      // Known quirk: because the looped-back screen also appears in the
      // discarded tail of the history, its own fresh answer is dropped with the
      // downstream ones, so the user has to answer it again.
      expect(screen.getByText('English').closest('button')?.className)
        .not.toContain('onboarding-chip--selected');
      expect(screen.getByText('onboarding.saveAndProceed')).toBeDisabled();

      // Nothing from the abandoned branch survives into the payload.
      fireEvent.click(screen.getByText('onboarding.skipOnboarding'));
      await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({
        userId: 'test-user-123',
        framework: { onboardingDetails: { isSkipped: true, data: {} } },
      }));
    });
  });

  describe('save failures', () => {
    it('warns but still completes onboarding when the submit call fails', async () => {
      mockUpdateUser.mockRejectedValue(new Error('500'));
      renderPage();
      fireEvent.click(screen.getByText('English'));
      fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
      fireEvent.click(screen.getByText('Teacher'));
      fireEvent.click(screen.getByText('onboarding.submit'));

      await waitFor(() =>
        expect(screen.getByTestId('ion-toast')).toHaveTextContent('onboarding.failedToSavePreferences'),
      );
      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
      expect(mockRouterPush).toHaveBeenCalledWith('/home', 'root', 'replace');

      fireEvent.click(screen.getByTestId('toast-dismiss'));
      expect(screen.queryByTestId('ion-toast')).toBeNull();
    });

    it('warns but still completes onboarding when the skip call fails', async () => {
      mockUpdateUser.mockRejectedValue(new Error('500'));
      renderPage();
      fireEvent.click(screen.getByText('onboarding.skipOnboarding'));

      await waitFor(() =>
        expect(screen.getByTestId('ion-toast')).toHaveTextContent('onboarding.failedToSavePreferences'),
      );
      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
      expect(mockRouterPush).toHaveBeenCalledWith('/home', 'root', 'replace');
    });
  });

  describe('skip without a signed-in user', () => {
    it('sends an anonymous user to the root route without calling the API', () => {
      mockUserId = null;
      renderPage();
      fireEvent.click(screen.getByText('onboarding.skipOnboarding'));
      expect(mockRouterPush).toHaveBeenCalledWith('/', 'root', 'replace');
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockCompleteOnboarding).not.toHaveBeenCalled();
    });

    it('does nothing while the user id is still resolving', () => {
      mockUserId = undefined;
      renderPage();
      fireEvent.click(screen.getByText('onboarding.skipOnboarding'));
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('android hardware back button', () => {
    it('is treated as a skip and consumes the event', async () => {
      renderPage();
      expect(capturedBackHandler).toBeTypeOf('function');
      const handled = capturedBackHandler!();
      expect(handled).toBe(true);
      await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({
        userId: 'test-user-123',
        framework: { onboardingDetails: { isSkipped: true, data: {} } },
      }));
      expect(mockRouterPush).toHaveBeenCalledWith('/home', 'root', 'replace');
    });
  });

  describe('submission guards', () => {
    it('keeps the submit button disabled until a free-text answer is filled in', () => {
      mockFormResponse = wrapForm({
        isEnabled: true,
        initialScreenId: 'language',
        screens: {
          language: {
            title: 'Language?',
            selectionType: 'single' as const,
            fields: [{ id: 'other', index: 0, label: 'Other', requiresTextInput: true }],
          },
        },
      });
      renderPage();
      fireEvent.click(screen.getByText('Other'));
      expect(screen.getByText('onboarding.submit')).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('onboarding.enterPreference'), {
        target: { value: '   ' },
      });
      expect(screen.getByText('onboarding.submit')).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('onboarding.enterPreference'), {
        target: { value: 'Kannada' },
      });
      expect(screen.getByText('onboarding.submit')).toBeEnabled();
    });

    it('shows a spinner and blocks a second submit while saving', async () => {
      let resolveUpdate: (v: unknown) => void = () => {};
      mockUpdateUser.mockReturnValue(new Promise(res => { resolveUpdate = res; }));
      renderPage();
      fireEvent.click(screen.getByText('English'));
      fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
      fireEvent.click(screen.getByText('Teacher'));
      fireEvent.click(screen.getByRole('button', { name: 'onboarding.submit' }));

      await waitFor(() => expect(screen.getAllByTestId('ion-spinner').length).toBeGreaterThan(0));
      expect(screen.getByText('onboarding.skipOnboarding')).toBeDisabled();

      resolveUpdate({});
      await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1));
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
    });
  });
});
