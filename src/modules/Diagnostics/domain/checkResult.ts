/** Temporary (step 1 spike): result of one on-device verification. */
export interface CheckResult {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}
