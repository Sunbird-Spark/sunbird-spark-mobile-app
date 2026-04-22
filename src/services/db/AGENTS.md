# Database Services — Agent Guide

## What Lives Here

SQLite database access layer. One service per table, plus `DatabaseService` which owns the connection.

```
db/
  DatabaseService.ts              # Opens and migrates the SQLite database
  ContentDbService.ts             # content table — downloaded content metadata
  DownloadDbService.ts            # download_queue table — active/pending downloads
  EnrolledCoursesDbService.ts     # enrolled_courses table — enrollments and progress
  UserDbService.ts                # users table — cached user profiles
  KeyValueDbService.ts            # key_value table — generic config / feature flag cache
  TelemetryDbService.ts           # telemetry table — staged telemetry events
  NetworkQueueDbService.ts        # network_queue table — staged API requests
  CourseAssessmentDbService.ts    # course_assessment table — assessment events
  ConfigDbService.ts              # Reads config entries from key_value
  index.ts                        # Re-exports all DB service singletons
```

---

## Schema

Database name: `sunbird_spark`, schema version 5.

| Table | Key columns / notes |
|---|---|
| `content` | `content_state = 2` means downloaded and available offline |
| `download_queue` | Progress percentage, retry count, status |
| `enrolled_courses` | Enrollment status, completion percentage |
| `users` | `details` column stores the full profile as JSON |
| `key_value` | Generic `key` / `value` string pairs |
| `telemetry` | JSON event payloads pending sync |
| `network_queue` | Serialised API requests pending replay |
| `course_assessment` | Assessment event batches pending submission |

---

## Architecture Notes

- `DatabaseService` is the only place that opens the SQLite connection. All other DB services receive the connection through it.
- Schema migrations run on `DatabaseService.initialize()`, which is called once during app startup by `AppInitializer`.
- All DB operations use explicit null checks — do not rely on TypeScript's type system to catch missing rows.

---

## Testing

DB service tests use `vi.hoisted()` to create shared mock objects and mock the `SQLiteConnection` constructor so no real database is opened:

```typescript
const { mockDb } = vi.hoisted(() => ({
  mockDb: { query: vi.fn(), run: vi.fn() }
}));

vi.mock('@capacitor-community/sqlite', () => ({
  SQLiteConnection: vi.fn().mockImplementation(() => mockDb)
}));

beforeEach(() => {
  (DatabaseService as any).instance = undefined;
  vi.clearAllMocks();
});
```
