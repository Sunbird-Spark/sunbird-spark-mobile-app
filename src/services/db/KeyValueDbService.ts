import { DatabaseService, databaseService } from './DatabaseService';

export enum KVKey {
  APP_LANGUAGE            = 'app_language',           // SDK: SELECTED_LANGUAGE_CODE
  ONBOARDING_COMPLETED    = 'onboarding_completed',   // SDK: IS_ONBOARDING_COMPLETED
  LAST_ACTIVE_USER_ID     = 'last_active_user_id',    // SDK: last played content uid
  TELEMETRY_SYNC_LAST_RUN = 'telemetry_sync_last_run',// SDK: KEY_LAST_SYNCED_TIME_STAMP
  ACTIVE_CHANNEL_ID       = 'active_channel_id',      // SDK: ACTIVE_CHANNEL_ID in SharedPreferences
  // ── Offline sync queues (persistent across sessions) ────────────────────────
  TELEMETRY_SYNC_NETWORK_TYPE  = 'telemetry_sync_network_type',  // User preference: off | wifi | always
  CONTENT_DOWNLOAD_NETWORK_TYPE = 'content_download_network_type', // User preference: wifi | always
  TELEMETRY_CLOCK_OFFSET       = 'telemetry_clock_offset',        // Persisted server-client clock skew (ms)
  QR_SCANNER_PREFERENCE        = 'qr_scanner_preference',         // User preference: enabled | disabled
}

export class KeyValueDbService {
  constructor(private db: DatabaseService) {}

  async set(key: KVKey, value: string): Promise<void> {
    await this.db.insert(
      'key_value',
      { key, value, updated_at: Date.now() },
      'REPLACE'
    );
  }

  async get(key: KVKey): Promise<string | null> {
    const rows = await this.db.select<{ value: string }>(
      'key_value',
      { columns: ['value'], where: { eq: { key } } }
    );
    return rows.length > 0 ? rows[0].value : null;
  }

  async getJSON<T>(key: KVKey): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: KVKey, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }

  async delete(key: KVKey): Promise<void> {
    await this.db.delete('key_value', { eq: { key } });
  }

  /**
   * Store a value under a dynamic (non-enum) key.
   * Convention: prefix dynamic per-entity cache keys with 'cache:' (e.g. 'cache:channel_{id}')
   * to avoid accidental collisions with KVKey enum values.
   */
  async setRaw(key: string, value: string): Promise<void> {
    await this.db.insert('key_value', { key, value, updated_at: Date.now() }, 'REPLACE');
  }

  async getRaw(key: string): Promise<string | null> {
    const rows = await this.db.select<{ value: string }>(
      'key_value',
      { columns: ['value'], where: { eq: { key } } }
    );
    return rows.length > 0 ? rows[0].value : null;
  }

  /**
   * Delete all key_value rows whose key starts with `prefix`.
   * Used to bulk-remove dynamic cache entries (e.g. 'cache:content_state_{userId}_').
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    await this.db.getDb().run(
      'DELETE FROM key_value WHERE key LIKE ?',
      [`${prefix}%`]
    );
  }
}

export const keyValueDbService = new KeyValueDbService(databaseService);
