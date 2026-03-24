import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mock useTelemetry ──────────────────────────────────────────────────────
const mockImpression = vi.fn().mockResolvedValue(undefined);

vi.mock('./useTelemetry', () => ({
  useTelemetry: () => ({ impression: mockImpression }),
}));

// ── Mock NavigationHelperService ───────────────────────────────────────────
const mockStoreUrlHistory = vi.fn().mockReturnValue(true);
const mockGetPageLoadTime = vi.fn().mockReturnValue(1.0);
const mockResetPageStartTime = vi.fn();

vi.mock('../services/NavigationHelperService', () => ({
  navigationHelperService: {
    storeUrlHistory: (...args: any[]) => mockStoreUrlHistory(...args),
    getPageLoadTime: () => mockGetPageLoadTime(),
    resetPageStartTime: () => mockResetPageStartTime(),
  },
}));

import useImpression from './useImpression';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(MemoryRouter, { initialEntries: ['/test'] }, children);

describe('useImpression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreUrlHistory.mockReturnValue(true);
    mockGetPageLoadTime.mockReturnValue(1.0);
  });

  // ── Main impression ──────────────────────────────────────────────────────

  it('fires impression on mount when URL is new', () => {
    renderHook(() => useImpression({ pageid: 'TestPage', env: 'test' }), { wrapper });

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({
        edata: expect.objectContaining({ type: 'view', pageid: 'TestPage' }),
        context: { env: 'test' },
      }),
    );
  });

  it('does not fire impression when URL is a duplicate', () => {
    mockStoreUrlHistory.mockReturnValue(false);

    renderHook(() => useImpression({ pageid: 'TestPage' }), { wrapper });

    expect(mockImpression).not.toHaveBeenCalled();
  });

  it('includes subtype in edata when provided', () => {
    renderHook(() => useImpression({ pageid: 'TestPage', subtype: 'list' }), { wrapper });

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({
        edata: expect.objectContaining({ subtype: 'list' }),
      }),
    );
  });

  it('includes visits in edata when provided', () => {
    const visits = [{ objid: 'do_1', objtype: 'Content', index: 0 }];

    renderHook(() => useImpression({ pageid: 'TestPage', visits }), { wrapper });

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({
        edata: expect.objectContaining({ visits }),
      }),
    );
  });

  it('includes object in impression when non-empty', () => {
    const object = { id: 'do_1', type: 'Content', ver: '1' };

    renderHook(() => useImpression({ pageid: 'TestPage', object }), { wrapper });

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({ object: expect.objectContaining({ id: 'do_1' }) }),
    );
  });

  it('omits object from impression when empty', () => {
    renderHook(() => useImpression({ pageid: 'TestPage' }), { wrapper });

    const call = mockImpression.mock.calls[0][0];
    expect(call).not.toHaveProperty('object');
  });

  it('uses pathname as pageid when pageid is not provided', () => {
    renderHook(() => useImpression({}), { wrapper });

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({
        edata: expect.objectContaining({ pageid: '/test' }),
      }),
    );
  });

  // ── Pageexit effect (lines 80-93) ───────────────────────────────────────

  it('fires pageexit impression on unmount when pageexit=true', () => {
    const { unmount } = renderHook(
      () => useImpression({ pageid: 'TestPage', env: 'test', pageexit: true }),
      { wrapper },
    );

    mockImpression.mockClear();
    unmount();

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({
        edata: expect.objectContaining({ subtype: 'pageexit', pageid: 'TestPage' }),
      }),
    );
  });

  it('does not fire pageexit impression on unmount when pageexit is not set', () => {
    const { unmount } = renderHook(
      () => useImpression({ pageid: 'TestPage' }),
      { wrapper },
    );

    mockImpression.mockClear();
    unmount();

    expect(mockImpression).not.toHaveBeenCalled();
  });

  it('includes env in context on pageexit when provided', () => {
    const { unmount } = renderHook(
      () => useImpression({ pageid: 'TestPage', env: 'home', pageexit: true }),
      { wrapper },
    );

    mockImpression.mockClear();
    unmount();

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({ context: { env: 'home' } }),
    );
  });

  it('omits context from pageexit when env is not provided', () => {
    const { unmount } = renderHook(
      () => useImpression({ pageid: 'TestPage', pageexit: true }),
      { wrapper },
    );

    mockImpression.mockClear();
    unmount();

    const call = mockImpression.mock.calls[0][0];
    expect(call).not.toHaveProperty('context');
  });

  it('includes visits in pageexit edata when provided', () => {
    const visits = [{ objid: 'do_1', objtype: 'Content', index: 0 }];

    const { unmount } = renderHook(
      () => useImpression({ pageid: 'TestPage', pageexit: true, visits }),
      { wrapper },
    );

    mockImpression.mockClear();
    unmount();

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({
        edata: expect.objectContaining({ visits }),
      }),
    );
  });

  it('omits visits from pageexit when visits array is empty', () => {
    const { unmount } = renderHook(
      () => useImpression({ pageid: 'TestPage', pageexit: true, visits: [] }),
      { wrapper },
    );

    mockImpression.mockClear();
    unmount();

    const call = mockImpression.mock.calls[0][0];
    expect(call.edata).not.toHaveProperty('visits');
  });

  it('includes object in pageexit when non-empty', () => {
    const object = { id: 'do_1', type: 'Content', ver: '1' };

    const { unmount } = renderHook(
      () => useImpression({ pageid: 'TestPage', pageexit: true, object }),
      { wrapper },
    );

    mockImpression.mockClear();
    unmount();

    expect(mockImpression).toHaveBeenCalledWith(
      expect.objectContaining({ object: expect.objectContaining({ id: 'do_1' }) }),
    );
  });

  it('omits object from pageexit when empty', () => {
    const { unmount } = renderHook(
      () => useImpression({ pageid: 'TestPage', pageexit: true }),
      { wrapper },
    );

    mockImpression.mockClear();
    unmount();

    const call = mockImpression.mock.calls[0][0];
    expect(call).not.toHaveProperty('object');
  });
});
