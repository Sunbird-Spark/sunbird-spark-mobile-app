import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ── Mock useTelemetry ──────────────────────────────────────────────────────
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockSummary = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useTelemetry', () => ({
  useTelemetry: () => ({
    start: mockStart,
    end: mockEnd,
    summary: mockSummary,
  }),
}));

// ── Mock deviceService ─────────────────────────────────────────────────────
vi.mock('../../services/device/deviceService', () => ({
  deviceService: {
    getSpec: () => ({ os: 'test', osVersion: '1', make: 'test', id: 'dev1' }),
  },
}));

import { TelemetryTracker } from './TelemetryTracker';

const startEventInput = { type: 'content', mode: 'play', duration: 0, pageid: 'test' };
const endEventInput = { type: 'content', mode: 'play', duration: 10, pageid: 'test' };

describe('TelemetryTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── START event ───────────────────────────────────────────────────────────

  it('fires START on mount when startEventInput is provided', () => {
    render(<TelemetryTracker startEventInput={startEventInput} />);

    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({ ...startEventInput }),
      '', '', {},
      undefined,
    );
  });

  it('does not fire START when disabled=true', () => {
    render(<TelemetryTracker startEventInput={startEventInput} disabled />);

    expect(mockStart).not.toHaveBeenCalled();
  });

  it('does not fire START when startEventInput is not provided', () => {
    render(<TelemetryTracker />);

    expect(mockStart).not.toHaveBeenCalled();
  });

  it('fires START after disabled flips from true to false', () => {
    const { rerender } = render(
      <TelemetryTracker startEventInput={startEventInput} disabled />,
    );
    expect(mockStart).not.toHaveBeenCalled();

    rerender(<TelemetryTracker startEventInput={startEventInput} disabled={false} />);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  // ── END + SUMMARY on stable unmount (lines 76-86, 108) ───────────────────

  it('fires END and SUMMARY on stable unmount', () => {
    const { unmount } = render(
      <TelemetryTracker startEventInput={startEventInput} endEventInput={endEventInput} />,
    );

    // Advance past the 0ms stable timer so isStableMount becomes true
    act(() => { vi.runAllTimers(); });

    unmount();

    expect(mockEnd).toHaveBeenCalledWith(
      expect.objectContaining({ edata: endEventInput }),
    );
    expect(mockSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        edata: expect.objectContaining({
          type: 'content',
          mode: 'play',
          timespent: expect.any(String),
        }),
      }),
    );
  });

  it('does not fire END when endEventInput is not provided', () => {
    const { unmount } = render(<TelemetryTracker startEventInput={startEventInput} />);

    act(() => { vi.runAllTimers(); });
    unmount();

    expect(mockEnd).not.toHaveBeenCalled();
    expect(mockSummary).not.toHaveBeenCalled();
  });

  it('fires END only once even when unmount + beforeunload both fire', () => {
    const { unmount } = render(
      <TelemetryTracker startEventInput={startEventInput} endEventInput={endEventInput} />,
    );

    act(() => { vi.runAllTimers(); });

    // Fire beforeunload first
    window.dispatchEvent(new Event('beforeunload'));
    expect(mockEnd).toHaveBeenCalledTimes(1);

    // Then unmount — hasEnded guard should prevent a second END
    unmount();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  // ── StrictMode fake unmount (synchronous cleanup, isStableMount=false) ───

  it('does not fire END on StrictMode fake unmount (synchronous)', () => {
    const { unmount } = render(
      <TelemetryTracker startEventInput={startEventInput} endEventInput={endEventInput} />,
    );

    // Unmount BEFORE advancing timers → isStableMount is still false
    unmount();

    expect(mockEnd).not.toHaveBeenCalled();
    expect(mockSummary).not.toHaveBeenCalled();
  });

  // ── beforeunload handler ─────────────────────────────────────────────────

  it('fires END and SUMMARY on beforeunload', () => {
    render(
      <TelemetryTracker startEventInput={startEventInput} endEventInput={endEventInput} />,
    );

    act(() => { vi.runAllTimers(); });
    window.dispatchEvent(new Event('beforeunload'));

    expect(mockEnd).toHaveBeenCalledWith(
      expect.objectContaining({ edata: endEventInput }),
    );
    expect(mockSummary).toHaveBeenCalled();
  });

  it('removes beforeunload listener on unmount', () => {
    const removeEventSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<TelemetryTracker endEventInput={endEventInput} />);
    act(() => { vi.runAllTimers(); });
    unmount();

    expect(removeEventSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    removeEventSpy.mockRestore();
  });
});
