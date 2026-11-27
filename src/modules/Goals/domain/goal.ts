import type { LocalDate } from '@/shared/time/localDate';

/** The part of a goal that the daily rules depend on. */
export interface GoalSchedule {
  readonly startDate: LocalDate;
  /** Consecutive successful days to reach; `null` for an unlimited goal. */
  readonly targetDays: number | null;
  /** Day the goal was archived. That day and the following are not required. */
  readonly archivedOn: LocalDate | null;
}

export const GOAL_CATEGORIES = [
  'health',
  'learning',
  'spirituality',
  'work',
  'finance',
  'other',
] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

/** What the user can edit at any time. */
export interface GoalDetails {
  readonly title: string;
  readonly description: string;
  readonly motivation: string;
  readonly category: GoalCategory;
}

export interface Goal extends GoalDetails, GoalSchedule {
  readonly id: number;
  /** Epoch milliseconds. */
  readonly createdAt: number;
  /** Epoch milliseconds. */
  readonly updatedAt: number;
}

/**
 * Outcome of a closed or validated day. A pending day has no entry.
 * A goal has at most one entry per date.
 */
export interface DailyEntry {
  readonly date: LocalDate;
  readonly status: 'success' | 'missed';
}
