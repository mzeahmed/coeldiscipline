import type { SqlDatabase } from './sqlDatabase';

/** The statements that take the schema from one version to the next. */
export type Migration = readonly string[];

/**
 * Applies the pending migrations in one transaction. The schema version is the
 * number of migrations applied, stored in `PRAGMA user_version`.
 *
 * Published migrations must never be edited: append a new one.
 *
 * @throws Error if the database was written by a newer application.
 */
export async function migrate(
  database: SqlDatabase,
  migrations: readonly Migration[],
): Promise<void> {
  await database.transaction(async executor => {
    const [row] = await executor.execute('PRAGMA user_version');
    const version = Number(row?.user_version);

    if (version > migrations.length) {
      throw new Error(
        `Database version ${version} is newer than supported version ${migrations.length}`,
      );
    }

    for (const statement of migrations.slice(version).flat()) {
      await executor.execute(statement);
    }

    // PRAGMA does not accept bound parameters.
    await executor.execute(`PRAGMA user_version = ${migrations.length}`);
  });
}
