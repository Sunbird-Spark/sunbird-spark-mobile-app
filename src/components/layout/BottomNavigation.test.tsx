import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { axe } from 'jest-axe';
import { BottomNavigation } from './BottomNavigation';

const mockRouterPush = vi.fn();
const mockPathname = { current: '/home' };

vi.mock('@ionic/react', () => ({
  IonIcon: ({ icon, style }: any) => <span data-testid="ion-icon" data-icon={icon} style={style} />,
  useIonRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname.current }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('ionicons/icons', () => ({
  home: 'home-filled',
  homeOutline: 'home-outline',
}));

describe('BottomNavigation — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.current = '/home';
  });

  it('renders as a <nav> element', () => {
    render(<BottomNavigation />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('nav has aria-label for screen readers', () => {
    render(<BottomNavigation />);
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'mainNavigation');
  });

  it('each nav button has an aria-label', () => {
    render(<BottomNavigation />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')!.length).toBeGreaterThan(0);
    });
  });

  it('active nav item has aria-current="page"', () => {
    mockPathname.current = '/home';
    render(<BottomNavigation />);
    const homeBtn = screen.getByRole('button', { name: 'home' });
    expect(homeBtn).toHaveAttribute('aria-current', 'page');
  });

  it('inactive nav items do not have aria-current', () => {
    mockPathname.current = '/home';
    render(<BottomNavigation />);
    const exploreBtn = screen.getByRole('button', { name: 'explore' });
    expect(exploreBtn).not.toHaveAttribute('aria-current');
  });

  it('aria-current moves to explore when on /explore', () => {
    mockPathname.current = '/explore';
    render(<BottomNavigation />);
    expect(screen.getByRole('button', { name: 'explore' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'home' })).not.toHaveAttribute('aria-current');
  });

  it('aria-current moves to profile when on /profile', () => {
    mockPathname.current = '/profile';
    render(<BottomNavigation />);
    expect(screen.getByRole('button', { name: 'profile' })).toHaveAttribute('aria-current', 'page');
  });

  it('clicking a nav button calls router.push with the correct path', () => {
    render(<BottomNavigation />);
    fireEvent.click(screen.getByRole('button', { name: 'explore' }));
    expect(mockRouterPush).toHaveBeenCalledWith('/explore', 'root', 'replace');
  });

  it('renders all 5 nav items', () => {
    render(<BottomNavigation />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('has no axe violations', async () => {
    const { container } = render(<BottomNavigation />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
