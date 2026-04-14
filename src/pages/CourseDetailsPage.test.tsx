import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CourseDetailsPage from './CourseDetailsPage';

const { mockPush, mockGoBack } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGoBack: vi.fn(),
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div>{children}</div>,
  IonToolbar: ({ children, className }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonAccordionGroup: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonAccordion: ({ children, value, className }: any) => <div data-value={value} className={className}>{children}</div>,
  IonItem: ({ children, slot, className }: any) => <div data-slot={slot} className={className}>{children}</div>,
  IonLabel: ({ children, className }: any) => <span className={className}>{children}</span>,
  IonImg: ({ src, alt, className }: any) => <img src={src} alt={alt} className={className} />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ goBack: mockGoBack, push: mockPush }),
}));

vi.mock('../components/common/AppBackIcon', () => ({
  AppBackIcon: () => (
    <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">
      <path d="M10 2L2 10L10 18" />
    </svg>
  ),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./CourseDetailsPage.css', () => ({}));

describe('CourseDetailsPage — accessibility', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGoBack.mockClear();
  });

  it('back button has aria-label="back"', () => {
    render(<CourseDetailsPage />);
    const backBtn = screen.getByRole('button', { name: 'back' });
    expect(backBtn).toBeInTheDocument();
  });

  it('search button has aria-label="search"', () => {
    render(<CourseDetailsPage />);
    const searchBtn = screen.getByRole('button', { name: 'search' });
    expect(searchBtn).toBeInTheDocument();
  });

  it('share button has aria-label="share"', () => {
    render(<CourseDetailsPage />);
    const shareBtn = screen.getByRole('button', { name: 'share' });
    expect(shareBtn).toBeInTheDocument();
  });

  it('SearchIcon SVG has aria-hidden="true"', () => {
    const { container } = render(<CourseDetailsPage />);
    const searchBtn = container.querySelector('[aria-label="search"]');
    const svg = searchBtn?.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('ShareIcon SVG has aria-hidden="true"', () => {
    const { container } = render(<CourseDetailsPage />);
    const shareBtn = container.querySelector('[aria-label="share"]');
    const svg = shareBtn?.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('CheckIcon SVG has aria-hidden="true" and focusable="false"', () => {
    const { container } = render(<CourseDetailsPage />);
    const checkIcons = container.querySelectorAll('.cd-check-icon');
    expect(checkIcons.length).toBeGreaterThan(0);
    checkIcons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('focusable', 'false');
    });
  });

  it('clicking back button calls history.goBack', () => {
    render(<CourseDetailsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('clicking a related content card calls history.push', () => {
    const { container } = render(<CourseDetailsPage />);
    const relatedCard = container.querySelector('.related-card');
    if (relatedCard) fireEvent.click(relatedCard);
    expect(mockPush).toHaveBeenCalled();
  });

  it('pressing Enter on a related content card navigates', () => {
    const { container } = render(<CourseDetailsPage />);
    const relatedCard = container.querySelector('.related-card');
    if (relatedCard) fireEvent.keyDown(relatedCard, { key: 'Enter' });
    expect(mockPush).toHaveBeenCalled();
  });

  it('pressing Space on a related content card navigates', () => {
    const { container } = render(<CourseDetailsPage />);
    const relatedCard = container.querySelector('.related-card');
    if (relatedCard) fireEvent.keyDown(relatedCard, { key: ' ' });
    expect(mockPush).toHaveBeenCalled();
  });

  it('pressing other key on related card does not navigate', () => {
    const { container } = render(<CourseDetailsPage />);
    const relatedCard = container.querySelector('.related-card');
    if (relatedCard) fireEvent.keyDown(relatedCard, { key: 'Tab' });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
