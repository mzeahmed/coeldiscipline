import type {
  SqlDatabase,
  SqlExecutor,
  SqlRow,
  SqlValue,
} from '@/shared/database/sqlDatabase';

interface NodeSqlite {
  DatabaseSync: new (path: string) => {
    exec(sql: string): void;
    prepare(sql: string): { all(...params: SqlValue[]): SqlRow[] };
  };
}

// Jest cannot resolve `node:sqlite`, so it is loaded through Node itself.
const { process } = globalThis as unknown as {
  process: { getBuiltinModule(id: 'node:sqlite'): NodeSqlite };
};

/** In-memory SQLite behaving like the device database, for tests. */
export function nodeSqliteDatabase(): SqlDatabase {
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  const connection = new DatabaseSync(':memory:');
  connection.exec('PRAGMA foreign_keys = ON');

  const executor: SqlExecutor = {
    execute: async (sql, params = []) =>
      // Rows have no prototype; copy them into plain objects.
      connection
        .prepare(sql)
        .all(...params)
        .map(row => ({ ...row })),
  };
  let queue: Promise<unknown> = Promise.resolve();

  return {
    transaction(work) {
      const run = queue.then(async () => {
        connection.exec('BEGIN');

        try {
          const result = await work(executor);
          connection.exec('COMMIT');

          return result;
        } catch (error) {
          connection.exec('ROLLBACK');
          throw error;
        }
      });
      queue = run.catch(() => undefined);

      return run;
    },
  };
}
