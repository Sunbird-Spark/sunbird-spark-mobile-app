import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import OfflineBanner from './OfflineBanner';
import { useNetwork } from '../../providers/NetworkProvider';
import { useTranslation } from 'react-i18next';

// Mock the hooks
vi.mock('../../providers/NetworkProvider', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

describe('OfflineBanner', () => {
  const mockT = vi.fn((key: string) => key);
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useTranslation as any).mockReturnValue({ t: mockT });
    // Default to online
    (useNetwork as any).mockReturnValue({ isOffline: false });

    // JSDOM has offsetHeight 0 by default, mock it for the banner
    Object.defineProperty(HTMLDivElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 50,
    });

    // happy-dom does not fire ResizeObserver callbacks — mock it as a class
    // that invokes the callback immediately on observe() so height tracking works in tests
    global.ResizeObserver = class {
      private cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) { this.cb = cb; }
      observe(target: Element) { this.cb([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver); }
      disconnect() {}
      unobserve() {}
    } as unknown as typeof ResizeObserver;

    // Reset document state
    document.documentElement.className = '';
    document.documentElement.style.setProperty('--offline-banner-height', '0px');

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders nothing when online', () => {
    const { container } = render(<OfflineBanner />);
    const banner = container.querySelector('.offline-banner');
    expect(banner?.className).not.toContain('offline-banner--visible');
    expect(document.documentElement.classList.contains('has-offline-banner')).toBe(false);
  });

  it('renders "No internet connection" when offline', () => {
    (useNetwork as any).mockReturnValue({ isOffline: true });
    render(<OfflineBanner />);
    
    expect(screen.getByText('offlineBanner.noInternet')).toBeDefined();
    expect(document.documentElement.classList.contains('has-offline-banner')).toBe(true);
    // Should have a height set
    expect(document.documentElement.style.getPropertyValue('--offline-banner-height')).not.toBe('0px');
  });

  it('shows "Back online" when transitioning from offline to online', () => {
    // Start offline
    (useNetwork as any).mockReturnValue({ isOffline: true });
    const { rerender } = render(<OfflineBanner />);
    
    // Flush setTimeout(..., 0) from the effect
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText('offlineBanner.noInternet')).toBeDefined();

    // Go online
    act(() => {
      (useNetwork as any).mockReturnValue({ isOffline: false });
    });
    rerender(<OfflineBanner />);
    
    // Flush the setTimeout(..., 0) that sets backOnline to true
    act(() => { vi.advanceTimersByTime(0); });
    
    expect(screen.getByText('offlineBanner.backOnline')).toBeDefined();
    expect(document.documentElement.classList.contains('has-offline-banner')).toBe(true);

    // Wait for the transition timer
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    
    // Should hide after 2.5s
    const banner = document.querySelector('.offline-banner');
    expect(banner?.className).not.toContain('offline-banner--visible');
    expect(document.documentElement.classList.contains('has-offline-banner')).toBe(false);
  });

  it('cancels "Back online" timer if it goes offline again', () => {
    const { rerender } = render(<OfflineBanner />);
    
    // Offline -> Online -> Offline
    act(() => { (useNetwork as any).mockReturnValue({ isOffline: true }); });
    rerender(<OfflineBanner />);
    act(() => { vi.advanceTimersByTime(0); });
    
    act(() => { (useNetwork as any).mockReturnValue({ isOffline: false }); });
    rerender(<OfflineBanner />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText('offlineBanner.backOnline')).toBeDefined();

    act(() => { (useNetwork as any).mockReturnValue({ isOffline: true }); });
    rerender(<OfflineBanner />);
    act(() => { vi.advanceTimersByTime(0); });
    
    // Should show "No internet" again, and timer should be cleared
    expect(screen.getByText('offlineBanner.noInternet')).toBeDefined();
    
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    
    // Still offline, so banner should STILL be visible
    expect(screen.getByText('offlineBanner.noInternet')).toBeDefined();
    expect(document.documentElement.classList.contains('has-offline-banner')).toBe(true);
  });
});
