import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyValueDbService, KVKey } from './KeyValueDbService';
import { DatabaseService } from './DatabaseService';

vi.mock('./DatabaseService', () => ({
  DatabaseService: vi.fn(),
  databaseService: {},
}));

function makeMockDb() {
  return {
    select: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
  } as unknown as DatabaseService;
}

describe('KeyValueDbService', () => {
  let db: DatabaseService;
  let svc: KeyValueDbService;

  beforeEach(() => {
    db = makeMockDb();
    svc = new KeyValueDbService(db);
  });

  // ── set ────────────────────────────────────────────────────────────────────

  describe('set', () => {
    it('calls insert with REPLACE and correct data', async () => {
      const before = Date.now();
      await svc.set(KVKey.APP_LANGUAGE, 'en');
      const after = Date.now();

      expect(db.insert).toHaveBeenCalledOnce();
      const [table, data, conflict] = vi.mocked(db.insert).mock.calls[0];
      expect(table).toBe('key_value');
      expect(data.key).toBe(KVKey.APP_LANGUAGE);
      expect(data.value).toBe('en');
      expect(data.updated_at).toBeGreaterThanOrEqual(before);
      expect(data.updated_at).toBeLessThanOrEqual(after);
      expect(conflict).toBe('REPLACE');
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the stored value', async () => {
      vi.mocked(db.select).mockResolvedValue([{ value: 'hello' }]);
      const result = await svc.get(KVKey.APP_LANGUAGE);
      expect(result).toBe('hello');
      expect(db.select).toHaveBeenCalledWith('key_value', {
        columns: ['value'],
        where: { eq: { key: KVKey.APP_LANGUAGE } },
      });
    });

    it('returns null when key not found', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      const result = await svc.get(KVKey.APP_LANGUAGE);
      expect(result).toBeNull();
    });
  });

  // ── getJSON ────────────────────────────────────────────────────────────────

  describe('getJSON', () => {
    it('parses and returns JSON value', async () => {
      vi.mocked(db.select).mockResolvedValue([{ value: '{"foo":1}' }]);
      const result = await svc.getJSON<{ foo: number }>(KVKey.APP_LANGUAGE);
      expect(result).toEqual({ foo: 1 });
    });

    it('returns null when key not found', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      const result = await svc.getJSON(KVKey.APP_LANGUAGE);
      expect(result).toBeNull();
    });

    it('returns null when value is invalid JSON', async () => {
      vi.mocked(db.select).mockResolvedValue([{ value: 'not-json' }]);
      const result = await svc.getJSON(KVKey.APP_LANGUAGE);
      expect(result).toBeNull();
    });
  });

  // ── setJSON ────────────────────────────────────────────────────────────────

  describe('setJSON', () => {
    it('stringifies and calls insert', async () => {
      await svc.setJSON(KVKey.APP_LANGUAGE, { locale: 'en-IN' });
      const [, data] = vi.mocked(db.insert).mock.calls[0];
      expect(data.value).toBe(JSON.stringify({ locale: 'en-IN' }));
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('calls delete with correct where clause', async () => {
      await svc.delete(KVKey.LAST_ACTIVE_USER_ID);
      expect(db.delete).toHaveBeenCalledWith('key_value', {
        eq: { key: KVKey.LAST_ACTIVE_USER_ID },
      });
    });
  });
});
