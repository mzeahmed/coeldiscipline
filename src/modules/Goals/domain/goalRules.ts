// Rules for creating and editing goals.
import type { LocalDate } from '@/shared/time/localDate';
import type { GoalDetails, GoalSchedule } from './goal';
import type { Progress } from './progress';

export interface GoalDraft extends GoalDetails {
  readonly targetDays: number | null;
  readonly startDate: LocalDate;
}

export type GoalError = 'titleRequired' | 'invalidDuration' | 'startInPast';

export type GoalStatus = 'upcoming' | 'active' | 'completed' | 'archived';

export const normalizeDetails = (details: GoalDetails): GoalDetails => ({
  title: details.title.trim(),
  description: details.description.trim(),
  motivation: details.motivation.trim(),
  category: details.category,
});

export const checkDetails = ({ title }: GoalDetails): GoalError[] =>
  title.trim() ? [] : ['titleRequired'];

export const checkDuration = (targetDays: number | null): GoalError[] =>
  targetDays === null || (Number.isSafeInteger(targetDays) && targetDays > 0)
    ? []
    : ['invalidDuration'];

export const checkDraft = (draft: GoalDraft, today: LocalDate): GoalError[] => [
  ...checkDetails(draft),
  ...checkDuration(draft.targetDays),
  ...(draft.startDate < today ? (['startInPast'] as const) : []),
];

/** A started goal can no longer change its duration. */
export const hasStarted = (schedule: GoalSchedule, today: LocalDate): boolean =>
  schedule.startDate <= today;

export function goalStatus(
  schedule: GoalSchedule,
  progress: Progress,
  today: LocalDate,
): GoalStatus {
  // A completed goal stays completed once archived.
  if (progress.completedOn !== null) {
    return 'completed';
  }

  if (schedule.archivedOn !== null) {
    return 'archived';
  }

  return hasStarted(schedule, today) ? 'active' : 'upcoming';
}
