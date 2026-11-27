import type { LocalDate } from '@/shared/time/localDate';

/** The part of a goal that the daily rules depend on. */
export interface GoalSchedule {
  readonly startDate: LocalDate;
  /** Consecutive successful days to reach; `null` for an unlimited goal. */
  readonly targetDays: number | null;
  /** Day the goal was archived. That day and the following are not required. */
  readonly archivedOn: LocalDate | null;
}

/**
 * Outcome of a closed or validated day. A pending day has no entry.
 * A goal has at most one entry per date.
 */
export interface DailyEntry {
  readonly date: LocalDate;
  readonly status: 'success' | 'missed';
}
