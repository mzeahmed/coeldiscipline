// Recovery and reference time zone. See docs/decisions/0002-time-handling.md.
import { dateInTimeZone } from '@/shared/time/dateInTimeZone';
import type { LocalDate } from '@/shared/time/localDate';
import { repairAfterRollback, type ClockRepair } from '../domain/clock';
import {
  currentDay,
  pendingMissed,
  reconciled,
  synchronise,
  type Dependencies,
  type Options,
  type Outcome,
} from './context';
import type { Repositories } from './ports';

export interface GoalRepair extends ClockRepair {
  readonly goalId: number;
  readonly title: string;
}

export interface RepairPlan {
  readonly today: LocalDate;
  /** Only the goals that would change. */
  readonly goals: readonly GoalRepair[];
}

async function planRepair(
  { goals, entries, timeState }: Repositories,
  today: LocalDate,
): Promise<RepairPlan | null> {
  const checkpoint = await timeState.getCheckpoint();

  // Only a clock that moved back can be repaired.
  if (checkpoint === null || today >= checkpoint) {
    return null;
  }

  const repairs: GoalRepair[] = [];

  for (const goal of await goals.findAll()) {
    const repair = repairAfterRollback(
      goal,
      await entries.findByGoal(goal.id),
      today,
    );

    if (
      repair.removedDates.length > 0 ||
      repair.archivedOn !== goal.archivedOn
    ) {
      repairs.push({ goalId: goal.id, title: goal.title, ...repair });
    }
  }

  return { today, goals: repairs };
}

/** What a repair would change, or `null` if there is nothing to repair. */
export function previewRepair({
  store,
  clock,
}: Dependencies): Promise<RepairPlan | null> {
  return store.transaction(async repositories =>
    planRepair(
      repositories,
      await currentDay(repositories, clock, clock.now()),
    ),
  );
}

export type RepairResult = 'repaired' | 'dayChanged' | 'nothingToRepair';

/**
 * Applies "the clock was wrong before". The caller must have shown the preview
 * and obtained a confirmation.
 *
 * @param confirmedToday day of the preview the user accepted.
 */
export function repairClock(
  { store, clock }: Dependencies,
  confirmedToday: LocalDate,
): Promise<RepairResult> {
  return store.transaction(async repositories => {
    const { goals, entries, timeState } = repositories;
    const now = clock.now();
    const today = await currentDay(repositories, clock, now);

    if (today !== confirmedToday) {
      return 'dayChanged';
    }

    const plan = await planRepair(repositories, today);

    if (!plan) {
      return 'nothingToRepair';
    }

    for (const { goalId, removedDates, archivedOn } of plan.goals) {
      await entries.remove(goalId, removedDates);
      await goals.setArchivedOn(goalId, archivedOn, now.getTime());
    }

    await timeState.setCheckpoint(today);

    return 'repaired';
  });
}

export interface TimeZonePreview {
  /** Current day in the new zone. */
  readonly today: LocalDate;
  /** Days that would be recorded as missed. */
  readonly missedCount: number;
}

/** @throws RangeError if the time zone is unknown. */
export async function previewTimeZone(
  dependencies: Dependencies,
  timeZone: string,
  options: Options = {},
): Promise<Outcome<TimeZonePreview>> {
  const now = dependencies.clock.now();
  const today = dateInTimeZone(now, timeZone);

  return reconciled(dependencies, options, async ({ repositories }) => {
    const pending = await pendingMissed(repositories, today);

    return {
      today,
      missedCount: pending.reduce((n, { missed }) => n + missed.length, 0),
    };
  });
}

export type TimeZoneResult = 'changed' | 'dayChanged';

/**
 * Changes the reference zone without ever deleting entries. Days are first
 * recorded in the old zone, then in the new one.
 *
 * @param confirmedToday day of the preview the user accepted.
 * @throws RangeError if the time zone is unknown.
 */
export function changeTimeZone(
  dependencies: Dependencies,
  timeZone: string,
  confirmedToday: LocalDate,
  options: Options = {},
): Promise<Outcome<TimeZoneResult>> {
  return reconciled(dependencies, options, async session => {
    const { repositories, now } = session;
    const today = dateInTimeZone(new Date(now), timeZone);

    if (today !== confirmedToday) {
      return 'dayChanged';
    }

    await repositories.timeState.setReferenceTimeZone(timeZone);

    // A checkpoint later than the new day would look like a clock moved back.
    await repositories.timeState.setCheckpoint(today);
    await synchronise({ repositories, today, now });

    return 'changed';
  });
}
