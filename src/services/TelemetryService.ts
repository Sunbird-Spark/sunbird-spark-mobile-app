import { v4 as uuidv4 } from 'uuid';
import { telemetryDbService } from './db/TelemetryDbService';
import { databaseService } from './db/DatabaseService';

export class TelemetryService {
  /**
   * Persist a single telemetry event emitted by a player web component.
   * Ensures the DB is initialized before writing (idempotent — safe to call repeatedly).
   * Generates a fresh UUID per event so INSERT OR IGNORE never silently drops rows.
   */
  async save(event: any): Promise<void> {
    if (!event) return;

    try {
      // Ensure the DB is ready. databaseService.initialize() is a no-op after first call.
      await databaseService.initialize();

      const eid: string = (
        event?.eid ?? event?.data?.eid ?? event?.type ?? 'UNKNOWN'
      ).toUpperCase();

      let eventJson: string;
      try {
        eventJson = JSON.stringify(event);
      } catch {
        eventJson = JSON.stringify({ eid, raw: '[non-serializable event]' });
      }

      await telemetryDbService.insert({
        event_id: uuidv4(),
        event: eventJson,
        event_type: eid,
        timestamp: typeof event?.ets === 'number' ? event.ets : Date.now(),
        priority: 1,
        synced: 0,
      });
    } catch (err) {
      console.error('[TelemetryService] Failed to save event:', err);
    }
  }
}

export const telemetryService = new TelemetryService();
