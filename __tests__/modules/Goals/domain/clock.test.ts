import {
  assessClock,
  deriveProgress,
  reconcile,
  repairAfterRollback,
  type DailyEntry,
  type GoalSchedule,
} from '@/modules/Goals';
import {
  addDays,
  parseLocalDate,
  type LocalDate,
} from '@/shared/time/localDate';

const START = parseLocalDate('2026-12-01');
const day = (n: number): LocalDate => addDays(START, n - 1);
const goal: GoalSchedule = {
  startDate: START,
  targetDays: 5,
  archivedOn: null,
};
const success = (n: number): DailyEntry => ({
  date: day(n),
  status: 'success',
});

function repair(entries: DailyEntry[], today: LocalDate): DailyEntry[] {
  const { removedDates } = repairAfterRollback(goal, entries, today);
  return entries.filter(entry => !removedDates.includes(entry.date));
}

describe('assessment', () => {
  test.each([0, 1, 2])('is silent after %i day(s)', gap => {
    expect(assessClock(day(1), day(1 + gap), 1)).toEqual({ kind: 'normal' });
  });

  test('asks for confirmation after a long gap with days to miss', () => {
    expect(assessClock(day(1), day(4), 3)).toEqual({
      kind: 'longGap',
      days: 3,
    });
  });

  test('does not ask when nothing would be marked missed', () => {
    expect(assessClock(day(1), day(40), 0)).toEqual({ kind: 'normal' });
  });

  test('detects a clock moved back', () => {
    expect(assessClock(day(10), day(9), 0)).toEqual({
      kind: 'movedBack',
      checkpoint: day(10),
    });
  });

  test('accepts the first launch', () => {
    expect(assessClock(null, day(1), 5)).toEqual({ kind: 'normal' });
  });
});

describe('repair', () => {
  test('restores the streak after a wrongly accepted forward jump', () => {
    const real = [success(1), success(2)];
    // The clock jumps to day 20 while the real day is 3.
    const damaged = [...real, ...reconcile(goal, real, day(20))];
    expect(deriveProgress(goal, damaged).currentStreak).toBe(0);

    const repaired = repair(damaged, day(3));

    expect(repaired).toEqual(real);
    expect(deriveProgress(goal, repaired).currentStreak).toBe(2);
  });

  test('keeps the days really missed before the current day', () => {
    const damaged = [success(1), ...reconcile(goal, [success(1)], day(20))];

    expect(repair(damaged, day(4)).map(entry => entry.date)).toEqual(
      [1, 2, 3].map(day),
    );
  });

  test('removes future validations and so reverts a completion', () => {
    const entries = [1, 2, 3, 4, 5].map(success);

    const repaired = repair(entries, day(3));

    expect(repaired).toEqual([1, 2, 3].map(success));
    expect(deriveProgress(goal, repaired).completedOn).toBeNull();
  });

  test('brings a future archive date back to today', () => {
    expect(
      repairAfterRollback({ ...goal, archivedOn: day(20) }, [], day(3)),
    ).toEqual({ removedDates: [], archivedOn: day(3) });
  });

  test('changes nothing when there is nothing wrong', () => {
    expect(repairAfterRollback(goal, [success(1)], day(2))).toEqual({
      removedDates: [],
      archivedOn: null,
    });
  });
});
