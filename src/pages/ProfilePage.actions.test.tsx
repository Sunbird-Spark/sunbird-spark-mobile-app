import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockRouterPush = vi.fn();

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonList: ({ children }: any) => <ul>{children}</ul>,
  IonItem: ({ children, button, onClick, disabled }: any) => (
    <li>
      <button type="button" onClick={onClick} disabled={disabled} data-role={button ? 'action' : undefined}>
        {children}
      </button>
    </li>
  ),
  IonLabel: ({ children }: any) => <span>{children}</span>,
  IonIcon: ({ icon }: any) => <span data-icon={icon} />,
  IonAlert: ({ isOpen, header, message, buttons, onDidDismiss }: any) =>
    isOpen ? (
      <div role="alertdialog" aria-label={header}>
        <p>{message}</p>
        {(buttons ?? []).map((b: any, i: number) => (
          <button key={i} data-role={b.role ?? 'confirm'} onClick={() => b.handler?.()}>{b.text}</button>
        ))}
        <button data-testid="alert-dismiss" onClick={onDidDismiss}>dismiss</button>
      </div>
    ) : null,
  useIonRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('ionicons/icons', () => ({
  chevronForwardOutline: 'chevron-forward',
  logOutOutline: 'log-out',
  trashOutline: 'trash',
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./ProfilePage.css', () => ({}));
vi.mock('../components/layout/AppHeader', () => ({ AppHeader: ({ title }: any) => <div>{title}</div> }));
vi.mock('../components/layout/BottomNavigation', () => ({ BottomNavigation: () => <nav /> }));
vi.mock('../components/home/learning-started/LearningStatsGrid', () => ({
  LearningStatsGrid: ({ certificationsEarned }: any) => (
    <div data-testid="stats-grid" data-certs={String(certificationsEarned)} />
  ),
}));
vi.mock('react-avatar', () => ({ default: ({ name }: any) => <div data-testid="avatar">{name}</div> }));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUser', () => ({ useUser: vi.fn() }));
vi.mock('../hooks/useUserEnrollment', () => ({ useUserEnrollmentList: vi.fn() }));
vi.mock('../hooks/useUserCertificates', () => ({ useUserCertificates: vi.fn() }));
vi.mock('../hooks/useSystemSetting', () => ({ useSystemSetting: vi.fn() }));
vi.mock('../utils/returnTo', () => ({ clearReturnTo: vi.fn() }));
vi.mock('../services/network/networkService', () => ({
  networkService: { isConnected: vi.fn() },
}));
vi.mock('../services/sync/SyncService', () => ({
  syncService: { hasPendingCourseData: vi.fn() },
}));

import ProfilePage from './ProfilePage';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { useUserEnrollmentList } from '../hooks/useUserEnrollment';
import { useUserCertificates } from '../hooks/useUserCertificates';
import { useSystemSetting } from '../hooks/useSystemSetting';
import { clearReturnTo } from '../utils/returnTo';
import { networkService } from '../services/network/networkService';
import { syncService } from '../services/sync/SyncService';

const mockLogout = vi.fn();
const action = (label: string) => screen.getByText(label).closest('button')!;

const setDeleteSetting = (value: unknown) => {
  (useSystemSetting as any).mockReturnValue({ data: { data: { response: { value } } } });
};

describe('ProfilePage — actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
    (useAuth as any).mockReturnValue({ logout: mockLogout, isAuthenticated: true, userId: 'u1' });
    (useUser as any).mockReturnValue({ data: { firstName: 'Alice', userName: 'alice', roles: [] } });
    (useUserEnrollmentList as any).mockReturnValue({ data: null });
    (useUserCertificates as any).mockReturnValue({ data: null });
    (useSystemSetting as any).mockReturnValue({ data: null });
    (networkService.isConnected as any).mockReturnValue(true);
    (syncService.hasPendingCourseData as any).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('guest navigation', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({ logout: mockLogout, isAuthenticated: false, userId: null });
    });

    it('clears any stored return target before sending the guest to sign-in', () => {
      render(<ProfilePage />);
      fireEvent.click(action('signIn'));
      expect(clearReturnTo).toHaveBeenCalledTimes(1);
      expect(mockRouterPush).toHaveBeenCalledWith('/sign-in', 'forward', 'push');
    });

    it('opens downloaded contents', () => {
      render(<ProfilePage />);
      fireEvent.click(action('downloadedContents'));
      expect(mockRouterPush).toHaveBeenCalledWith('/profile/downloaded-contents', 'forward', 'push');
    });

    it('opens settings', () => {
      render(<ProfilePage />);
      fireEvent.click(action('settings'));
      expect(mockRouterPush).toHaveBeenCalledWith('/profile/settings', 'forward', 'push');
    });

    it('does not query enrollments or certificates for a guest', () => {
      render(<ProfilePage />);
      expect(useUserEnrollmentList).toHaveBeenCalledWith(null, { enabled: false });
      expect(useUserCertificates).toHaveBeenCalledWith(null);
    });
  });

  describe('authenticated navigation', () => {
    it.each([
      ['personalInformation', '/profile/personal-details'],
      ['myLearning', '/profile/learning'],
      ['downloadedContents', '/profile/downloaded-contents'],
      ['settings', '/profile/settings'],
    ])('opens %s', (label, route) => {
      render(<ProfilePage />);
      fireEvent.click(action(label));
      expect(mockRouterPush).toHaveBeenCalledWith(route, 'forward', 'push');
    });
  });

  describe('delete account entry point', () => {
    it('is hidden when the backend setting is absent', () => {
      render(<ProfilePage />);
      expect(screen.queryByText('deleteAccount')).toBeNull();
    });

    it('is hidden when the backend setting is off', () => {
      setDeleteSetting('false');
      render(<ProfilePage />);
      expect(screen.queryByText('deleteAccount')).toBeNull();
    });

    it('is shown when the setting is on, tolerating case and padding', () => {
      setDeleteSetting('  TRUE  ');
      render(<ProfilePage />);
      expect(screen.getByText('deleteAccount')).toBeInTheDocument();
    });

    it('is hidden for org admins even when the setting is on', () => {
      setDeleteSetting('true');
      (useUser as any).mockReturnValue({
        data: { firstName: 'Alice', userName: 'alice', organisations: [{ roles: ['ORG_ADMIN'] }] },
      });
      render(<ProfilePage />);
      expect(screen.queryByText('deleteAccount')).toBeNull();
    });

    it('navigates to the delete-account page', () => {
      setDeleteSetting('true');
      render(<ProfilePage />);
      fireEvent.click(action('deleteAccount'));
      expect(mockRouterPush).toHaveBeenCalledWith('/profile/delete-account', 'forward', 'push');
    });
  });

  describe('logout', () => {
    it('logs out immediately when online without checking the offline queue', async () => {
      render(<ProfilePage />);
      fireEvent.click(action('logout'));
      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
      expect(syncService.hasPendingCourseData).not.toHaveBeenCalled();
    });

    it('checks the offline queue and logs out when nothing is pending', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      render(<ProfilePage />);
      fireEvent.click(action('logout'));
      await waitFor(() => expect(syncService.hasPendingCourseData).toHaveBeenCalledWith('u1'));
      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('warns instead of logging out when offline work is still pending', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      (syncService.hasPendingCourseData as any).mockResolvedValue(true);
      render(<ProfilePage />);
      fireEvent.click(action('logout'));
      await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('logs out anyway when the pending check throws', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      (syncService.hasPendingCourseData as any).mockRejectedValue(new Error('db closed'));
      render(<ProfilePage />);
      fireEvent.click(action('logout'));
      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('logs out after 3s when the pending check never settles', async () => {
      vi.useFakeTimers();
      (networkService.isConnected as any).mockReturnValue(false);
      (syncService.hasPendingCourseData as any).mockReturnValue(new Promise(() => {}));
      render(<ProfilePage />);
      fireEvent.click(action('logout'));
      expect(mockLogout).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(3000);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('ignores a second tap while the first check is still running', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      let resolvePending: (v: boolean) => void = () => {};
      (syncService.hasPendingCourseData as any).mockReturnValue(
        new Promise<boolean>(res => { resolvePending = res; }),
      );
      render(<ProfilePage />);
      fireEvent.click(action('logout'));
      fireEvent.click(action('logout'));
      expect(syncService.hasPendingCourseData).toHaveBeenCalledTimes(1);
      resolvePending(false);
      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    });

    it('disables the logout item while the check is in flight', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      let resolvePending: (v: boolean) => void = () => {};
      (syncService.hasPendingCourseData as any).mockReturnValue(
        new Promise<boolean>(res => { resolvePending = res; }),
      );
      render(<ProfilePage />);
      fireEvent.click(action('logout'));
      await waitFor(() => expect(action('logout')).toBeDisabled());
      resolvePending(false);
      await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    });
  });

  describe('sync warning dialog', () => {
    const openWarning = async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      (syncService.hasPendingCourseData as any).mockResolvedValue(true);
      render(<ProfilePage />);
      fireEvent.click(action('logout'));
      await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
    };

    it('shows the warning copy', async () => {
      await openWarning();
      expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-label', 'logoutSyncWarning.header');
      expect(screen.getByText('logoutSyncWarning.message')).toBeInTheDocument();
    });

    it('cancelling keeps the user signed in', async () => {
      await openWarning();
      fireEvent.click(screen.getByText('logoutSyncWarning.cancel'));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('confirming signs the user out', async () => {
      await openWarning();
      fireEvent.click(screen.getByText('logoutSyncWarning.confirm'));
      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('dismissing closes it without signing out', async () => {
      await openWarning();
      fireEvent.click(screen.getByTestId('alert-dismiss'));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  describe('roles and certificates', () => {
    it('separates multiple roles with a dot', () => {
      (useUser as any).mockReturnValue({
        data: { firstName: 'Alice', userName: 'alice', roles: ['PUBLIC', 'CONTENT_CREATOR'] },
      });
      const { container } = render(<ProfilePage />);
      expect(container.querySelectorAll('.profile-role')).toHaveLength(2);
      expect(container.querySelectorAll('.profile-role-dot')).toHaveLength(1);
    });

    it('counts issued certificates from the certificates query', () => {
      (useUserCertificates as any).mockReturnValue({ data: { data: [{ id: 'c1' }, { id: 'c2' }] } });
      render(<ProfilePage />);
      expect(screen.getByTestId('stats-grid')).toHaveAttribute('data-certs', '2');
    });

    it('shows the sunbird id from the profile', () => {
      const { container } = render(<ProfilePage />);
      expect(container.querySelector('.profile-email')?.textContent).toContain('alice');
    });
  });
});
