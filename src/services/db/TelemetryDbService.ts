import { DatabaseService, databaseService } from './DatabaseService';

export interface TelemetryEvent {
  event_id: string;
  event: string;
  event_type: string;
  timestamp: number;
  priority: number;
  synced: number;
}

export class TelemetryDbService {
  constructor(private db: DatabaseService) {}

  async insert(event: TelemetryEvent): Promise<void> {
    await this.db.insert(
      'telemetry',
      {
        event_id: event.event_id,
        event: event.event,
        event_type: event.event_type,
        timestamp: event.timestamp,
        priority: event.priority,
        synced: event.synced,
      },
      'IGNORE'
    );
  }

  async insertBatch(events: TelemetryEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.db.transaction(async () => {
      for (const event of events) {
        await this.insert(event);
      }
    });
  }

  async getPending(limit = 100): Promise<TelemetryEvent[]> {
    const rows = await this.db.select<any>('telemetry', {
      where: { eq: { synced: 0 } },
      orderBy: [
        { column: 'priority', direction: 'DESC' },
        { column: 'timestamp', direction: 'ASC' },
      ],
      limit,
    });
    return rows.map(row => ({
      event_id: row.event_id,
      event: row.event,
      event_type: row.event_type,
      timestamp: row.timestamp,
      priority: row.priority,
      synced: row.synced,
    }));
  }

  async markSynced(eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    await this.db.update(
      'telemetry',
      { synced: 1 },
      { in: { event_id: eventIds } }
    );
  }

  async deleteOlderThan(days: number): Promise<void> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    await this.db.delete('telemetry', {
      eq: { synced: 1 },
      lt: { timestamp: cutoff },
    });
  }

  async getPendingCount(): Promise<number> {
    return this.db.count('telemetry', { eq: { synced: 0 } });
  }
}

export const telemetryDbService = new TelemetryDbService(databaseService);
