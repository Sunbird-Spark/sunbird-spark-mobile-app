import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from './DatabaseService';

// ── Hoisted mocks (must be available inside vi.mock factories) ───────────────

const { mockConn, mockSQLiteConnection } = vi.hoisted(() => {
  const mockConn = {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ values: [] }),
    run: vi.fn().mockResolvedValue(undefined),
  };

  const mockSQLiteConnection = {
    isConnection: vi.fn().mockResolvedValue({ result: false }),
    createConnection: vi.fn().mockResolvedValue(mockConn),
    retrieveConnection: vi.fn().mockResolvedValue(mockConn),
    initWebStore: vi.fn().mockResolvedValue(undefined),
    closeConnection: vi.fn().mockResolvedValue(undefined),
  };

  return { mockConn, mockSQLiteConnection };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: vi.fn().mockReturnValue('ios') },
}));

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  // Must use a regular function (not arrow) to be usable as a constructor via `new`
  SQLiteConnection: vi.fn(function () { return mockSQLiteConnection; }),
  SQLiteDBConnection: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitializedService(): DatabaseService {
  (DatabaseService as any).instance = undefined;
  const svc = DatabaseService.getInstance();
  (svc as any).db = mockConn;
  (svc as any).initialized = true;
  return svc;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConn.query.mockResolvedValue({ values: [] });
    mockConn.run.mockResolvedValue(undefined);
    mockConn.execute.mockResolvedValue(undefined);
  });

  // ── Singleton ──────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
      (DatabaseService as any).instance = undefined;
      const a = DatabaseService.getInstance();
      const b = DatabaseService.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── initialize ─────────────────────────────────────────────────────────────

  describe('initialize', () => {
    beforeEach(() => {
      (DatabaseService as any).instance = undefined;
      mockSQLiteConnection.isConnection.mockResolvedValue({ result: false });
      mockConn.query.mockResolvedValue({ values: [] });
    });

    it('opens a new connection when none exists', async () => {
      const svc = DatabaseService.getInstance();
      await svc.initialize();
      expect(mockSQLiteConnection.createConnection).toHaveBeenCalledWith(
        'sunbird_spark', false, 'no-encryption', 1, false
      );
      expect(mockConn.open).toHaveBeenCalled();
    });

    it('retrieves existing connection instead of creating a new one', async () => {
      mockSQLiteConnection.isConnection.mockResolvedValue({ result: true });
      const svc = DatabaseService.getInstance();
      await svc.initialize();
      expect(mockSQLiteConnection.retrieveConnection).toHaveBeenCalled();
      expect(mockSQLiteConnection.createConnection).not.toHaveBeenCalled();
    });

    it('is idempotent — second call is a no-op', async () => {
      const svc = DatabaseService.getInstance();
      await svc.initialize();
      await svc.initialize();
      expect(mockConn.open).toHaveBeenCalledTimes(1);
    });

    it('calls initWebStore on web platform', async () => {
      const { Capacitor } = await import('@capacitor/core');
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      const svc = DatabaseService.getInstance();
      await svc.initialize();
      expect(mockSQLiteConnection.initWebStore).toHaveBeenCalled();
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    });

    it('resets initialized flag and throws on error', async () => {
      mockSQLiteConnection.createConnection.mockRejectedValueOnce(new Error('connect fail'));
      const svc = DatabaseService.getInstance();
      await expect(svc.initialize()).rejects.toThrow('connect fail');
      expect((svc as any).initialized).toBe(false);
    });
  });

  // ── getDb ──────────────────────────────────────────────────────────────────

  describe('getDb', () => {
    it('throws when not initialized', () => {
      (DatabaseService as any).instance = undefined;
      const svc = DatabaseService.getInstance();
      expect(() => svc.getDb()).toThrow('[DatabaseService] not initialized');
    });

    it('returns the connection when initialized', () => {
      const svc = getInitializedService();
      expect(svc.getDb()).toBe(mockConn);
    });
  });

  // ── table guard ────────────────────────────────────────────────────────────

  describe('table guard (assertTable)', () => {
    it('throws on unknown table in select', async () => {
      const svc = getInitializedService();
      await expect(svc.select('unknown_table')).rejects.toThrow('Unknown table: "unknown_table"');
    });

    it('throws on unknown table in insert', async () => {
      const svc = getInitializedService();
      await expect(svc.insert('bad_table', { id: 1 })).rejects.toThrow('Unknown table: "bad_table"');
    });

    it('throws on unknown table in update', async () => {
      const svc = getInitializedService();
      await expect(svc.update('bad_table', { x: 1 }, { eq: { id: '1' } })).rejects.toThrow('Unknown table: "bad_table"');
    });

    it('throws on unknown table in delete', async () => {
      const svc = getInitializedService();
      await expect(svc.delete('bad_table')).rejects.toThrow('Unknown table: "bad_table"');
    });

    it('allows all known tables', async () => {
      const svc = getInitializedService();
      const tables = ['key_value', 'users', 'telemetry', 'enrolled_courses', 'configs'];
      for (const table of tables) {
        await expect(svc.select(table)).resolves.not.toThrow();
      }
    });
  });

  // ── SELECT ─────────────────────────────────────────────────────────────────

  describe('select', () => {
    it('selects all columns by default', async () => {
      const svc = getInitializedService();
      mockConn.query.mockResolvedValue({ values: [{ id: 1 }] });
      const rows = await svc.select('users');
      expect(mockConn.query).toHaveBeenCalledWith('SELECT * FROM users', []);
      expect(rows).toEqual([{ id: 1 }]);
    });

    it('selects specific columns', async () => {
      const svc = getInitializedService();
      await svc.select('users', { columns: ['id', 'name'] });
      expect(mockConn.query).toHaveBeenCalledWith('SELECT id, name FROM users', []);
    });

    it('returns empty array when values is null', async () => {
      const svc = getInitializedService();
      mockConn.query.mockResolvedValue({ values: null });
      expect(await svc.select('users')).toEqual([]);
    });

    it('applies eq WHERE clause', async () => {
      const svc = getInitializedService();
      await svc.select('users', { where: { eq: { id: 'abc' } } });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?', ['abc']
      );
    });

    it('AND-joins multiple eq conditions', async () => {
      const svc = getInitializedService();
      await svc.select('enrolled_courses', { where: { eq: { user_id: 'u1', status: 'active' } } });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM enrolled_courses WHERE user_id = ? AND status = ?',
        ['u1', 'active']
      );
    });

    it('applies lt WHERE clause', async () => {
      const svc = getInitializedService();
      await svc.select('telemetry', { where: { lt: { timestamp: 1000 } } });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM telemetry WHERE timestamp < ?', [1000]
      );
    });

    it('applies gt WHERE clause', async () => {
      const svc = getInitializedService();
      await svc.select('telemetry', { where: { gt: { priority: 1 } } });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM telemetry WHERE priority > ?', [1]
      );
    });

    it('applies IN WHERE clause', async () => {
      const svc = getInitializedService();
      await svc.select('telemetry', { where: { in: { event_id: ['a', 'b', 'c'] } } });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM telemetry WHERE event_id IN (?, ?, ?)',
        ['a', 'b', 'c']
      );
    });

    it('combines eq + lt conditions', async () => {
      const svc = getInitializedService();
      await svc.select('telemetry', { where: { eq: { synced: 1 }, lt: { timestamp: 5000 } } });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM telemetry WHERE synced = ? AND timestamp < ?',
        [1, 5000]
      );
    });

    it('applies ORDER BY single column DESC', async () => {
      const svc = getInitializedService();
      await svc.select('enrolled_courses', { orderBy: [{ column: 'enrolled_on', direction: 'DESC' }] });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM enrolled_courses ORDER BY enrolled_on DESC', []
      );
    });

    it('applies ORDER BY multiple columns', async () => {
      const svc = getInitializedService();
      await svc.select('telemetry', {
        where: { eq: { synced: 0 } },
        orderBy: [
          { column: 'priority', direction: 'DESC' },
          { column: 'timestamp', direction: 'ASC' },
        ],
        limit: 100,
      });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM telemetry WHERE synced = ? ORDER BY priority DESC, timestamp ASC LIMIT 100',
        [0]
      );
    });

    it('defaults orderBy direction to ASC', async () => {
      const svc = getInitializedService();
      await svc.select('users', { orderBy: [{ column: 'created_on' }] });
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT * FROM users ORDER BY created_on ASC', []
      );
    });

    it('applies LIMIT without WHERE', async () => {
      const svc = getInitializedService();
      await svc.select('telemetry', { limit: 50 });
      expect(mockConn.query).toHaveBeenCalledWith('SELECT * FROM telemetry LIMIT 50', []);
    });
  });

  // ── INSERT ─────────────────────────────────────────────────────────────────

  describe('insert', () => {
    it('generates plain INSERT by default (ABORT)', async () => {
      const svc = getInitializedService();
      await svc.insert('users', { id: 'u1', name: 'Alice' });
      expect(mockConn.run).toHaveBeenCalledWith(
        'INSERT INTO users (id, name) VALUES (?, ?)', ['u1', 'Alice']
      );
    });

    it('generates INSERT OR REPLACE', async () => {
      const svc = getInitializedService();
      await svc.insert('key_value', { key: 'k', value: 'v', updated_at: 1 }, 'REPLACE');
      expect(mockConn.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO key_value (key, value, updated_at) VALUES (?, ?, ?)',
        ['k', 'v', 1]
      );
    });

    it('generates INSERT OR IGNORE', async () => {
      const svc = getInitializedService();
      await svc.insert('telemetry', { event_id: 'e1', synced: 0 }, 'IGNORE');
      expect(mockConn.run).toHaveBeenCalledWith(
        'INSERT OR IGNORE INTO telemetry (event_id, synced) VALUES (?, ?)',
        ['e1', 0]
      );
    });
  });

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('generates UPDATE with eq WHERE', async () => {
      const svc = getInitializedService();
      await svc.update('users', { details: '{}' }, { eq: { id: 'u1' } });
      expect(mockConn.run).toHaveBeenCalledWith(
        'UPDATE users SET details = ? WHERE id = ?', ['{}', 'u1']
      );
    });

    it('generates UPDATE with multiple SET and WHERE columns', async () => {
      const svc = getInitializedService();
      await svc.update(
        'enrolled_courses',
        { progress: 50, status: 'active' },
        { eq: { course_id: 'c1', user_id: 'u1' } }
      );
      expect(mockConn.run).toHaveBeenCalledWith(
        'UPDATE enrolled_courses SET progress = ?, status = ? WHERE course_id = ? AND user_id = ?',
        [50, 'active', 'c1', 'u1']
      );
    });

    it('generates UPDATE with IN WHERE', async () => {
      const svc = getInitializedService();
      await svc.update('telemetry', { synced: 1 }, { in: { event_id: ['e1', 'e2'] } });
      expect(mockConn.run).toHaveBeenCalledWith(
        'UPDATE telemetry SET synced = ? WHERE event_id IN (?, ?)',
        [1, 'e1', 'e2']
      );
    });

    it('throws when WHERE clause is empty', async () => {
      const svc = getInitializedService();
      await expect(svc.update('users', { details: '{}' }, {}))
        .rejects.toThrow('[DatabaseService] UPDATE requires a WHERE clause');
    });
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('generates DELETE with eq WHERE', async () => {
      const svc = getInitializedService();
      await svc.delete('users', { eq: { id: 'u1' } });
      expect(mockConn.run).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?', ['u1']);
    });

    it('generates DELETE without WHERE when not provided', async () => {
      const svc = getInitializedService();
      await svc.delete('telemetry');
      expect(mockConn.run).toHaveBeenCalledWith('DELETE FROM telemetry', []);
    });

    it('generates DELETE with combined eq + lt', async () => {
      const svc = getInitializedService();
      await svc.delete('telemetry', { eq: { synced: 1 }, lt: { timestamp: 9000 } });
      expect(mockConn.run).toHaveBeenCalledWith(
        'DELETE FROM telemetry WHERE synced = ? AND timestamp < ?',
        [1, 9000]
      );
    });
  });

  // ── COUNT ──────────────────────────────────────────────────────────────────

  describe('count', () => {
    it('returns 0 when no rows returned', async () => {
      const svc = getInitializedService();
      mockConn.query.mockResolvedValue({ values: [{ count: 0 }] });
      expect(await svc.count('telemetry')).toBe(0);
    });

    it('returns the count and generates correct SQL', async () => {
      const svc = getInitializedService();
      mockConn.query.mockResolvedValue({ values: [{ count: 42 }] });
      const n = await svc.count('telemetry', { eq: { synced: 0 } });
      expect(n).toBe(42);
      expect(mockConn.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM telemetry WHERE synced = ?', [0]
      );
    });
  });

  // ── transaction ────────────────────────────────────────────────────────────

  describe('transaction', () => {
    it('executes BEGIN and COMMIT around the callback', async () => {
      const svc = getInitializedService();
      const fn = vi.fn().mockResolvedValue('result');
      const result = await svc.transaction(fn);
      expect(mockConn.execute).toHaveBeenCalledWith('BEGIN;');
      expect(fn).toHaveBeenCalledOnce();
      expect(mockConn.execute).toHaveBeenCalledWith('COMMIT;');
      expect(result).toBe('result');
    });

    it('executes ROLLBACK and rethrows when callback throws', async () => {
      const svc = getInitializedService();
      const err = new Error('insert failed');
      const fn = vi.fn().mockRejectedValue(err);
      await expect(svc.transaction(fn)).rejects.toThrow('insert failed');
      expect(mockConn.execute).toHaveBeenCalledWith('BEGIN;');
      expect(mockConn.execute).toHaveBeenCalledWith('ROLLBACK;');
      expect(mockConn.execute).not.toHaveBeenCalledWith('COMMIT;');
    });
  });

  // ── close ──────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('closes the connection and resets state', async () => {
      const svc = getInitializedService();
      await svc.close();
      expect(mockConn.close).toHaveBeenCalled();
      expect((svc as any).initialized).toBe(false);
      expect((svc as any).db).toBeNull();
    });

    it('is a no-op when not initialized', async () => {
      (DatabaseService as any).instance = undefined;
      const svc = DatabaseService.getInstance();
      await svc.close();
      expect(mockConn.close).not.toHaveBeenCalled();
    });
  });
});
