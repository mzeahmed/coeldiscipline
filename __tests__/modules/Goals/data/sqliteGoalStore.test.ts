/** @jest-environment node */
import type { GoalStore, NewGoal } from '@/modules/Goals/application/ports';
import { GOAL_MIGRATIONS } from '@/modules/Goals/data/migrations';
import { sqliteGoalStore } from '@/modules/Goals/data/sqliteGoalStore';
import { GOAL_CATEGORIES } from '@/modules/Goals/domain/goal';
import { migrate } from '@/shared/database/migrate';
import type { SqlDatabase, SqlValue } from '@/shared/database/sqlDatabase';
import { parseLocalDate } from '@/shared/time/localDate';
import { nodeSqliteDatabase } from '../../../../test-support/nodeSqliteDatabase';

const date = parseLocalDate;

const newGoal: NewGoal = {
  title: 'Read',
  description: '10 pages',
  motivation: 'Learn',
  category: 'learning',
  targetDays: 30,
  startDate: date('2026-12-01'),
  createdAt: 1000,
};

let database: SqlDatabase;
let store: GoalStore;

beforeEach(async () => {
  database = nodeSqliteDatabase();
  await migrate(database, GOAL_MIGRATIONS);
  store = sqliteGoalStore(database);
});

const insert = (goal: Partial<NewGoal> = {}) =>
  store.transaction(({ goals }) => goals.insert({ ...newGoal, ...goal }));

const entriesOf = (id: number) =>
  store.transaction(({ entries }) => entries.findByGoal(id));

const run = (sql: string, params?: SqlValue[]) =>
  database.transaction(executor => executor.execute(sql, params));

describe('goals', () => {
  test('are stored and read back', async () => {
    const id = await insert();

    expect(await store.transaction(({ goals }) => goals.findAll())).toEqual([
      { ...newGoal, id, archivedOn: null, updatedAt: 1000 },
    ]);
  });

  test.each(GOAL_CATEGORIES)('accept the %s category', async category => {
    await expect(insert({ category })).resolves.toEqual(expect.any(Number));
  });

  test('can be unlimited', async () => {
    const id = await insert({ targetDays: null });

    const goal = await store.transaction(({ goals }) => goals.findById(id));

    expect(goal?.targetDays).toBeNull();
  });

  test('keep their history when edited and archived', async () => {
    const id = await insert();
    await store.transaction(async ({ goals, entries }) => {
      await entries.add(
        id,
        [{ date: date('2026-12-01'), status: 'success' }],
        1,
      );
      await goals.updateDetails(
        id,
        { title: 'New', description: '', motivation: '', category: 'work' },
        2000,
      );
      await goals.setArchivedOn(id, date('2026-12-02'), 3000);
    });

    expect(
      await store.transaction(({ goals }) => goals.findById(id)),
    ).toMatchObject({
      title: 'New',
      category: 'work',
      targetDays: 30,
      archivedOn: '2026-12-02',
      updatedAt: 3000,
    });
    expect(await entriesOf(id)).toHaveLength(1);
  });

  test('are deleted with their entries only', async () => {
    const deleted = await insert();
    const kept = await insert();
    await store.transaction(async ({ entries }) => {
      const day = [{ date: date('2026-12-01'), status: 'missed' as const }];
      await entries.add(deleted, day, 1);
      await entries.add(kept, day, 1);
    });

    await store.transaction(({ goals }) => goals.delete(deleted));

    expect(await run('SELECT goal_id FROM daily_entry')).toEqual([
      { goal_id: kept },
    ]);
    expect(
      await store.transaction(({ goals }) => goals.findById(deleted)),
    ).toBeNull();
  });

  test.each([
    ['a blank title', { title: '  ' }],
    ['a zero target', { targetDays: 0 }],
  ])('reject %s', async (_, invalid) => {
    await expect(insert(invalid)).rejects.toThrow('CHECK');
  });
});

describe('entries', () => {
  test('are unique per day and never overwritten', async () => {
    const id = await insert();
    const day = date('2026-12-01');

    await store.transaction(async ({ entries }) => {
      await entries.add(id, [{ date: day, status: 'success' }], 111);
      await entries.add(id, [{ date: day, status: 'success' }], 222);
      await entries.add(id, [{ date: day, status: 'missed' }], 333);
    });

    expect(await run('SELECT status, validated_at FROM daily_entry')).toEqual([
      { status: 'success', validated_at: 111 },
    ]);
  });

  test('are read chronologically and removed by date', async () => {
    const id = await insert();
    await store.transaction(({ entries }) =>
      entries.add(
        id,
        [
          { date: date('2026-12-02'), status: 'missed' },
          { date: date('2026-12-01'), status: 'success' },
        ],
        1,
      ),
    );

    expect((await entriesOf(id)).map(entry => entry.date)).toEqual([
      '2026-12-01',
      '2026-12-02',
    ]);

    await store.transaction(({ entries }) =>
      entries.remove(id, [date('2026-12-02')]),
    );

    expect(await entriesOf(id)).toEqual([
      { date: '2026-12-01', status: 'success' },
    ]);
  });

  test.each([
    ['an unknown goal', [99, '2026-12-01', 'missed', null], 'FOREIGN KEY'],
    ['a malformed date', [1, '1/12/2026', 'missed', null], 'CHECK'],
    ['an unknown status', [1, '2026-12-01', 'pending', null], 'CHECK'],
    ['a success without time', [1, '2026-12-01', 'success', null], 'CHECK'],
    ['a missed day with a time', [1, '2026-12-01', 'missed', 5], 'CHECK'],
  ])('are rejected for %s', async (_, params, message) => {
    await insert();

    await expect(
      run(
        'INSERT INTO daily_entry (goal_id, date, status, validated_at) VALUES (?, ?, ?, ?)',
        params,
      ),
    ).rejects.toThrow(message);
  });
});

describe('time state', () => {
  test('is empty first, then keeps the last values', async () => {
    const read = () =>
      store.transaction(async ({ timeState }) => [
        await timeState.getReferenceTimeZone(),
        await timeState.getCheckpoint(),
      ]);

    expect(await read()).toEqual([null, null]);

    await store.transaction(async ({ timeState }) => {
      await timeState.setReferenceTimeZone('Europe/Paris');
      await timeState.setCheckpoint(date('2026-12-01'));
      await timeState.setCheckpoint(date('2026-12-02'));
    });

    expect(await read()).toEqual(['Europe/Paris', '2026-12-02']);
  });
});

describe('transactions', () => {
  test('keep nothing when the work fails', async () => {
    const id = await insert();

    await expect(
      store.transaction(async ({ goals, entries, timeState }) => {
        await entries.add(
          id,
          [{ date: date('2026-12-01'), status: 'missed' }],
          1,
        );
        await timeState.setCheckpoint(date('2026-12-02'));
        await goals.delete(id);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await run('SELECT id FROM goal')).toEqual([{ id }]);
    expect(await entriesOf(id)).toEqual([]);
    expect(
      await store.transaction(({ timeState }) => timeState.getCheckpoint()),
    ).toBeNull();
  });

  test('run one after the other', async () => {
    const order: string[] = [];

    await Promise.all(
      ['first', 'second'].map(name =>
        store.transaction(async ({ goals }) => {
          order.push(`${name} start`);
          await goals.findAll();
          order.push(`${name} end`);
        }),
      ),
    );

    expect(order).toEqual([
      'first start',
      'first end',
      'second start',
      'second end',
    ]);
  });
});
