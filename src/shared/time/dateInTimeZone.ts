import { parseLocalDate, type LocalDate } from './localDate';

/**
 * Calendar date of an instant in an IANA time zone.
 *
 * @throws RangeError if the time zone is unknown.
 */
export function dateInTimeZone(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const read = (type: 'year' | 'month' | 'day'): string => {
    const part = parts.find(candidate => candidate.type === type);
    if (!part) {
      throw new Error(`Missing ${type} in formatted date`);
    }
    return part.value;
  };

  return parseLocalDate(`${read('year')}-${read('month')}-${read('day')}`);
}

/** IANA time zone currently configured on the device. */
export function deviceTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}
