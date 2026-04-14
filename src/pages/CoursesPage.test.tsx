import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CoursesPage from './CoursesPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
}));

vi.mock('../components/layout/AppHeader', () => ({
  AppHeader: ({ title }: any) => <div data-testid="app-header">{title}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

describe('CoursesPage — landmarks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page', () => {
    render(<CoursesPage />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('has a <main id="main-content"> landmark', () => {
    const { container } = render(<CoursesPage />);
    expect(container.querySelector('main#main-content')).toBeInTheDocument();
  });

  it('main content area wraps the page content', () => {
    const { container } = render(<CoursesPage />);
    const main = container.querySelector('main#main-content')!;
    expect(main.textContent).toContain('coursesPage.title');
  });
});
