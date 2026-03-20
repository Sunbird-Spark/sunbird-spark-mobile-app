import { DatabaseService, databaseService } from './DatabaseService';

export type ConfigType = 'channel' | 'framework' | 'form' | 'system_settings' | 'org';

export const CONFIG_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ConfigEntry {
  configKey: string;
  configType: ConfigType;
  data: object;
  fetchedOn: number;
}

export class ConfigDbService {
  constructor(private db: DatabaseService) {}

  async set(configKey: string, configType: ConfigType, data: object): Promise<void> {
    await this.db.insert(
      'configs',
      {
        config_key: configKey,
        config_type: configType,
        data: JSON.stringify(data),
        fetched_on: Date.now(),
      },
      'REPLACE'
    );
  }

  async get(configKey: string): Promise<{ data: object; fetchedOn: number } | null> {
    const rows = await this.db.select<{ data: string; fetched_on: number }>(
      'configs',
      { columns: ['data', 'fetched_on'], where: { eq: { config_key: configKey } } }
    );
    if (rows.length === 0) return null;
    try {
      return { data: JSON.parse(rows[0].data), fetchedOn: rows[0].fetched_on };
    } catch {
      return null;
    }
  }

  async getByType(configType: ConfigType): Promise<ConfigEntry[]> {
    const rows = await this.db.select<any>(
      'configs',
      { where: { eq: { config_type: configType } } }
    );
    return rows.map(row => {
      let data: object = {};
      try { data = JSON.parse(row.data); } catch { data = {}; }
      return {
        configKey: row.config_key,
        configType: row.config_type as ConfigType,
        data,
        fetchedOn: row.fetched_on,
      };
    });
  }

  // Cheap single-column read — does not deserialise data
  async isStale(configKey: string, ttlMs: number = CONFIG_TTL_MS): Promise<boolean> {
    const rows = await this.db.select<{ fetched_on: number }>(
      'configs',
      { columns: ['fetched_on'], where: { eq: { config_key: configKey } } }
    );
    if (rows.length === 0) return true; // not in cache → treat as stale
    return Date.now() - rows[0].fetched_on >= ttlMs;
  }

  async deleteByType(configType: ConfigType): Promise<void> {
    await this.db.delete('configs', { eq: { config_type: configType } });
  }

  async delete(configKey: string): Promise<void> {
    await this.db.delete('configs', { eq: { config_key: configKey } });
  }
}

export const configDbService = new ConfigDbService(databaseService);
