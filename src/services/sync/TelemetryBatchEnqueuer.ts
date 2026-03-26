import { v4 as uuidv4 } from 'uuid';
import { telemetryDbService } from '../db/TelemetryDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { deviceService } from '../device/deviceService';
import { gzipCompress, gzipStringToBase64 } from './compression';
import { syncConfig } from './SyncConfig';
import { NetworkQueueType } from './types';

export class TelemetryBatchEnqueuer {
  /**
   * Read up to batchSize pending telemetry events, gzip-compress them, and
   * insert one network_queue row. Marks the source rows synced=1 immediately
   * so the telemetry table is purely a staging buffer.
   *
   * @returns number of events enqueued (0 = nothing to process)
   */
  async processBatch(): Promise<number> {
    const batchSize = syncConfig.getSyncBatchSize();
    const rows = await telemetryDbService.getPending(batchSize);
    if (rows.length === 0) return 0;

    const events = rows.map(r => {
      try { return JSON.parse(r.event); } catch { return null; }
    }).filter(Boolean);

    if (events.length === 0) return 0;

    const did = await deviceService.getHashedDeviceId().catch(() => '');

    const envelope = {
      id:     'api.sunbird.telemetry',
      ver:    '3.0',
      ets:    Date.now(),
      events,
      params: {
        did,
        msgid: uuidv4(),
      },
    };

    const data = gzipStringToBase64(gzipCompress(JSON.stringify(envelope)));

    await networkQueueDbService.insert({
      type:       NetworkQueueType.TELEMETRY,
      priority:   2,
      timestamp:  Date.now(),
      data,
      item_count: events.length,
    });

    // Mark source rows synced=1 immediately — network_queue is the durability layer
    await telemetryDbService.markSynced(rows.map(r => r.event_id));

    return events.length;
  }

  async hasThresholdCrossed(): Promise<boolean> {
    const count = await telemetryDbService.getPendingCount();
    return count >= syncConfig.getSyncThreshold();
  }

  async getPendingCount(): Promise<number> {
    return telemetryDbService.getPendingCount();
  }
}

export const telemetryBatchEnqueuer = new TelemetryBatchEnqueuer();
