import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'sunbird_spark';
const SCHEMA_VERSION = 1;

// ── Allowlisted identifiers (guards against SQL injection via identifiers) ────

const ALLOWED_TABLES = new Set([
  'key_value',
  'users',
  'telemetry',
  'enrolled_courses',
  'configs',
]);

function assertTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`[DatabaseService] Unknown table: "${table}"`);
  }
}

// Only alphanumeric + underscore; prevents injection via identifier interpolation.
const COLUMN_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertColumn(col: string): void {
  if (!COLUMN_REGEX.test(col)) {
    throw new Error(`[DatabaseService] Invalid column name: "${col}"`);
  }
}

// ── Query building types ─────────────────────────────────────────────────────

export interface WhereClause {
  /** col = ? (AND-joined) */
  eq?: Record<string, any>;
  /** col IN (?, ?, …) */
  in?: Record<string, any[]>;
  /** col < ? */
  lt?: Record<string, any>;
  /** col > ? */
  gt?: Record<string, any>;
}

export interface SelectConfig {
  /** Columns to select; defaults to ['*'] */
  columns?: string[];
  where?: WhereClause;
  orderBy?: Array<{ column: string; direction?: 'ASC' | 'DESC' }>;
  limit?: number;
}

// ── Schema ───────────────────────────────────────────────────────────────────
// Explicit array avoids fragile ';' splitting that would break on trigger bodies.

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS key_value (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  details     TEXT NOT NULL,
  user_type   TEXT NOT NULL DEFAULT 'GUEST',
  created_on  INTEGER NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS telemetry (
  event_id    TEXT PRIMARY KEY,
  event       TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 1,
  synced      INTEGER NOT NULL DEFAULT 0
)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_pending ON telemetry(synced, timestamp)`,
  `CREATE TABLE IF NOT EXISTS enrolled_courses (
  course_id     TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  details       TEXT NOT NULL,
  enrolled_on   INTEGER NOT NULL,
  progress      INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  PRIMARY KEY (course_id, user_id)
)`,
  `CREATE INDEX IF NOT EXISTS idx_enrolled_courses_user ON enrolled_courses(user_id)`,
  `CREATE TABLE IF NOT EXISTS configs (
  config_key    TEXT PRIMARY KEY,
  config_type   TEXT NOT NULL,
  data          TEXT NOT NULL,
  fetched_on    INTEGER NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_configs_type ON configs(config_type)`,
];

export class DatabaseService {
  private static instance: DatabaseService;
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private initialized = false;

  private constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const platform = Capacitor.getPlatform();

      if (platform === 'web') {
        await this.sqlite.initWebStore();
      }

      const isConnection = (await this.sqlite.isConnection(DB_NAME, false)).result;

      if (isConnection) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
      }

      await this.db.open();
      await this.runSchema();
      await this.applyVersionGuard();

      this.initialized = true;
      console.debug('[DatabaseService] initialized, version=' + SCHEMA_VERSION);
    } catch (error) {
      console.error('[DatabaseService] initialization failed:', error);
      this.db = null;
      this.initialized = false;
      throw error;
    }
  }

  getDb(): SQLiteDBConnection {
    if (!this.db || !this.initialized) {
      throw new Error('[DatabaseService] not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // ── Transactions ────────────────────────────────────────────────────────────

  /** Wrap multiple operations in a single SQLite transaction. */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const db = this.getDb();
    await db.execute('BEGIN;');
    try {
      const result = await fn();
      await db.execute('COMMIT;');
      return result;
    } catch (err) {
      await db.execute('ROLLBACK;');
      throw err;
    }
  }

  // ── Generic CRUD ───────────────────────────────────────────────────────────

  /** SELECT rows from a table. Returns typed row objects. */
  async select<T = Record<string, any>>(table: string, config?: SelectConfig): Promise<T[]> {
    assertTable(table);
    const db = this.getDb();
    const cols = config?.columns?.join(', ') ?? '*';
    const { clause, params } = this.buildWhere(config?.where);

    let sql = `SELECT ${cols} FROM ${table}`;
    if (clause) sql += ` ${clause}`;
    if (config?.orderBy?.length) {
      const order = config.orderBy
        .map(o => { assertColumn(o.column); return `${o.column} ${o.direction ?? 'ASC'}`; })
        .join(', ');
      sql += ` ORDER BY ${order}`;
    }
    if (config?.limit !== undefined) sql += ` LIMIT ${config.limit}`;

    const result = await db.query(sql, params);
    return (result.values ?? []) as T[];
  }

  /**
   * INSERT a row.
   * @param conflict 'REPLACE' → INSERT OR REPLACE, 'IGNORE' → INSERT OR IGNORE,
   *                 'ABORT' (default) → plain INSERT
   */
  async insert(
    table: string,
    data: Record<string, any>,
    conflict: 'REPLACE' | 'IGNORE' | 'ABORT' = 'ABORT'
  ): Promise<void> {
    assertTable(table);
    const db = this.getDb();
    const keys = Object.keys(data);
    keys.forEach(assertColumn);
    const cols = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(data);
    const conflictClause = conflict !== 'ABORT' ? ` OR ${conflict}` : '';
    await db.run(
      `INSERT${conflictClause} INTO ${table} (${cols}) VALUES (${placeholders})`,
      values
    );
  }

  /** UPDATE rows matching `where` with the fields in `data`. */
  async update(
    table: string,
    data: Record<string, any>,
    where: WhereClause
  ): Promise<void> {
    assertTable(table);
    const db = this.getDb();
    const setCols = Object.keys(data).map(col => { assertColumn(col); return `${col} = ?`; }).join(', ');
    const setParams = Object.values(data);
    const { clause, params } = this.buildWhere(where);
    if (!clause) throw new Error('[DatabaseService] UPDATE requires a WHERE clause');
    await db.run(`UPDATE ${table} SET ${setCols} ${clause}`, [...setParams, ...params]);
  }

  /** DELETE rows matching `where`. Omit `where` to delete all rows. */
  async delete(table: string, where?: WhereClause): Promise<void> {
    assertTable(table);
    const db = this.getDb();
    const { clause, params } = this.buildWhere(where);
    await db.run(`DELETE FROM ${table}${clause ? ` ${clause}` : ''}`, params);
  }

  /** SELECT COUNT(*) matching optional `where`. */
  async count(table: string, where?: WhereClause): Promise<number> {
    // assertTable is called inside select()
    const rows = await this.select<{ count: number }>(table, {
      columns: ['COUNT(*) as count'],
      where,
    });
    return rows.length > 0 ? rows[0].count : 0;
  }

  // ── WHERE builder ──────────────────────────────────────────────────────────

  private buildWhere(where?: WhereClause): { clause: string; params: any[] } {
    if (!where) return { clause: '', params: [] };
    const parts: string[] = [];
    const params: any[] = [];

    if (where.eq) {
      for (const [col, val] of Object.entries(where.eq)) {
        assertColumn(col);
        parts.push(`${col} = ?`);
        params.push(val);
      }
    }
    if (where.lt) {
      for (const [col, val] of Object.entries(where.lt)) {
        assertColumn(col);
        parts.push(`${col} < ?`);
        params.push(val);
      }
    }
    if (where.gt) {
      for (const [col, val] of Object.entries(where.gt)) {
        assertColumn(col);
        parts.push(`${col} > ?`);
        params.push(val);
      }
    }
    if (where.in) {
      for (const [col, vals] of Object.entries(where.in)) {
        assertColumn(col);
        const placeholders = vals.map(() => '?').join(', ');
        parts.push(`${col} IN (${placeholders})`);
        params.push(...vals);
      }
    }

    return {
      clause: parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '',
      params,
    };
  }

  async close(): Promise<void> {
    if (this.db && this.initialized) {
      await this.db.close();
      await this.sqlite.closeConnection(DB_NAME, false);
      this.db = null;
      this.initialized = false;
    }
  }

  private async runSchema(): Promise<void> {
    const db = this.db!;
    for (const stmt of SCHEMA_STATEMENTS) {
      await db.execute(stmt + ';');
    }
  }

  private async applyVersionGuard(): Promise<void> {
    const db = this.db!;
    const result = await db.query(
      'SELECT value FROM key_value WHERE key = ?',
      ['schema_version']
    );
    const rows = result.values ?? [];
    const currentVersion = rows.length > 0 ? parseInt(rows[0].value, 10) : 0;

    if (currentVersion < SCHEMA_VERSION) {
      // ── Run migrations ────────────────────────────────────────────────────
      // TODO: Add ALTER TABLE / data migrations here whenever SCHEMA_VERSION is
      // bumped. Execute each migration inside its own version guard so it runs
      // exactly once per install. Example:
      //   if (currentVersion < 2) {
      //     await db.execute('ALTER TABLE telemetry ADD COLUMN source TEXT;');
      //   }
      const now = Date.now();
      await db.run(
        'INSERT OR REPLACE INTO key_value (key, value, updated_at) VALUES (?, ?, ?)',
        ['schema_version', String(SCHEMA_VERSION), now]
      );
    }
  }
}

// Importing this module is side-effect-free: getInstance() only allocates the
// SQLiteConnection wrapper — no I/O occurs until initialize() is called.
export const databaseService = DatabaseService.getInstance();
