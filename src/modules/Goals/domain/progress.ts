import { addDays, type LocalDate } from '@/shared/time/localDate';
import { DailyEntry, GoalSchedule } from '@/modules/Goals';

export type AttemptStatus = 'active' | 'failed' | 'completed' | 'abandoned';

/** A run of consecutive successful days. Derived, never stored. */
export interface Attempt {
  readonly startDate: LocalDate;
  readonly lastSuccessDate: LocalDate;
  readonly length: number;
  readonly status: AttemptStatus;
}

export interface Progress {
  readonly attempts: readonly Attempt[];
  readonly currentStreak: number;
  readonly record: number;
  readonly successCount: number;
  readonly missedCount: number;
  /** Day the target was reached, if it was. */
  readonly completedOn: LocalDate | null;
}

export const sortByDate = (entries: readonly DailyEntry[]): DailyEntry[] =>
  [...entries].sort((a, b) => a.date.localeCompare(b.date));

/** Computes attempts, streaks and completion from the daily entries. */
export function deriveProgress(
  schedule: GoalSchedule,
  entries: readonly DailyEntry[],
): Progress {
  const attempts: Attempt[] = [];
  let open: Attempt | null = null;
  let successCount = 0;
  let missedCount = 0;
  let completedOn: LocalDate | null = null;

  /** Records an attempt with its final status; returns the new open one. */
  const close = (attempt: Attempt | null, status: AttemptStatus): null => {
    if (attempt) {
      attempts.push({ ...attempt, status });
    }

    return null;
  };

  for (const { date, status } of sortByDate(entries)) {
    if (status === 'missed') {
      missedCount += 1;
      open = close(open, 'failed');
      continue;
    }

    successCount += 1;
    if (open && addDays(open.lastSuccessDate, 1) !== date) {
      open = close(open, 'failed');
    }

    // Assertion: TypeScript wrongly narrows `open` to `null` in this loop.
    const previous = open as Attempt | null;
    open = {
      startDate: previous?.startDate ?? date,
      lastSuccessDate: date,
      length: (previous?.length ?? 0) + 1,
      status: 'active',
    };
    if (open.length === schedule.targetDays) {
      completedOn = date;
      open = close(open, 'completed');
      break;
    }
  }

  close(open, schedule.archivedOn ? 'abandoned' : 'active');

  const last = attempts.at(-1);
  const isCurrent = last?.status === 'active' || last?.status === 'completed';

  return {
    attempts,
    currentStreak: last && isCurrent ? last.length : 0,
    record: Math.max(0, ...attempts.map(attempt => attempt.length)),
    successCount,
    missedCount,
    completedOn,
  };
}
