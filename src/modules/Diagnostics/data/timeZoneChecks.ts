import type { CheckResult } from '../domain/checkResult';
import { dateInTimeZone, deviceTimeZone } from '@/shared/time/dateInTimeZone';
import { check } from './check';

const CASES = [
  ['2026-12-31T23:30:00Z', 'Pacific/Auckland', '2027-01-01'],
  ['2026-12-31T23:30:00Z', 'America/Los_Angeles', '2026-12-31'],
  ['2026-03-28T22:30:00Z', 'Europe/Paris', '2026-03-28'],
  ['2026-03-29T22:30:00Z', 'Europe/Paris', '2026-03-30'],
  ['2028-02-28T22:00:00Z', 'Indian/Comoro', '2028-02-29'],
] as const;

type IntlWithZoneList = {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

/** Temporary (step 1 spike): what the device JavaScript engine supports. */
export async function runTimeZoneChecks(): Promise<CheckResult[]> {
  return [
    await check('Date in a chosen time zone', async () => {
      const failures = CASES.filter(
        ([instant, zone, expected]) =>
          dateInTimeZone(new Date(instant), zone) !== expected,
      ).map(([instant, zone]) => `${zone} at ${instant}`);
      return {
        passed: failures.length === 0,
        detail: failures.join(', ') || `${CASES.length} conversions correct`,
      };
    }),
    await check('Unknown time zone rejected', async () => {
      try {
        dateInTimeZone(new Date(), 'Mars/Olympus');
        return { passed: false, detail: 'accepted' };
      } catch (error) {
        return { passed: error instanceof RangeError, detail: String(error) };
      }
    }),
    await check('Device time zone', async () => {
      const zone = deviceTimeZone();
      return {
        passed: Boolean(zone),
        detail: `${zone}, today ${dateInTimeZone(new Date(), zone)}`,
      };
    }),
    await check('Time zone list', async () => {
      const zones = (Intl as IntlWithZoneList).supportedValuesOf?.('timeZone');
      return {
        passed: Boolean(zones?.length),
        detail: zones ? `${zones.length} zones` : 'supportedValuesOf missing',
      };
    }),
  ];
}
