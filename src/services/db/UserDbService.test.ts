import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserDbService, type User } from './UserDbService';
import { DatabaseService } from './DatabaseService';
import { KeyValueDbService, KVKey } from './KeyValueDbService';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./DatabaseService', () => ({ DatabaseService: vi.fn(), databaseService: {} }));

function makeMockDb() {
  return {
    select: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
  } as unknown as DatabaseService;
}

function makeMockKv() {
  return {
    get: vi.fn().mockResolvedValue(null),
  } as unknown as KeyValueDbService;
}

const sampleUser: User = {
  id: 'user-1',
  details: { displayName: 'Alice', email: 'alice@example.com' },
  user_type: 'GOOGLE',
  created_on: 1000,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('UserDbService', () => {
  let db: DatabaseService;
  let kv: KeyValueDbService;
  let svc: UserDbService;

  beforeEach(() => {
    db = makeMockDb();
    kv = makeMockKv();
    svc = new UserDbService(db, kv);
  });

  // ── upsert ─────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('inserts with REPLACE and serialises details as JSON', async () => {
      await svc.upsert(sampleUser);
      expect(db.insert).toHaveBeenCalledWith(
        'users',
        {
          id: 'user-1',
          details: JSON.stringify(sampleUser.details),
          user_type: 'GOOGLE',
          created_on: 1000,
        },
        'REPLACE'
      );
    });
  });

  // ── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns parsed User when found', async () => {
      vi.mocked(db.select).mockResolvedValue([
        {
          id: 'user-1',
          details: JSON.stringify(sampleUser.details),
          user_type: 'GOOGLE',
          created_on: 1000,
        },
      ]);
      const user = await svc.getById('user-1');
      expect(user).toEqual(sampleUser);
      expect(db.select).toHaveBeenCalledWith('users', { where: { eq: { id: 'user-1' } } });
    });

    it('returns null when not found', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.getById('unknown')).toBeNull();
    });

    it('returns empty details when details JSON is invalid', async () => {
      vi.mocked(db.select).mockResolvedValue([
        { id: 'user-1', details: 'bad-json', user_type: 'GUEST', created_on: 0 },
      ]);
      const user = await svc.getById('user-1');
      expect(user?.details).toEqual({});
    });
  });

  // ── getActive ──────────────────────────────────────────────────────────────

  describe('getActive', () => {
    it('returns null when no active user ID in KV store', async () => {
      vi.mocked(kv.get).mockResolvedValue(null);
      expect(await svc.getActive()).toBeNull();
    });

    it('fetches by the ID stored in KV store', async () => {
      vi.mocked(kv.get).mockResolvedValue('user-1');
      vi.mocked(db.select).mockResolvedValue([
        { id: 'user-1', details: '{}', user_type: 'GOOGLE', created_on: 1000 },
      ]);
      const user = await svc.getActive();
      expect(kv.get).toHaveBeenCalledWith(KVKey.LAST_ACTIVE_USER_ID);
      expect(user?.id).toBe('user-1');
    });
  });

  // ── updateDetails ──────────────────────────────────────────────────────────

  describe('updateDetails', () => {
    it('merges patch into existing details and persists', async () => {
      vi.mocked(db.select).mockResolvedValue([
        { id: 'user-1', details: '{"displayName":"Alice"}', user_type: 'GOOGLE', created_on: 1000 },
      ]);
      await svc.updateDetails('user-1', { email: 'alice@test.com', district: 'Delhi' });
      expect(db.update).toHaveBeenCalledWith(
        'users',
        { details: JSON.stringify({ displayName: 'Alice', email: 'alice@test.com', district: 'Delhi' }) },
        { eq: { id: 'user-1' } }
      );
    });

    it('overwrites existing field when same key is patched', async () => {
      vi.mocked(db.select).mockResolvedValue([
        { id: 'user-1', details: '{"displayName":"Alice"}', user_type: 'GOOGLE', created_on: 1000 },
      ]);
      await svc.updateDetails('user-1', { displayName: 'Bob' });
      const [, data] = vi.mocked(db.update).mock.calls[0];
      expect(JSON.parse(data.details as string).displayName).toBe('Bob');
    });

    it('is a no-op when user does not exist', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      await svc.updateDetails('ghost', { displayName: 'Ghost' });
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes by id', async () => {
      await svc.delete('user-1');
      expect(db.delete).toHaveBeenCalledWith('users', { eq: { id: 'user-1' } });
    });
  });
});
