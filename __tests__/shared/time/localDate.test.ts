import { addDays, daysBetween, parseLocalDate } from '@/shared/time/localDate';

const date = parseLocalDate;

test.each([
  ['2026-01-31', '2026-02-01'],
  ['2026-02-28', '2026-03-01'],
  ['2028-02-28', '2028-02-29'],
  ['2028-02-29', '2028-03-01'],
  ['2026-12-31', '2027-01-01'],
  ['2100-02-28', '2100-03-01'],
])('the day after %s is %s', (before, after) => {
  expect(addDays(date(before), 1)).toBe(after);
  expect(addDays(date(after), -1)).toBe(before);
});

test('counts days across a leap year and DST changes', () => {
  expect(daysBetween(date('2028-01-01'), date('2029-01-01'))).toBe(366);
  expect(daysBetween(date('2026-03-28'), date('2026-03-30'))).toBe(2);
  expect(daysBetween(date('2026-03-30'), date('2026-03-28'))).toBe(-2);
});

test.each(['2027-02-29', '2026-13-01', '2026-04-31', '2026-1-5', 'today', ''])(
  'rejects %p',
  value => {
    expect(() => date(value)).toThrow(RangeError);
  },
);
