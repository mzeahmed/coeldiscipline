import { dateInTimeZone } from '@/shared/time/dateInTimeZone';

test.each([
  ['2026-12-31T23:30:00Z', 'Pacific/Auckland', '2027-01-01'],
  ['2026-12-31T23:30:00Z', 'America/Los_Angeles', '2026-12-31'],
  // Paris is UTC+1 before the spring DST change and UTC+2 after it.
  ['2026-03-28T22:30:00Z', 'Europe/Paris', '2026-03-28'],
  ['2026-03-29T22:30:00Z', 'Europe/Paris', '2026-03-30'],
  ['2028-02-28T22:00:00Z', 'Indian/Comoro', '2028-02-29'],
])('%s in %s is %s', (instant, timeZone, expected) => {
  expect(dateInTimeZone(new Date(instant), timeZone)).toBe(expected);
});

test('rejects an unknown time zone', () => {
  expect(() => dateInTimeZone(new Date(), 'Mars/Olympus')).toThrow(RangeError);
});
