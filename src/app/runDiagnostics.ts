import type { CheckResult } from '../application/diagnostics';
import { runDatabaseChecks } from '../infrastructure/diagnostics/databaseChecks';
import { runTimeZoneChecks } from '../infrastructure/diagnostics/timeZoneChecks';

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
