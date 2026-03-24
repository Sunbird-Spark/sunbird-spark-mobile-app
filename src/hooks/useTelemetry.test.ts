import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the provider so importing TelemetryContext doesn't pull in heavy Capacitor deps
vi.mock('../providers/TelemetryProvider', () => {
  const { createContext } = require('react');
  return { TelemetryContext: createContext(null) };
});

// Mock TelemetryService (used for typeof typing in useTelemetry)
vi.mock('../services/TelemetryService', () => ({
  telemetryService: {
    get isInitialized() { return true; },
    initialize: vi.fn(),
    updateContext: vi.fn(),
    updateCampaignParameters: vi.fn(),
    populateGlobalCorRelationData: vi.fn(),
    impression: vi.fn(),
    interact: vi.fn(),
    start: vi.fn(),
    end: vi.fn(),
    interrupt: vi.fn(),
    summary: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    audit: vi.fn(),
    share: vi.fn(),
    feedback: vi.fn(),
    save: vi.fn(),
  },
}));

import { useTelemetry } from './useTelemetry';
import { TelemetryContext } from '../providers/TelemetryProvider';

const mockService = {
  get isInitialized() { return true; },
  initialize: vi.fn(),
  updateContext: vi.fn(),
  updateCampaignParameters: vi.fn(),
  populateGlobalCorRelationData: vi.fn(),
  impression: vi.fn(),
  interact: vi.fn(),
  start: vi.fn(),
  end: vi.fn(),
  interrupt: vi.fn(),
  summary: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
  audit: vi.fn(),
  share: vi.fn(),
  feedback: vi.fn(),
  save: vi.fn(),
} as any;

describe('useTelemetry', () => {
  it('returns noop service with isInitialized=false when used outside TelemetryProvider', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useTelemetry());

    expect(result.current.isInitialized).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[useTelemetry]'),
    );
    warnSpy.mockRestore();
  });

  it('returns the context service when inside TelemetryProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TelemetryContext.Provider, { value: mockService }, children);

    const { result } = renderHook(() => useTelemetry(), { wrapper });

    expect(result.current.isInitialized).toBe(true);
    expect(result.current).toBe(mockService);
  });

  it('noop service methods are callable without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useTelemetry());
    const noop = result.current;

    expect(() => noop.initialize({} as any)).not.toThrow();
    expect(() => noop.updateContext({})).not.toThrow();
    expect(() => noop.impression({ edata: {} })).not.toThrow();

    warnSpy.mockRestore();
  });
});
