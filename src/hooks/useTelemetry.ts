import { useContext } from 'react';
import { TelemetryContext } from '../providers/TelemetryProvider';
import { telemetryService, type TelemetryEventInput } from '../services/TelemetryService';

export type { TelemetryEventInput };

// No-op fallback when used outside TelemetryProvider
const noopService: typeof telemetryService = {
  initialize: () => {},
  updateContext: () => {},
  updateCampaignParameters: () => {},
  populateGlobalCorRelationData: () => {},
  get isInitialized() { return false; },
  impression: async () => {},
  interact: async () => {},
  start: async () => {},
  end: async () => {},
  interrupt: async () => {},
  summary: async () => {},
  error: async () => {},
  log: async () => {},
  audit: async () => {},
  share: async () => {},
  feedback: async () => {},
  save: async () => {},
} as unknown as typeof telemetryService;

export const useTelemetry = (): typeof telemetryService => {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    console.warn('[useTelemetry] Used outside TelemetryProvider — telemetry will not be recorded.');
    return noopService;
  }
  return ctx;
};
