import type { LocalDate } from '@/shared/time/localDate';
import { dayState, type DayState } from '../domain/days';
import type { DailyEntry, Goal } from '../domain/goal';
import { goalStatus, type GoalStatus } from '../domain/goalRules';
import { deriveProgress, type Progress } from '../domain/progress';
import {
  currentDay,
  synchronise,
  type ClockIssue,
  type Dependencies,
  type Options,
} from './context';
import type { Repositories } from './ports';

export interface GoalSnapshot {
  readonly goal: Goal;
  readonly status: GoalStatus;
  readonly progress: Progress;
  readonly todayState: DayState;
  readonly entries: readonly DailyEntry[];
}

export interface Overview {
  readonly today: LocalDate;
  /** When set, closed days are not recorded yet and writes are refused. */
  readonly clockIssue: ClockIssue | null;
  /** Oldest first, archived and completed goals included. */
  readonly goals: readonly GoalSnapshot[];
}

async function snapshot(
  { entries }: Repositories,
  goal: Goal,
  today: LocalDate,
): Promise<GoalSnapshot> {
  const recorded = await entries.findByGoal(goal.id);
  const progress = deriveProgress(goal, recorded);

  return {
    goal,
    progress,
    status: goalStatus(goal, progress, today),
    todayState: dayState(goal, recorded, today, today),
    entries: recorded,
  };
}

/**
 * Reconciles when the clock allows it, then reads everything. Called on launch,
 * on resume and when the day changes. Data stays readable with a clock issue.
 */
export function loadOverview(
  { store, clock }: Dependencies,
  options: Options = {},
): Promise<Overview> {
  return store.transaction(async repositories => {
    const now = clock.now();
    const today = await currentDay(repositories, clock, now);
    const clockIssue = await synchronise(
      { repositories, today, now: now.getTime() },
      options,
    );
    const goals: GoalSnapshot[] = [];

    for (const goal of await repositories.goals.findAll()) {
      goals.push(await snapshot(repositories, goal, today));
    }

    return { today, clockIssue, goals };
  });
}
