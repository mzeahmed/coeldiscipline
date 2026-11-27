import type { CheckResult } from '../../application/diagnostics';

/** Runs one verification, turning a thrown error into a failed result. */
export async function check(
  name: string,
  verify: () => Promise<{ passed: boolean; detail: string }>,
): Promise<CheckResult> {
  try {
    return { name, ...(await verify()) };
  } catch (error) {
    return { name, passed: false, detail: String(error) };
  }
}
