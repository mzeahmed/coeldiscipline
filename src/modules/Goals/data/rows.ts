import type { SqlRow } from '@/shared/database/sqlDatabase';
import { parseLocalDate } from '@/shared/time/localDate';
import {
  GOAL_CATEGORIES,
  type DailyEntry,
  type Goal,
  type GoalCategory,
} from '../domain/goal';

// Rows are checked when read, so that corrupted data fails loudly.

function text(row: SqlRow, column: string): string {
  const value = row[column];

  if (typeof value !== 'string') {
    throw new Error(`Column ${column} is not a text`);
  }

  return value;
}

function integer(row: SqlRow, column: string): number {
  const value = row[column];

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Column ${column} is not an integer`);
  }

  return value;
}

function category(row: SqlRow): GoalCategory {
  const value = text(row, 'category');
  const known = GOAL_CATEGORIES.find(candidate => candidate === value);

  if (!known) {
    throw new Error(`Unknown category: ${value}`);
  }

  return known;
}

export function toGoal(row: SqlRow): Goal {
  return {
    id: integer(row, 'id'),
    title: text(row, 'title'),
    description: text(row, 'description'),
    motivation: text(row, 'motivation'),
    category: category(row),
    targetDays: row.target_days === null ? null : integer(row, 'target_days'),
    startDate: parseLocalDate(text(row, 'start_date')),
    archivedOn:
      row.archived_on === null
        ? null
        : parseLocalDate(text(row, 'archived_on')),
    createdAt: integer(row, 'created_at'),
    updatedAt: integer(row, 'updated_at'),
  };
}

export function toEntry(row: SqlRow): DailyEntry {
  const status = text(row, 'status');

  if (status !== 'success' && status !== 'missed') {
    throw new Error(`Unknown status: ${status}`);
  }

  return { date: parseLocalDate(text(row, 'date')), status };
}
