import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAddListener,
  mockMinimizeApp,
  mockRemove,
  mockIsNativePlatform,
  mockGoBack,
  mockCanGoBack,
} = vi.hoisted(() => ({
  mockAddListener: vi.fn(),
  mockMinimizeApp: vi.fn(),
  mockRemove: vi.fn(),
  mockIsNativePlatform: vi.fn(),
  mockGoBack: vi.fn(),
  mockCanGoBack: vi.fn(),
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: mockAddListener, minimizeApp: mockMinimizeApp },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mockIsNativePlatform },
}));

vi.mock('@ionic/react', () => ({
  useIonRouter: () => ({ goBack: mockGoBack, canGoBack: mockCanGoBack }),
}));

import { useHardwareBackButton, useBackButtonOverride } from './useBackButton';

type BackButtonEvent = { canGoBack?: boolean };
type Handler = (event: BackButtonEvent) => void;

/** Grabs the callback that the hook registered with App.addListener('backButton'). */
const registeredHandler = (): Handler => {
  expect(mockAddListener).toHaveBeenCalledWith('backButton', expect.any(Function));
  return mockAddListener.mock.calls[0][1] as Handler;
};

describe('useHardwareBackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNativePlatform.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(false);
    mockAddListener.mockResolvedValue({ remove: mockRemove });
    window.history.pushState({}, '', '/');
  });

  it('subscribes to the hardware back button on mount', () => {
    renderHook(() => useHardwareBackButton());

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener).toHaveBeenCalledWith('backButton', expect.any(Function));
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = renderHook(() => useHardwareBackButton());

    unmount();
    // the listener handle is a promise; let it resolve so remove() runs
    await act(async () => { await Promise.resolve(); });

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe on the web platform', () => {
    mockIsNativePlatform.mockReturnValue(false);

    renderHook(() => useHardwareBackButton());

    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('navigates back when the native event says it can go back', () => {
    renderHook(() => useHardwareBackButton());

    act(() => { registeredHandler()({ canGoBack: true }); });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockMinimizeApp).not.toHaveBeenCalled();
  });

  it('navigates back when the Ionic router has history', () => {
    mockCanGoBack.mockReturnValue(true);
    renderHook(() => useHardwareBackButton());

    act(() => { registeredHandler()({ canGoBack: false }); });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('minimizes the app on a root page', () => {
    renderHook(() => useHardwareBackButton());

    act(() => { registeredHandler()({ canGoBack: false }); });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockMinimizeApp).toHaveBeenCalledTimes(1);
  });

  it('re-subscribes when the router identity changes', () => {
    const { rerender } = renderHook(() => useHardwareBackButton());
    expect(mockAddListener).toHaveBeenCalledTimes(1);

    rerender();
    // useIonRouter returns a fresh object each render → effect re-runs
    expect(mockAddListener).toHaveBeenCalledTimes(2);
  });
});

describe('useBackButtonOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNativePlatform.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(true);
    mockAddListener.mockResolvedValue({ remove: mockRemove });
    window.history.pushState({}, '', '/');
  });

  it('lets a matching override swallow the back event', () => {
    window.history.pushState({}, '', '/player');
    const override = vi.fn().mockReturnValue(true);

    renderHook(() => useBackButtonOverride('/player', override));
    renderHook(() => useHardwareBackButton());

    act(() => { registeredHandler()({ canGoBack: true }); });

    expect(override).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockMinimizeApp).not.toHaveBeenCalled();
  });

  it('falls through to the default behaviour when the override declines', () => {
    window.history.pushState({}, '', '/player');
    const override = vi.fn().mockReturnValue(false);

    renderHook(() => useBackButtonOverride('/player', override));
    renderHook(() => useHardwareBackButton());

    act(() => { registeredHandler()({ canGoBack: true }); });

    expect(override).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('ignores an override registered for a different path', () => {
    window.history.pushState({}, '', '/home');
    const override = vi.fn().mockReturnValue(true);

    renderHook(() => useBackButtonOverride('/player', override));
    renderHook(() => useHardwareBackButton());

    act(() => { registeredHandler()({ canGoBack: true }); });

    expect(override).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('unregisters the override on unmount', () => {
    window.history.pushState({}, '', '/player');
    const override = vi.fn().mockReturnValue(true);

    const { unmount } = renderHook(() => useBackButtonOverride('/player', override));
    renderHook(() => useHardwareBackButton());

    unmount();
    act(() => { registeredHandler()({ canGoBack: true }); });

    expect(override).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('always calls the latest handler after a re-render', () => {
    window.history.pushState({}, '', '/player');
    const first = vi.fn().mockReturnValue(true);
    const second = vi.fn().mockReturnValue(true);

    const { rerender } = renderHook(
      ({ handler }: { handler: () => boolean }) => useBackButtonOverride('/player', handler),
      { initialProps: { handler: first } },
    );
    renderHook(() => useHardwareBackButton());

    rerender({ handler: second });
    act(() => { registeredHandler()({ canGoBack: true }); });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
