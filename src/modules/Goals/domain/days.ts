import { addDays, type LocalDate } from '@/shared/time/localDate';
import type { DailyEntry, GoalSchedule } from './goal';
import { deriveProgress, sortByDate } from './progress';

export type DayState =
  | 'success'
  | 'missed'
  | 'pending'
  | 'upcoming'
  | 'notScheduled';

function isRequired(
  schedule: GoalSchedule,
  completedOn: LocalDate | null,
  date: LocalDate,
): boolean {
  return (
    date >= schedule.startDate &&
    (schedule.archivedOn === null || date < schedule.archivedOn) &&
    (completedOn === null || date <= completedOn)
  );
}

/** What to display for one day of a goal, once reconciled. */
export function dayState(
  schedule: GoalSchedule,
  entries: readonly DailyEntry[],
  date: LocalDate,
  today: LocalDate,
): DayState {
  const entry = entries.find(candidate => candidate.date === date);
  if (entry) {
    return entry.status;
  }
  const { completedOn } = deriveProgress(schedule, entries);
  if (!isRequired(schedule, completedOn, date)) {
    return 'notScheduled';
  }
  return date > today ? 'upcoming' : 'pending';
}

/**
 * Missed entries to add for the required days that closed since the last entry.
 * Idempotent: once they are added, the result is empty.
 */
export function reconcile(
  schedule: GoalSchedule,
  entries: readonly DailyEntry[],
  today: LocalDate,
): DailyEntry[] {
  const { completedOn } = deriveProgress(schedule, entries);
  const last = sortByDate(entries).at(-1);
  const dayAfterLast = last ? addDays(last.date, 1) : schedule.startDate;
  const missed: DailyEntry[] = [];

  for (
    let date =
      dayAfterLast > schedule.startDate ? dayAfterLast : schedule.startDate;
    date < today && isRequired(schedule, completedOn, date);
    date = addDays(date, 1)
  ) {
    missed.push({ date, status: 'missed' });
  }
  return missed;
}
