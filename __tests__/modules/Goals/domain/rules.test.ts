import {
  dayState,
  deriveProgress,
  reconcile,
  undoValidation,
  validateDay,
  type DailyEntry,
  type GoalSchedule,
} from '@/modules/Goals';
import { dateInTimeZone } from '@/shared/time/dateInTimeZone';
import {
  addDays,
  parseLocalDate,
  type LocalDate,
} from '@/shared/time/localDate';

const date = parseLocalDate;
const START = date('2026-12-01');
const day = (n: number): LocalDate => addDays(START, n - 1);

const goal = (overrides: Partial<GoalSchedule> = {}): GoalSchedule => ({
  startDate: START,
  targetDays: 30,
  archivedOn: null,
  ...overrides,
});

const successes = (from: number, to: number): DailyEntry[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    date: day(from + i),
    status: 'success',
  }));

/** Simulates opening the application on `today` and validating. */
function validateOn(
  schedule: GoalSchedule,
  entries: DailyEntry[],
  today: LocalDate,
): DailyEntry[] {
  const reconciled = [...entries, ...reconcile(schedule, entries, today)];
  const result = validateDay(schedule, reconciled, today, today);

  return result.kind === 'add' ? [...reconciled, result.entry] : reconciled;
}

describe('validation', () => {
  test('the first validation starts an attempt', () => {
    const entries = validateOn(goal(), [], day(1));

    expect(deriveProgress(goal(), entries)).toMatchObject({
      currentStreak: 1,
      attempts: [{ startDate: day(1), length: 1, status: 'active' }],
    });
  });

  test('validating twice counts once', () => {
    const once = validateOn(goal(), [], day(1));

    expect(validateDay(goal(), once, day(1), day(1))).toEqual({
      kind: 'unchanged',
    });
    expect(validateOn(goal(), once, day(1))).toHaveLength(1);
  });

  test('two consecutive days make a streak of two', () => {
    const entries = validateOn(goal(), validateOn(goal(), [], day(1)), day(2));

    expect(deriveProgress(goal(), entries).currentStreak).toBe(2);
  });

  test('is refused when the displayed day has passed', () => {
    expect(validateDay(goal(), [], day(1), day(2))).toEqual({
      kind: 'rejected',
      reason: 'dayChanged',
    });
  });

  test.each([
    ['before the start date', goal({ startDate: day(5) }), 'notStarted'],
    ['on an archived goal', goal({ archivedOn: day(1) }), 'archived'],
  ])('is refused %s', (_, schedule, reason) => {
    expect(validateDay(schedule, [], day(2), day(2))).toEqual({
      kind: 'rejected',
      reason,
    });
  });

  test('cannot overwrite a missed day', () => {
    const entries: DailyEntry[] = [{ date: day(2), status: 'missed' }];

    expect(validateDay(goal(), entries, day(2), day(2))).toEqual({
      kind: 'rejected',
      reason: 'dayClosed',
    });
  });
});

describe('undo', () => {
  test('removes the validation of the current day only', () => {
    const entries = successes(1, 2);

    expect(undoValidation(goal(), entries, day(2), day(2))).toEqual({
      kind: 'remove',
      date: day(2),
    });
    expect(undoValidation(goal(), entries, day(3), day(3))).toEqual({
      kind: 'unchanged',
    });
    expect(undoValidation(goal(), entries, day(2), day(3))).toEqual({
      kind: 'rejected',
      reason: 'dayChanged',
    });
  });

  test('reopens a goal completed the same day', () => {
    const schedule = goal({ targetDays: 3 });

    expect(deriveProgress(schedule, successes(1, 3)).completedOn).toBe(day(3));
    expect(undoValidation(schedule, successes(1, 3), day(3), day(3)).kind).toBe(
      'remove',
    );
    expect(deriveProgress(schedule, successes(1, 2))).toMatchObject({
      completedOn: null,
      currentStreak: 2,
    });
  });
});

describe('missed days', () => {
  test('an open day is pending, not missed', () => {
    expect(reconcile(goal(), successes(1, 1), day(2))).toEqual([]);
    expect(dayState(goal(), successes(1, 1), day(2), day(2))).toBe('pending');
  });

  test('resets the streak and keeps the record and history', () => {
    const entries = successes(1, 8);
    const afterMiss = [...entries, ...reconcile(goal(), entries, day(10))];

    expect(deriveProgress(goal(), afterMiss)).toMatchObject({
      currentStreak: 0,
      record: 8,
    });

    const resumed = validateOn(goal(), afterMiss, day(10));

    expect(deriveProgress(goal(), resumed)).toMatchObject({
      currentStreak: 1,
      record: 8,
      successCount: 9,
      missedCount: 1,
      attempts: [
        { length: 8, status: 'failed' },
        { startDate: day(10), length: 1, status: 'active' },
      ],
    });
  });

  test('several days away add one entry each and no empty attempt', () => {
    const entries = successes(1, 2);
    const missed = reconcile(goal(), entries, day(7));

    expect(missed.map(entry => entry.date)).toEqual([3, 4, 5, 6].map(day));
    expect(deriveProgress(goal(), [...entries, ...missed]).attempts).toEqual([
      expect.objectContaining({ length: 2, status: 'failed' }),
    ]);
  });

  test('a goal never validated has no attempt', () => {
    const missed = reconcile(goal(), [], day(4));

    expect(missed).toHaveLength(3);
    expect(deriveProgress(goal(), missed).attempts).toEqual([]);
  });

  test('reconciliation is idempotent', () => {
    const missed = reconcile(goal(), [], day(5));

    expect(reconcile(goal(), missed, day(5))).toEqual([]);
  });

  test('nothing is required before the start date', () => {
    const schedule = goal({ startDate: day(10) });

    expect(reconcile(schedule, [], day(5))).toEqual([]);
    expect(dayState(schedule, [], day(5), day(5))).toBe('notScheduled');
    expect(dayState(schedule, [], day(11), day(5))).toBe('upcoming');
  });

  test('a hole between successes breaks the attempt', () => {
    const entries = [...successes(1, 2), ...successes(4, 4)];

    expect(deriveProgress(goal(), entries).currentStreak).toBe(1);
  });
});

describe('completion', () => {
  test('thirty consecutive days complete the goal', () => {
    let entries: DailyEntry[] = [];
    for (let n = 1; n <= 30; n += 1) {
      entries = validateOn(goal(), entries, day(n));
    }

    expect(deriveProgress(goal(), entries)).toMatchObject({
      completedOn: day(30),
      currentStreak: 30,
      attempts: [{ length: 30, status: 'completed' }],
    });
    expect(reconcile(goal(), entries, day(45))).toEqual([]);
    expect(dayState(goal(), entries, day(31), day(31))).toBe('notScheduled');
    expect(validateDay(goal(), entries, day(31), day(31))).toEqual({
      kind: 'rejected',
      reason: 'completed',
    });
  });

  test('an unlimited goal never completes', () => {
    const schedule = goal({ targetDays: null });

    expect(deriveProgress(schedule, successes(1, 400))).toMatchObject({
      completedOn: null,
      currentStreak: 400,
    });
  });
});

describe('archiving', () => {
  const archived = goal({ archivedOn: day(4) });

  test('abandons the open attempt without missing the archive day', () => {
    expect(reconcile(archived, successes(1, 3), day(20))).toEqual([]);
    expect(deriveProgress(archived, successes(1, 3))).toMatchObject({
      currentStreak: 0,
      record: 3,
      attempts: [{ status: 'abandoned' }],
    });
  });

  test('still records the days missed before archiving', () => {
    expect(reconcile(archived, successes(1, 1), day(20))).toHaveLength(2);
  });
});

describe('calendar boundaries', () => {
  test.each([
    ['year', '2026-12-31', '2027-01-01'],
    ['leap day', '2028-02-28', '2028-02-29'],
    ['month', '2027-04-30', '2027-05-01'],
  ])('keeps the streak across a %s boundary', (_, first, second) => {
    const schedule = goal({ startDate: date(first) });
    const entries = validateOn(
      schedule,
      validateOn(schedule, [], date(first)),
      date(second),
    );

    expect(deriveProgress(schedule, entries).currentStreak).toBe(2);
  });

  test('midnight in the reference zone closes the day', () => {
    const zone = 'Europe/Paris';
    const before = dateInTimeZone(new Date('2026-12-01T22:59:59Z'), zone);
    const after = dateInTimeZone(new Date('2026-12-01T23:00:00Z'), zone);

    expect(validateDay(goal(), [], before, after)).toEqual({
      kind: 'rejected',
      reason: 'dayChanged',
    });
    expect(reconcile(goal(), [], after)).toEqual([
      { date: before, status: 'missed' },
    ]);
  });

  test('a DST change does not break a streak', () => {
    const zone = 'Europe/Paris';
    const instants = [
      '2027-03-27T22:30:00Z',
      '2027-03-28T21:30:00Z',
      '2027-03-29T21:30:00Z',
    ];
    const days = instants.map(i => dateInTimeZone(new Date(i), zone));
    const schedule = goal({ startDate: days[0]! });
    const entries = days.reduce<DailyEntry[]>(
      (acc, today) => validateOn(schedule, acc, today),
      [],
    );

    expect(deriveProgress(schedule, entries).currentStreak).toBe(3);
  });
});

describe('reference time zone change', () => {
  // The same instant, early on 2 December in Auckland and late on 1 in Paris.
  const instant = new Date('2026-12-01T12:00:00Z');
  const west = dateInTimeZone(instant, 'Europe/Paris');
  const east = dateInTimeZone(instant, 'Pacific/Auckland');

  test('eastwards closes the day left unvalidated', () => {
    expect([west, east]).toEqual([day(1), day(2)]);
    expect(reconcile(goal(), [], east)).toEqual([
      { date: day(1), status: 'missed' },
    ]);
  });

  test('westwards keeps the later entry and never counts it twice', () => {
    const entries = validateOn(goal(), successes(1, 1), east);

    expect(reconcile(goal(), entries, west)).toEqual([]);
    expect(validateDay(goal(), entries, west, west)).toEqual({
      kind: 'unchanged',
    });
    expect(deriveProgress(goal(), entries).currentStreak).toBe(2);
  });
});
