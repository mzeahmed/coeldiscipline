/** @jest-environment node */
import {
  changeTimeZone,
  previewRepair,
  previewTimeZone,
  repairClock,
} from '@/modules/Goals/application/clockCommands';
import type {
  Dependencies,
  Outcome,
} from '@/modules/Goals/application/context';
import {
  undoToday,
  validateToday,
} from '@/modules/Goals/application/dailyCommands';
import {
  archiveGoal,
  createGoal,
  deleteGoal,
  updateGoal,
} from '@/modules/Goals/application/goalCommands';
import { loadOverview } from '@/modules/Goals/application/queries';
import { GOAL_MIGRATIONS } from '@/modules/Goals/data/migrations';
import { sqliteGoalStore } from '@/modules/Goals/data/sqliteGoalStore';
import type { GoalDraft } from '@/modules/Goals/domain/goalRules';
import { migrate } from '@/shared/database/migrate';
import { addDays, parseLocalDate } from '@/shared/time/localDate';
import { nodeSqliteDatabase } from '../../../../test-support/nodeSqliteDatabase';

const START = parseLocalDate('2026-12-01');
const day = (n: number) => addDays(START, n - 1);

let instant: Date;
let dependencies: Dependencies;

/** Moves the clock to noon UTC on day `n`. */
const goTo = (n: number) => {
  instant = new Date(`${day(n)}T12:00:00Z`);
};

beforeEach(async () => {
  const database = nodeSqliteDatabase();
  await migrate(database, GOAL_MIGRATIONS);
  goTo(1);
  dependencies = {
    store: sqliteGoalStore(database),
    clock: { now: () => instant, deviceTimeZone: () => 'Europe/Paris' },
  };
});

const draft: GoalDraft = {
  title: ' Read ',
  description: '',
  motivation: '',
  category: 'learning',
  targetDays: 30,
  startDate: START,
};

function value<T>(outcome: Outcome<T>): T {
  if (outcome.kind !== 'done') {
    throw new Error(`Unexpected clock issue: ${outcome.issue.kind}`);
  }

  return outcome.value;
}

async function create(overrides: Partial<GoalDraft> = {}): Promise<number> {
  const result = value(
    await createGoal(dependencies, { ...draft, ...overrides }),
  );

  if (result.kind !== 'created') {
    throw new Error(`Not created: ${result.errors.join()}`);
  }

  return result.id;
}

const overview = () => loadOverview(dependencies);
const first = async () => (await overview()).goals[0]!;

/** Opens the application on day `n` and validates. */
async function validateOn(id: number, n: number) {
  goTo(n);

  return value(await validateToday(dependencies, id, day(n)));
}

describe('creating and editing', () => {
  test('stores a trimmed goal, readable afterwards', async () => {
    await create();

    expect(await first()).toMatchObject({
      goal: { title: 'Read', targetDays: 30 },
      status: 'active',
      todayState: 'pending',
    });
  });

  test('refuses an invalid draft', async () => {
    const outcome = await createGoal(dependencies, {
      ...draft,
      title: ' ',
      targetDays: 1.5,
      startDate: day(0),
    });

    expect(value(outcome)).toEqual({
      kind: 'invalid',
      errors: ['titleRequired', 'invalidDuration', 'startInPast'],
    });
    expect((await overview()).goals).toEqual([]);
  });

  test('locks the duration once the goal has started', async () => {
    const started = await create();
    const upcoming = await create({ startDate: day(5) });
    const changes = { ...draft, title: 'New', targetDays: 7 };

    expect(value(await updateGoal(dependencies, started, changes))).toEqual({
      kind: 'durationLocked',
    });
    expect(value(await updateGoal(dependencies, upcoming, changes))).toEqual({
      kind: 'updated',
    });
    expect(
      value(
        await updateGoal(dependencies, started, { ...changes, targetDays: 30 }),
      ),
    ).toEqual({ kind: 'updated' });
    expect((await overview()).goals.map(g => g.goal)).toMatchObject([
      { title: 'New', targetDays: 30 },
      { title: 'New', targetDays: 7 },
    ]);
  });
});

describe('several days', () => {
  test('validate, repeat, miss and resume', async () => {
    const id = await create();

    for (let n = 1; n <= 8; n += 1) {
      await validateOn(id, n);
    }

    expect(await validateOn(id, 8)).toEqual({ kind: 'unchanged' });

    goTo(10);
    expect((await first()).progress).toMatchObject({
      currentStreak: 0,
      record: 8,
    });

    await validateOn(id, 10);
    await overview();

    expect((await first()).progress).toMatchObject({
      currentStreak: 1,
      record: 8,
      successCount: 9,
      missedCount: 1,
    });
  });

  test('completes a goal and then requires nothing', async () => {
    const id = await create({ targetDays: 3 });

    for (let n = 1; n <= 3; n += 1) {
      await validateOn(id, n);
    }

    goTo(5);

    expect(await first()).toMatchObject({
      status: 'completed',
      todayState: 'notScheduled',
      progress: { missedCount: 0 },
    });
  });

  test('undoes the validation of the day', async () => {
    const id = await create();
    await validateOn(id, 1);

    expect(value(await undoToday(dependencies, id, day(1)))).toEqual({
      kind: 'remove',
      date: day(1),
    });
    expect((await first()).progress.successCount).toBe(0);
  });

  test('refuses a validation asked before midnight', async () => {
    const id = await create();
    instant = new Date('2026-12-01T23:00:00Z'); // 00:00 on day 2 in Paris.

    expect(value(await validateToday(dependencies, id, day(1)))).toEqual({
      kind: 'rejected',
      reason: 'dayChanged',
    });
    expect((await first()).entries).toEqual([
      { date: day(1), status: 'missed' },
    ]);
  });
});

describe('archiving and deleting', () => {
  test('keeps the history and stops requiring days', async () => {
    const id = await create();
    await validateOn(id, 1);
    goTo(2);

    expect(value(await archiveGoal(dependencies, id))).toBe('archived');
    expect(value(await archiveGoal(dependencies, id))).toBe('unchanged');

    goTo(4);
    // A gap with nothing to record needs no confirmation.
    const result = await overview();

    expect(result.clockIssue).toBeNull();
    expect(result.goals[0]).toMatchObject({
      status: 'archived',
      progress: { record: 1, missedCount: 0 },
    });
  });

  test('deletes a goal and only it', async () => {
    const deleted = await create();
    await create({ title: 'Kept' });
    await validateOn(deleted, 1);

    expect(value(await deleteGoal(dependencies, deleted))).toBe('deleted');
    expect(value(await deleteGoal(dependencies, deleted))).toBe('notFound');
    expect((await overview()).goals.map(g => g.goal.title)).toEqual(['Kept']);
  });
});

describe('long gap', () => {
  test('writes nothing until the day is confirmed', async () => {
    const id = await create();
    await validateOn(id, 1);
    goTo(10);

    const result = await overview();

    expect(result.clockIssue).toEqual({ kind: 'longGap', days: 9 });
    expect(result.goals[0]?.entries).toHaveLength(1);
    expect((await validateToday(dependencies, id, day(10))).kind).toBe(
      'clockIssue',
    );
    // A confirmation of another day does not count.
    expect(
      (await loadOverview(dependencies, { confirmedToday: day(9) })).clockIssue,
    ).not.toBeNull();

    const confirmed = await loadOverview(dependencies, {
      confirmedToday: day(10),
    });

    expect(confirmed.clockIssue).toBeNull();
    expect(confirmed.goals[0]?.progress.missedCount).toBe(8);
    expect((await overview()).goals[0]?.entries).toHaveLength(9);
  });
});

describe('clock moved back', () => {
  /** Validates day 1, then accepts a wrong jump to day 20. */
  async function jumpAndComeBack() {
    const id = await create();
    await validateOn(id, 1);
    await validateOn(id, 2);
    goTo(20);
    await loadOverview(dependencies, { confirmedToday: day(20) });
    goTo(3);

    return id;
  }

  test('is read-only, then repairable', async () => {
    const id = await jumpAndComeBack();

    expect((await overview()).clockIssue).toEqual({
      kind: 'movedBack',
      checkpoint: day(20),
    });
    expect((await createGoal(dependencies, draft)).kind).toBe('clockIssue');
    expect((await previewRepair(dependencies))?.goals).toMatchObject([
      { goalId: id, title: 'Read' },
    ]);

    expect(await repairClock(dependencies, day(3))).toBe('repaired');

    const result = await overview();

    expect(result.clockIssue).toBeNull();
    expect(result.goals[0]).toMatchObject({
      todayState: 'pending',
      progress: { currentStreak: 2, missedCount: 0 },
    });
    expect(await repairClock(dependencies, day(3))).toBe('nothingToRepair');
  });

  test('goes away when the clock is fixed instead', async () => {
    await jumpAndComeBack();
    goTo(20);

    expect((await overview()).clockIssue).toBeNull();
  });

  test('is not repaired for another day than the one confirmed', async () => {
    await jumpAndComeBack();

    expect(await repairClock(dependencies, day(4))).toBe('dayChanged');
  });
});

describe('reference time zone', () => {
  test('ignores a change of the device zone', async () => {
    await create();
    dependencies = {
      ...dependencies,
      clock: { now: () => instant, deviceTimeZone: () => 'Pacific/Auckland' },
    };

    expect((await overview()).today).toBe(day(1));
  });

  test('eastwards records the closed day, westwards deletes nothing', async () => {
    const id = await create();

    expect(
      value(await previewTimeZone(dependencies, 'Pacific/Auckland')),
    ).toEqual({ today: day(2), missedCount: 1 });
    expect((await first()).entries).toEqual([]);

    expect(
      value(await changeTimeZone(dependencies, 'Pacific/Auckland', day(2))),
    ).toBe('changed');
    value(await validateToday(dependencies, id, day(2)));
    value(await changeTimeZone(dependencies, 'Europe/Paris', day(1)));

    const result = await overview();

    expect(result.clockIssue).toBeNull();
    expect(result.today).toBe(day(1));
    expect(result.goals[0]?.entries).toEqual([
      { date: day(1), status: 'missed' },
      { date: day(2), status: 'success' },
    ]);
  });

  test('rejects an unknown zone', async () => {
    await create();

    await expect(previewTimeZone(dependencies, 'Mars/Olympus')).rejects.toThrow(
      RangeError,
    );
    await expect(
      changeTimeZone(dependencies, 'Mars/Olympus', day(1)),
    ).rejects.toThrow(RangeError);
  });
});

test('a failing command records nothing, not even reconciliation', async () => {
  await create();
  goTo(2);
  const { store } = dependencies;
  const failing: Dependencies = {
    ...dependencies,
    store: {
      transaction: work =>
        store.transaction(async repositories => {
          await work(repositories);
          throw new Error('disk full');
        }),
    },
  };

  await expect(loadOverview(failing)).rejects.toThrow('disk full');

  const entries = await store.transaction(r => r.entries.findByGoal(1));

  expect(entries).toEqual([]);
});
