import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import VideoContentPage from './VideoContentPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className, style }: any) => <div style={style}>{children}</div>,
  IonToolbar: ({ children, style }: any) => <div style={style}>{children}</div>,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonButtons: ({ children, slot, className }: any) => <div data-slot={slot} className={className}>{children}</div>,
  IonIcon: ({ icon, color }: any) => <span data-icon={icon} data-color={color} />,
  IonImg: ({ src, alt, className }: any) => <img src={src} alt={alt} className={className} />,
}));

vi.mock('ionicons/icons', () => ({
  shareSocialOutline: 'share-social',
  downloadOutline: 'download',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router', () => ({
  useParams: () => ({ id: 'test-video-id' }),
}));

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ goBack: vi.fn(), push: vi.fn() }),
}));

vi.mock('../components/common/AppBackIcon', () => ({
  AppBackIcon: () => (
    <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">
      <path d="M10 2L2 10L10 18" />
    </svg>
  ),
}));

vi.mock('../services/TelemetryService', () => ({
  telemetryService: { share: vi.fn() },
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./VideoContentPage.css', () => ({}));

import { telemetryService } from '../services/TelemetryService';

describe('VideoContentPage — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('back button has aria-label="back"', () => {
    render(<VideoContentPage />);
    const backBtn = screen.getByRole('button', { name: 'back' });
    expect(backBtn).toBeInTheDocument();
  });

  it('download button has aria-label="download.download"', () => {
    render(<VideoContentPage />);
    const downloadBtn = screen.getByRole('button', { name: 'download.download' });
    expect(downloadBtn).toBeInTheDocument();
  });

  it('share button has aria-label="share"', () => {
    render(<VideoContentPage />);
    const shareBtn = screen.getByRole('button', { name: 'share' });
    expect(shareBtn).toBeInTheDocument();
  });

  it('clicking share button calls telemetryService.share', () => {
    render(<VideoContentPage />);
    const shareBtn = screen.getByRole('button', { name: 'share' });
    fireEvent.click(shareBtn);
    expect(telemetryService.share).toHaveBeenCalled();
  });

  it('clicking back button does not crash', () => {
    render(<VideoContentPage />);
    const backBtn = screen.getByRole('button', { name: 'back' });
    fireEvent.click(backBtn);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });

  it('renders related video cards via map', () => {
    const { container } = render(<VideoContentPage />);
    const cards = container.querySelectorAll('.related-video-card');
    expect(cards.length).toBe(5);
  });
});
