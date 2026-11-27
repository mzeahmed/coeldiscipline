/**
 * A calendar day without time or time zone, formatted `YYYY-MM-DD`.
 * Two values compare chronologically with `<` and `>`.
 */
export type LocalDate = string & { readonly __brand: 'LocalDate' };

const PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

// Arithmetic is done in UTC, which has no daylight saving time.
const toEpochDay = (value: string): number =>
  Date.parse(`${value}T00:00:00Z`) / MS_PER_DAY;

const fromEpochDay = (day: number): LocalDate =>
  new Date(day * MS_PER_DAY).toISOString().slice(0, 10) as LocalDate;

/** @throws RangeError if the value is not an existing `YYYY-MM-DD` date. */
export function parseLocalDate(value: string): LocalDate {
  const day = PATTERN.test(value) ? toEpochDay(value) : Number.NaN;
  // The round trip rejects overflowing dates such as 2027-02-29.
  if (Number.isNaN(day) || fromEpochDay(day) !== value) {
    throw new RangeError(`Invalid date: ${value}`);
  }
  return value as LocalDate;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromEpochDay(toEpochDay(date) + days);
}

/** Number of days from `from` to `to`, negative if `to` is earlier. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return toEpochDay(to) - toEpochDay(from);
}
