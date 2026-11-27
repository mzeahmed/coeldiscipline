export type SqlValue = string | number | null;

export type SqlRow = Readonly<Record<string, unknown>>;

export interface SqlExecutor {
  /** Runs one statement and returns its rows, if any. */
  execute(sql: string, params?: readonly SqlValue[]): Promise<SqlRow[]>;
}

export interface SqlDatabase {
  /**
   * Runs `work` atomically: everything is rolled back if it rejects.
   * Transactions run one at a time, and cannot be nested.
   */
  transaction<T>(work: (executor: SqlExecutor) => Promise<T>): Promise<T>;
}
