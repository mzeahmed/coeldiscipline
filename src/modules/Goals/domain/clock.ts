// See docs/decisions/0002-time-handling.md.
import { daysBetween, type LocalDate } from '@/shared/time/localDate';
import type { DailyEntry, GoalSchedule } from './goal';

/** Days of absence from which marking missed days needs a confirmation. */
export const LONG_GAP_DAYS = 3;

export type ClockAssessment =
  | { readonly kind: 'normal' }
  | { readonly kind: 'longGap'; readonly days: number }
  | { readonly kind: 'movedBack'; readonly checkpoint: LocalDate };

/**
 * Tells whether reconciliation can run silently.
 *
 * @param checkpoint date of the last accepted reconciliation, if any.
 * @param pendingMissedCount entries reconciliation would add, over all goals.
 */
export function assessClock(
  checkpoint: LocalDate | null,
  today: LocalDate,
  pendingMissedCount: number,
): ClockAssessment {
  if (checkpoint === null) {
    return { kind: 'normal' };
  }

  const days = daysBetween(checkpoint, today);
  if (days < 0) {
    return { kind: 'movedBack', checkpoint };
  }

  return days >= LONG_GAP_DAYS && pendingMissedCount > 0
    ? { kind: 'longGap', days }
    : { kind: 'normal' };
}

export interface ClockRepair {
  /** Dates of the entries to delete. */
  readonly removedDates: readonly LocalDate[];
  /** Archive date to keep, never later than today. */
  readonly archivedOn: LocalDate | null;
}

/**
 * Changes that undo what was recorded while the clock was ahead: entries dated
 * after today, and today marked as missed.
 */
export function repairAfterRollback(
  schedule: GoalSchedule,
  entries: readonly DailyEntry[],
  today: LocalDate,
): ClockRepair {
  const { archivedOn } = schedule;

  return {
    removedDates: entries
      .filter(
        ({ date, status }) =>
          date > today || (date === today && status === 'missed'),
      )
      .map(({ date }) => date),
    archivedOn: archivedOn !== null && archivedOn > today ? today : archivedOn,
  };
}
