import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'sunbird_spark';
const SCHEMA_VERSION = 5;

// ── Allowlisted identifiers (guards against SQL injection via identifiers) ────

const ALLOWED_TABLES = new Set([
  'key_value',
  'users',
  'telemetry',
  'enrolled_courses',
  'configs',
  'download_queue',
  'content',
  'network_queue',
  'course_assessment',
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
  `CREATE TABLE IF NOT EXISTS download_queue (
  identifier        TEXT PRIMARY KEY,
  parent_identifier TEXT,
  download_url      TEXT NOT NULL,
  filename          TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  file_path         TEXT,
  state             TEXT NOT NULL,
  progress          INTEGER NOT NULL DEFAULT 0,
  bytes_downloaded  INTEGER NOT NULL DEFAULT 0,
  total_bytes       INTEGER NOT NULL DEFAULT 0,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  max_retries       INTEGER NOT NULL DEFAULT 3,
  last_error        TEXT,
  content_meta      TEXT,
  priority          INTEGER NOT NULL DEFAULT 0,
  cancelled_by_user INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_download_queue_state ON download_queue(state)`,
  `CREATE INDEX IF NOT EXISTS idx_download_queue_parent ON download_queue(parent_identifier)`,
  `CREATE TABLE IF NOT EXISTS content (
  identifier             TEXT PRIMARY KEY,
  server_data            TEXT,
  local_data             TEXT,
  mime_type              TEXT,
  path                   TEXT,
  visibility             TEXT,
  server_last_updated_on TEXT,
  local_last_updated_on  TEXT,
  ref_count              INTEGER NOT NULL DEFAULT 1,
  content_state          INTEGER NOT NULL DEFAULT 2,
  content_type           TEXT,
  audience               TEXT DEFAULT 'Learner',
  size_on_device         INTEGER NOT NULL DEFAULT 0,
  pragma                 TEXT DEFAULT '',
  manifest_version       TEXT,
  dialcodes              TEXT DEFAULT '',
  child_nodes            TEXT DEFAULT '',
  primary_category       TEXT DEFAULT ''
)`,
  `CREATE INDEX IF NOT EXISTS idx_content_state ON content(content_state)`,
  `CREATE TABLE IF NOT EXISTS network_queue (
  _id           INTEGER PRIMARY KEY AUTOINCREMENT,
  msg_id        TEXT    UNIQUE NOT NULL,
  type          TEXT    NOT NULL,
  priority      INTEGER NOT NULL DEFAULT 2,
  timestamp     INTEGER NOT NULL,
  data          TEXT    NOT NULL,
  item_count    INTEGER NOT NULL DEFAULT 0,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  max_retries   INTEGER NOT NULL DEFAULT 5,
  next_retry_at INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  status        TEXT    NOT NULL DEFAULT 'PENDING'
)`,
  `CREATE INDEX IF NOT EXISTS idx_nq_status_priority ON network_queue(status, priority, next_retry_at)`,
  `CREATE TABLE IF NOT EXISTS course_assessment (
  _id              INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_event TEXT    NOT NULL,
  content_id       TEXT    NOT NULL,
  created_at       INTEGER NOT NULL,
  uid              TEXT    NOT NULL,
  course_id        TEXT    NOT NULL,
  batch_id         TEXT    NOT NULL,
  attempt_id       TEXT    NOT NULL DEFAULT ''
)`,
  `CREATE INDEX IF NOT EXISTS idx_ca_context ON course_assessment(uid, course_id, batch_id, content_id)`,
];

export class DatabaseService {
  private static instance: DatabaseService;
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private initialized = false;
  /** Shared promise so concurrent callers all wait on the same init run. */
  private initPromise: Promise<void> | null = null;

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
    // Concurrent callers share one in-flight promise instead of each racing
    // through the connection-creation logic simultaneously.
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize().finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    // Re-check after acquiring the shared promise slot — a concurrent caller
    // may have finished by the time we get here.
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
        try {
          this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
        } catch (createErr: any) {
          // The plugin can report the connection as absent yet still hold it
          // internally (e.g. after a failed previous init). Recover gracefully.
          const msg: string = createErr?.message ?? String(createErr);
          if (msg.includes('already exists')) {
            this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
          } else {
            throw createErr;
          }
        }
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
    // Use run() for transaction control — execute() in CapacitorSQLite v7 wraps
    // its own BEGIN/COMMIT around every call (transaction = true by default),
    // which makes db.execute('BEGIN;') a no-op and db.execute('COMMIT;') throw
    // "Cannot perform this operation because there is no current transaction".
    await db.run('BEGIN', [], false);
    try {
      const result = await fn();
      await db.run('COMMIT', [], false);
      return result;
    } catch (err) {
      await db.run('ROLLBACK', [], false).catch(() => {});
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
    // Pass false so CapacitorSQLite does not auto-wrap in BEGIN/COMMIT.
    // Standalone calls rely on SQLite autocommit; calls inside
    // DatabaseService.transaction() use the manually issued BEGIN/COMMIT.
    await db.run(
      `INSERT${conflictClause} INTO ${table} (${cols}) VALUES (${placeholders})`,
      values,
      false
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
    await db.run(`UPDATE ${table} SET ${setCols} ${clause}`, [...setParams, ...params], false);
  }

  /** DELETE rows matching `where`. Omit `where` to delete all rows. */
  async delete(table: string, where?: WhereClause): Promise<void> {
    assertTable(table);
    const db = this.getDb();
    const { clause, params } = this.buildWhere(where);
    await db.run(`DELETE FROM ${table}${clause ? ` ${clause}` : ''}`, params, false);
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
    // execute() in CapacitorSQLite v7 defaults to transaction=true which wraps
    // each call in its own BEGIN/COMMIT. Use run() with transaction=false so
    // each DDL statement runs directly without conflicting transaction nesting.
    for (const stmt of SCHEMA_STATEMENTS) {
      await db.run(stmt, [], false);
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
      // Execute each migration inside its own version guard so it runs exactly
      // once per install. Use db.run(sql, [], false) — not db.execute() — to
      // avoid CapacitorSQLite v7 auto-transaction wrapping.

      if (currentVersion < 3) {
        await db.run(`CREATE TABLE IF NOT EXISTS network_queue (
          _id           INTEGER PRIMARY KEY AUTOINCREMENT,
          msg_id        TEXT    UNIQUE NOT NULL,
          type          TEXT    NOT NULL,
          priority      INTEGER NOT NULL DEFAULT 2,
          timestamp     INTEGER NOT NULL,
          data          TEXT    NOT NULL,
          item_count    INTEGER NOT NULL DEFAULT 0,
          retry_count   INTEGER NOT NULL DEFAULT 0,
          max_retries   INTEGER NOT NULL DEFAULT 5,
          next_retry_at INTEGER NOT NULL DEFAULT 0,
          last_error    TEXT,
          status        TEXT    NOT NULL DEFAULT 'PENDING'
        )`, [], false);
        await db.run(
          `CREATE INDEX IF NOT EXISTS idx_nq_status_priority
             ON network_queue(status, priority, next_retry_at)`,
          [], false
        );
        await db.run(`CREATE TABLE IF NOT EXISTS course_assessment (
          _id              INTEGER PRIMARY KEY AUTOINCREMENT,
          assessment_event TEXT    NOT NULL,
          content_id       TEXT    NOT NULL,
          created_at       INTEGER NOT NULL,
          uid              TEXT    NOT NULL,
          course_id        TEXT    NOT NULL,
          batch_id         TEXT    NOT NULL,
          attempt_id       TEXT    NOT NULL DEFAULT ''
        )`, [], false);
        await db.run(
          `CREATE INDEX IF NOT EXISTS idx_ca_context
             ON course_assessment(uid, course_id, batch_id, content_id)`,
          [], false
        );
      }

      if (currentVersion < 4) {
        // Add attempt_id to course_assessment for crash-safe idempotent aggregation.
        // ALTER TABLE is additive-only and safe to run against existing rows.
        await db.run(
          `ALTER TABLE course_assessment ADD COLUMN attempt_id TEXT NOT NULL DEFAULT ''`,
          [], false
        ).catch(() => {
          // Column already exists (e.g. fresh install that created the table with the
          // new schema from SCHEMA_STATEMENTS above). Safe to ignore.
        });
      }

      if (currentVersion < 5) {
        // v5: No DDL change. UserService now stores the full profile object
        // (including organisations[]) in users.details instead of select fields only.
        // Version bump documents the behavioural change.
      }

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
