import type { LocalDate } from '@/shared/time/localDate';
import type { DailyEntry, GoalSchedule } from './goal';
import { deriveProgress } from '@/modules/Goals';

export type RejectionReason =
  | 'dayChanged'
  | 'notStarted'
  | 'archived'
  | 'completed'
  | 'dayClosed';

type Rejected = {
  readonly kind: 'rejected';
  readonly reason: RejectionReason;
};
type Unchanged = { readonly kind: 'unchanged' };

export type ValidationResult =
  | { readonly kind: 'add'; readonly entry: DailyEntry }
  | Unchanged
  | Rejected;

export type UndoResult =
  | { readonly kind: 'remove'; readonly date: LocalDate }
  | Unchanged
  | Rejected;

const rejected = (reason: RejectionReason): Rejected => ({
  kind: 'rejected',
  reason,
});

/**
 * Validates the current day. Reconcile the entries first.
 *
 * @param schedule
 * @param entries
 * @param displayedDate day shown to the user when they asked for validation.
 * @param today
 */
export function validateDay(
  schedule: GoalSchedule,
  entries: readonly DailyEntry[],
  displayedDate: LocalDate,
  today: LocalDate,
): ValidationResult {
  if (displayedDate !== today) {
    return rejected('dayChanged');
  }

  if (schedule.archivedOn !== null) {
    return rejected('archived');
  }

  if (today < schedule.startDate) {
    return rejected('notStarted');
  }

  const existing = entries.find(entry => entry.date === today);
  if (existing) {
    return existing.status === 'success'
      ? { kind: 'unchanged' }
      : rejected('dayClosed');
  }

  if (deriveProgress(schedule, entries).completedOn !== null) {
    return rejected('completed');
  }

  return { kind: 'add', entry: { date: today, status: 'success' } };
}

/** Cancels the validation of the current day, only while it is still open. */
export function undoValidation(
  schedule: GoalSchedule,
  entries: readonly DailyEntry[],
  displayedDate: LocalDate,
  today: LocalDate,
): UndoResult {
  if (displayedDate !== today) {
    return rejected('dayChanged');
  }

  if (schedule.archivedOn !== null) {
    return rejected('archived');
  }

  const validated = entries.some(
    entry => entry.date === today && entry.status === 'success',
  );

  return validated ? { kind: 'remove', date: today } : { kind: 'unchanged' };
}
