import { runDatabaseChecks } from '../data/databaseChecks';
import { runTimeZoneChecks } from '../data/timeZoneChecks';
import type { CheckResult } from '../domain/checkResult';

/** Temporary (step 1 spike). Results are also written to `make logs`. */
export async function runDiagnostics(): Promise<CheckResult[]> {
  const results = [
    ...(await runDatabaseChecks()),
    ...(await runTimeZoneChecks()),
  ];
  for (const { name, passed, detail } of results) {
    console.log(`[diagnostics] ${passed ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  }

  return results;
}
