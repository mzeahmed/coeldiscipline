// What every use case shares: the current day and the guarded reconciliation.
// See docs/decisions/0002-time-handling.md.
import type { Clock } from '@/shared/time/clock';
import { dateInTimeZone } from '@/shared/time/dateInTimeZone';
import type { LocalDate } from '@/shared/time/localDate';
import { assessClock, type ClockAssessment } from '../domain/clock';
import { reconcile } from '../domain/days';
import type { DailyEntry, Goal } from '../domain/goal';
import type { GoalStore, Repositories } from './ports';

export interface Dependencies {
  readonly store: GoalStore;
  readonly clock: Clock;
}

export type ClockIssue = Exclude<ClockAssessment, { kind: 'normal' }>;

/** Result of a use case that needs a trustworthy current day. */
export type Outcome<T> =
  | { readonly kind: 'done'; readonly value: T }
  | {
      readonly kind: 'clockIssue';
      readonly issue: ClockIssue;
      readonly today: LocalDate;
    };

export interface Options {
  /** Day the user confirmed to be today, after a long gap. */
  readonly confirmedToday?: LocalDate;
}

export interface Session {
  readonly repositories: Repositories;
  readonly today: LocalDate;
  /** Epoch milliseconds. */
  readonly now: number;
}

/** Current day in the reference zone, initialised from the device once. */
export async function currentDay(
  { timeState }: Repositories,
  clock: Clock,
  now: Date,
): Promise<LocalDate> {
  let zone = await timeState.getReferenceTimeZone();

  if (zone === null) {
    zone = clock.deviceTimeZone();
    await timeState.setReferenceTimeZone(zone);
  }

  return dateInTimeZone(now, zone);
}

export interface PendingGoal {
  readonly goal: Goal;
  readonly missed: readonly DailyEntry[];
}

export async function pendingMissed(
  { goals, entries }: Repositories,
  today: LocalDate,
): Promise<PendingGoal[]> {
  const pending: PendingGoal[] = [];

  for (const goal of await goals.findAll()) {
    const recorded = await entries.findByGoal(goal.id);
    pending.push({ goal, missed: reconcile(goal, recorded, today) });
  }

  return pending;
}

/**
 * Records the closed days, unless the clock needs the user's attention, in
 * which case nothing is written and the issue is returned.
 */
export async function synchronise(
  { repositories, today, now }: Session,
  { confirmedToday }: Options = {},
): Promise<ClockIssue | null> {
  const { entries, timeState } = repositories;
  const pending = await pendingMissed(repositories, today);
  const assessment = assessClock(
    await timeState.getCheckpoint(),
    today,
    pending.reduce((total, { missed }) => total + missed.length, 0),
  );

  const confirmed = assessment.kind === 'longGap' && confirmedToday === today;

  if (assessment.kind !== 'normal' && !confirmed) {
    return assessment;
  }

  for (const { goal, missed } of pending) {
    await entries.add(goal.id, missed, now);
  }

  await timeState.setCheckpoint(today);

  return null;
}

/** Runs `work` in one transaction, after reconciliation. */
export function reconciled<T>(
  { store, clock }: Dependencies,
  options: Options,
  work: (session: Session) => Promise<T>,
): Promise<Outcome<T>> {
  return store.transaction(async repositories => {
    const now = clock.now();
    const today = await currentDay(repositories, clock, now);
    const session = { repositories, today, now: now.getTime() };
    const issue = await synchronise(session, options);

    return issue
      ? { kind: 'clockIssue', issue, today }
      : { kind: 'done', value: await work(session) };
  });
}
