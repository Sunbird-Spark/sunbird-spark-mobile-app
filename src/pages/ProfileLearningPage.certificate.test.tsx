import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('@ionic/react', async () => {
  const React = await import('react');
  return {
    IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
    IonHeader: ({ children }: any) => <div>{children}</div>,
    IonToolbar: ({ children }: any) => <div>{children}</div>,
    IonTitle: ({ children }: any) => <h1>{children}</h1>,
    IonContent: ({ children, onClick }: any) => (
      <div onClick={onClick} onKeyDown={onClick} role="presentation">{children}</div>
    ),
    IonButtons: ({ children }: any) => <div>{children}</div>,
    IonBackButton: () => <button data-testid="ion-back-button" />,
    IonSpinner: () => <span data-testid="ion-spinner" />,
    IonActionSheet: ({ isOpen, buttons, onDidDismiss }: any) =>
      isOpen ? (
        <div data-testid="action-sheet">
          <button data-testid="sheet-dismiss" onClick={onDidDismiss}>dismiss</button>
          {buttons?.map((b: any) => (
            <button key={b.text} data-testid={`sheet-${b.text}`} onClick={() => b.handler?.()}>{b.text}</button>
          ))}
        </div>
      ) : null,
    IonToast: ({ isOpen, message, color, onDidDismiss }: any) =>
      isOpen ? (
        <div data-testid="ion-toast" data-color={color}>
          {message}
          <button data-testid={`toast-dismiss-${color}`} onClick={onDidDismiss}>dismiss</button>
        </div>
      ) : null,
    useIonRouter: () => ({ push: mockPush, goBack: vi.fn() }),
    useIonViewDidEnter: (cb: () => void) => {
      React.useEffect(() => { cb(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    },
  };
});

vi.mock('ionicons/icons', () => ({ chevronBackOutline: 'chevron-back' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn(() => ({ userId: 'u1' })) }));
vi.mock('../hooks/useUserEnrollment', () => ({ useUserEnrollmentList: vi.fn() }));
vi.mock('../services/CertificateService', () => ({
  certificateService: { downloadAndSave: vi.fn() },
}));
vi.mock('../utils/placeholderImages', () => ({ getPlaceholderImage: () => 'placeholder.png' }));
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    convertFileSrc: vi.fn((url: string) => url),
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    checkPermissions: vi.fn().mockResolvedValue({ publicStorage: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ publicStorage: 'granted' }),
  },
}));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./ProfileLearningPage.css', () => ({}));

import ProfileLearningPage from './ProfileLearningPage';
import { useUserEnrollmentList } from '../hooks/useUserEnrollment';
import { certificateService } from '../services/CertificateService';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

const completedCourse = {
  courseId: 'do_done',
  contentId: 'do_done',
  courseName: 'Finished Course',
  completionPercentage: 100,
  status: 2,
  batchId: 'b1',
  issuedCertificates: [{ identifier: 'cert_1', templateUrl: 'https://cdn/tpl.svg' }],
};

const refetch = vi.fn();

const mockCourses = (courses: any[], over: Record<string, unknown> = {}) =>
  (useUserEnrollmentList as any).mockReturnValue({
    data: { data: { courses } },
    isLoading: false,
    isError: false,
    refetch,
    ...over,
  });

describe('ProfileLearningPage — certificate download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    vi.mocked(Filesystem.checkPermissions).mockResolvedValue({ publicStorage: 'granted' } as any);
    vi.mocked(Filesystem.requestPermissions).mockResolvedValue({ publicStorage: 'granted' } as any);
    (certificateService.downloadAndSave as any).mockResolvedValue(undefined);
    mockCourses([completedCourse]);
  });

  it('refetches enrolments when the view becomes visible', () => {
    render(<ProfileLearningPage />);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('opens the format picker without navigating away from the list', () => {
    render(<ProfileLearningPage />);
    expect(screen.queryByTestId('action-sheet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('downloadCertificate'));
    expect(screen.getByTestId('action-sheet')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('saves the certificate as a PDF and confirms where it went', async () => {
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() =>
      expect(certificateService.downloadAndSave).toHaveBeenCalledWith(
        'cert_1', 'Finished Course', 'pdf', 'https://cdn/tpl.svg',
      ),
    );
    await waitFor(() =>
      expect(screen.getByText('certificateSavedToDocuments')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('ion-toast')).toHaveAttribute('data-color', 'success');
  });

  it('saves the certificate as a PNG and points at the gallery', async () => {
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPng'));

    await waitFor(() =>
      expect(certificateService.downloadAndSave).toHaveBeenCalledWith(
        'cert_1', 'Finished Course', 'png', 'https://cdn/tpl.svg',
      ),
    );
    await waitFor(() =>
      expect(screen.getByText('certificateSavedToGallery')).toBeInTheDocument(),
    );
  });

  it('shows a spinner on the card while the certificate is being generated', async () => {
    let release: () => void = () => { };
    (certificateService.downloadAndSave as any).mockReturnValue(new Promise<void>((r) => { release = r; }));
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() => expect(screen.getByTestId('ion-spinner')).toBeInTheDocument());
    release();
    await waitFor(() => expect(screen.queryByTestId('ion-spinner')).not.toBeInTheDocument());
  });

  it('surfaces a download failure as a danger toast', async () => {
    (certificateService.downloadAndSave as any).mockRejectedValue(new Error('render failed'));
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() => expect(screen.getByText('certificateDownloadError')).toBeInTheDocument());
    expect(screen.getByTestId('ion-toast')).toHaveAttribute('data-color', 'danger');
  });

  it('dismisses the error toast', async () => {
    (certificateService.downloadAndSave as any).mockRejectedValue(new Error('render failed'));
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));
    await waitFor(() => expect(screen.getByText('certificateDownloadError')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('toast-dismiss-danger'));
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('dismisses the success toast', async () => {
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));
    await waitFor(() => expect(screen.getByText('certificateSavedToDocuments')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('toast-dismiss-success'));
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('closes the format picker when it is dismissed', () => {
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-dismiss'));
    expect(screen.queryByTestId('action-sheet')).not.toBeInTheDocument();
    expect(certificateService.downloadAndSave).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is cancelled', () => {
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-cancel'));
    expect(certificateService.downloadAndSave).not.toHaveBeenCalled();
  });

  it('skips the download when the issued certificate has no identifier', async () => {
    mockCourses([{ ...completedCourse, issuedCertificates: [{ templateUrl: 'https://cdn/tpl.svg' }] }]);
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() => expect(certificateService.downloadAndSave).not.toHaveBeenCalled());
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('offers no certificate action when the course issued none', () => {
    mockCourses([{ ...completedCourse, issuedCertificates: [] }]);
    render(<ProfileLearningPage />);
    expect(screen.getByText('noCertificate')).toBeInTheDocument();
    expect(screen.queryByText('downloadCertificate')).not.toBeInTheDocument();
  });

  it('hides the certificate footer for an unfinished course', () => {
    mockCourses([{ ...completedCourse, status: 1, completionPercentage: 40 }]);
    render(<ProfileLearningPage />);
    expect(screen.queryByText('downloadCertificate')).not.toBeInTheDocument();
    expect(screen.queryByText('noCertificate')).not.toBeInTheDocument();
  });

  it('falls back to a generic file name when the course has no title', async () => {
    mockCourses([{ ...completedCourse, courseName: undefined, name: undefined }]);
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() =>
      expect(certificateService.downloadAndSave).toHaveBeenCalledWith(
        'cert_1', 'certificate', 'pdf', 'https://cdn/tpl.svg',
      ),
    );
  });

  // ── Android storage permissions ──

  it('asks for storage permission on Android before saving', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(Filesystem.checkPermissions).mockResolvedValue({ publicStorage: 'denied' } as any);
    vi.mocked(Filesystem.requestPermissions).mockResolvedValue({ publicStorage: 'granted' } as any);

    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() => expect(Filesystem.requestPermissions).toHaveBeenCalled());
    expect(certificateService.downloadAndSave).toHaveBeenCalled();
  });

  it('aborts the download when storage permission is refused', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(Filesystem.checkPermissions).mockResolvedValue({ publicStorage: 'denied' } as any);
    vi.mocked(Filesystem.requestPermissions).mockResolvedValue({ publicStorage: 'denied' } as any);

    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() => expect(screen.getByText('storagePermissionDenied')).toBeInTheDocument());
    expect(certificateService.downloadAndSave).not.toHaveBeenCalled();
  });

  it('does not re-request permission that is already granted', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() => expect(certificateService.downloadAndSave).toHaveBeenCalled());
    expect(Filesystem.requestPermissions).not.toHaveBeenCalled();
  });

  it('skips the permission dance on non-Android platforms', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');

    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByText('downloadCertificate'));
    fireEvent.click(screen.getByTestId('sheet-downloadAsPdf'));

    await waitFor(() => expect(certificateService.downloadAndSave).toHaveBeenCalled());
    expect(Filesystem.checkPermissions).not.toHaveBeenCalled();
  });
});

describe('ProfileLearningPage — card interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCourses([completedCourse]);
  });

  it('opens the collection from the keyboard', () => {
    render(<ProfileLearningPage />);
    fireEvent.keyDown(screen.getByRole('button', { name: /Finished Course/ }), { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/collection/do_done');
  });

  it('opens the collection with the space bar', () => {
    render(<ProfileLearningPage />);
    fireEvent.keyDown(screen.getByRole('button', { name: /Finished Course/ }), { key: ' ' });
    expect(mockPush).toHaveBeenCalledWith('/collection/do_done');
  });

  it('ignores unrelated keys on the card', () => {
    render(<ProfileLearningPage />);
    fireEvent.keyDown(screen.getByRole('button', { name: /Finished Course/ }), { key: 'Escape' });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not navigate when the enrolment has no collection id', () => {
    mockCourses([{ ...completedCourse, courseId: undefined, collectionId: undefined, contentId: undefined }]);
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByRole('button', { name: /Finished Course/ }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders the batch end date when the batch has one', () => {
    mockCourses([{ ...completedCourse, batch: { endDate: '2024-12-31' } }]);
    render(<ProfileLearningPage />);
    expect(screen.getByText(/dueDate/)).toBeInTheDocument();
  });

  it('keeps the filter dropdown open when clicking inside it', () => {
    mockCourses([]);
    render(<ProfileLearningPage />);
    fireEvent.click(screen.getByLabelText('filters'));
    fireEvent.click(screen.getByRole('group'));
    expect(screen.getByRole('group')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('group'), { key: 'Escape' });
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('falls back to the enrolment name when there is no course name', () => {
    mockCourses([{ ...completedCourse, courseName: undefined, name: 'Fallback Name' }]);
    render(<ProfileLearningPage />);
    expect(screen.getByText('Fallback Name')).toBeInTheDocument();
  });
});
