import { open } from '@op-engineering/op-sqlite';
import type { SqlDatabase, SqlRow } from './sqlDatabase';

/** Opens the on-device database with foreign keys enforced. */
export async function openOpSqliteDatabase(name: string): Promise<SqlDatabase> {
  const connection = open({ name });
  // Ignored inside a transaction, so it is set when opening.
  await connection.execute('PRAGMA foreign_keys = ON');

  return {
    async transaction<T>(
      work: Parameters<SqlDatabase['transaction']>[0],
    ): Promise<T> {
      let result: unknown;
      await connection.transaction(async tx => {
        result = await work({
          execute: async (sql, params = []): Promise<SqlRow[]> =>
            (
              await tx.execute(sql, [...params])
            ).rows,
        });
      });

      return result as T;
    },
  };
}
