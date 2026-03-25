import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import OnboardingPage from './OnboardingPage';

const { mockRouterPush, mockCompleteOnboarding, mockUpdateUser } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockCompleteOnboarding: vi.fn(),
  mockUpdateUser: vi.fn().mockResolvedValue({}),
}));

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonSpinner: ({ name }: any) => <span data-testid="ion-spinner" data-name={name} />,
  IonToast: ({ isOpen, message }: any) => isOpen ? <div data-testid="ion-toast">{message}</div> : null,
  useIonRouter: () => ({ push: mockRouterPush, goBack: vi.fn() }),
}));

// Mock CSS
vi.mock('./OnboardingPage.css', () => ({}));

// Mock i18next - returns the key path for easy assertions
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => 'ltr' },
  }),
}));

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    userId: 'test-user-123',
    isAuthenticated: true,
    completeOnboarding: mockCompleteOnboarding,
  }),
}));

// Mock back button override hook
vi.mock('../hooks/useBackButton', () => ({
  useBackButtonOverride: vi.fn(),
}));

// Mock UserService
vi.mock('../services/UserService', () => ({
  userService: {
    updateUser: (...args: any[]) => mockUpdateUser(...args),
  },
}));

// Mock image import
vi.mock('../assets/sunbird-logo-new.png', () => ({ default: 'sunbird-logo.png' }));

const mockFormData = {
  form: {
    data: {
      isEnabled: true,
      initialScreenId: 'language',
      screens: {
        language: {
          title: 'What is your language preference?',
          selectionType: 'single' as const,
          fields: [
            { id: 'english', index: 0, label: 'English', nextScreenId: 'role' },
            { id: 'hindi', index: 1, label: 'Hindi', nextScreenId: 'role' },
            { id: 'other_lang', index: 2, label: 'Other', requiresTextInput: true },
          ],
        },
        role: {
          title: 'What is your role?',
          selectionType: 'single' as const,
          fields: [
            { id: 'teacher', index: 0, label: 'Teacher' },
            { id: 'student', index: 1, label: 'Student' },
          ],
        },
      },
    },
  },
};

// Mock useFormRead
let mockFormLoading = false;
let mockFormError = false;
let mockFormResponse: any = { data: mockFormData };

vi.mock('../hooks/useFormRead', () => ({
  useFormRead: () => ({
    data: mockFormLoading ? undefined : mockFormResponse,
    isLoading: mockFormLoading,
    isError: mockFormError,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <OnboardingPage />
    </QueryClientProvider>
  );

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormLoading = false;
    mockFormError = false;
    mockFormResponse = { data: mockFormData };
  });

  it('shows loading spinner while form is loading', () => {
    mockFormLoading = true;
    renderPage();
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
  });

  it('shows error state with skip link on form error', () => {
    mockFormError = true;
    mockFormResponse = null;
    renderPage();
    expect(screen.getByText('onboarding.failedToLoad')).toBeInTheDocument();
    expect(screen.getByText('onboarding.skip')).toBeInTheDocument();
  });

  it('renders the first screen with brand logo and subtitle', () => {
    renderPage();
    expect(screen.getByAltText('Sunbird')).toBeInTheDocument();
    expect(screen.getByText('onboarding.subtitle')).toBeInTheDocument();
    expect(screen.getByText('What is your language preference?')).toBeInTheDocument();
  });

  it('renders option chips for the first screen', () => {
    renderPage();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Hindi')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('renders progress bar with correct step count', () => {
    renderPage();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('disables Save and Proceed when no option selected', () => {
    renderPage();
    const btn = screen.getByText('onboarding.saveAndProceed');
    expect(btn).toBeDisabled();
  });

  it('enables Save and Proceed after selecting an option', () => {
    renderPage();
    fireEvent.click(screen.getByText('English'));
    const btn = screen.getByText('onboarding.saveAndProceed');
    expect(btn).not.toBeDisabled();
  });

  it('navigates to next screen on Save and Proceed', () => {
    renderPage();
    fireEvent.click(screen.getByText('English'));
    fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
    expect(screen.getByText('What is your role?')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('shows back button on second screen', () => {
    renderPage();
    fireEvent.click(screen.getByText('English'));
    fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
    expect(screen.getByLabelText('onboarding.goBack')).toBeInTheDocument();
  });

  it('navigates back and preserves selection', () => {
    renderPage();
    fireEvent.click(screen.getByText('English'));
    fireEvent.click(screen.getByText('onboarding.saveAndProceed'));

    // Go back
    fireEvent.click(screen.getByLabelText('onboarding.goBack'));
    expect(screen.getByText('What is your language preference?')).toBeInTheDocument();
    // English should still be selected (chip has selected class)
    const englishChip = screen.getByText('English').closest('button');
    expect(englishChip?.className).toContain('onboarding-chip--selected');
  });

  it('shows text input when Other is selected', () => {
    renderPage();
    fireEvent.click(screen.getByText('Other'));
    expect(screen.getByPlaceholderText('onboarding.enterPreference')).toBeInTheDocument();
  });

  it('shows Submit button on last screen', () => {
    renderPage();
    fireEvent.click(screen.getByText('English'));
    fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
    fireEvent.click(screen.getByText('Teacher'));
    expect(screen.getByText('onboarding.submit')).toBeInTheDocument();
  });

  it('shows Submit button when Other is selected (terminal field)', () => {
    renderPage();
    fireEvent.click(screen.getByText('Other'));
    expect(screen.getByText('onboarding.submit')).toBeInTheDocument();
  });

  it('calls updateUser on submit', async () => {
    renderPage();
    fireEvent.click(screen.getByText('English'));
    fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
    fireEvent.click(screen.getByText('Teacher'));
    fireEvent.click(screen.getByText('onboarding.submit'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        userId: 'test-user-123',
        framework: {
          onboardingDetails: {
            isSkipped: false,
            data: {
              language: { values: ['english'] },
              role: { values: ['teacher'] },
            },
          },
        },
      });
    });
  });

  it('calls updateUser with isSkipped on skip', async () => {
    renderPage();
    fireEvent.click(screen.getByText('onboarding.skipOnboarding'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        userId: 'test-user-123',
        framework: {
          onboardingDetails: {
            isSkipped: true,
            data: {},
          },
        },
      });
    });
  });

  it('submits custom text for Other field', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Other'));
    const input = screen.getByPlaceholderText('onboarding.enterPreference');
    fireEvent.change(input, { target: { value: 'Kannada' } });
    fireEvent.click(screen.getByText('onboarding.submit'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        userId: 'test-user-123',
        framework: {
          onboardingDetails: {
            isSkipped: false,
            data: {
              language: { values: ['Kannada'] },
            },
          },
        },
      });
    });
  });

  it('navigates to home after successful submit', async () => {
    renderPage();
    fireEvent.click(screen.getByText('English'));
    fireEvent.click(screen.getByText('onboarding.saveAndProceed'));
    fireEvent.click(screen.getByText('Teacher'));
    fireEvent.click(screen.getByText('onboarding.submit'));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/home', 'root', 'replace');
    });
  });

  it('navigates to home after skip', async () => {
    renderPage();
    fireEvent.click(screen.getByText('onboarding.skipOnboarding'));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/home', 'root', 'replace');
    });
  });
});
