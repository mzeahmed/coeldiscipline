import type { Migration } from '@/shared/database/migrate';

const DATE_PATTERN = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";

// Literal values on purpose: a published migration never changes, even if the
// domain constants do.
const initialSchema: Migration = [
  `CREATE TABLE goal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT NOT NULL,
    motivation TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN
      ('health', 'learning', 'spirituality', 'work', 'finance', 'other')),
    target_days INTEGER CHECK (target_days > 0),
    start_date TEXT NOT NULL CHECK (start_date GLOB ${DATE_PATTERN}),
    archived_on TEXT CHECK (archived_on GLOB ${DATE_PATTERN}),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE daily_entry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES goal (id) ON DELETE CASCADE,
    date TEXT NOT NULL CHECK (date GLOB ${DATE_PATTERN}),
    status TEXT NOT NULL CHECK (status IN ('success', 'missed')),
    validated_at INTEGER,
    UNIQUE (goal_id, date),
    CHECK ((status = 'success') = (validated_at IS NOT NULL))
  )`,
  `CREATE TABLE app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

export const GOAL_MIGRATIONS: readonly Migration[] = [initialSchema];
