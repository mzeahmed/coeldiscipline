import { open, type DB } from '@op-engineering/op-sqlite';
import type { CheckResult } from '../domain/checkResult';
import { check } from './check';

async function countRows(db: DB): Promise<number> {
  const result = await db.execute('SELECT COUNT(*) AS total FROM spike_run');

  return Number(result.rows[0]?.total);
}

/** Temporary (step 1 spike): persistence, rollback and constraints on device. */
export async function runDatabaseChecks(): Promise<CheckResult[]> {
  const db = open({ name: 'spike.db' });
  try {
    await db.execute('PRAGMA foreign_keys = ON');
    await db.execute(
      'CREATE TABLE IF NOT EXISTS spike_run (id INTEGER PRIMARY KEY)',
    );
    await db.execute(
      'CREATE TABLE IF NOT EXISTS spike_child (run_id INTEGER NOT NULL REFERENCES spike_run(id) ON DELETE CASCADE)',
    );

    return [
      await check('SQLite persistence', async () => {
        await db.execute('INSERT INTO spike_run DEFAULT VALUES');
        const total = await countRows(db);
        const version = await db.execute('SELECT sqlite_version() AS version');

        return {
          passed: total > 0,
          detail: `${total} run(s) stored, SQLite ${version.rows[0]?.version}`,
        };
      }),
      await check('SQLite rollback', async () => {
        const before = await countRows(db);
        const failure = new Error('expected');
        await db
          .transaction(async tx => {
            await tx.execute('INSERT INTO spike_run DEFAULT VALUES');
            throw failure;
          })
          .catch(error => {
            if (error !== failure) {
              throw error;
            }
          });
        const after = await countRows(db);

        return { passed: before === after, detail: `${before} -> ${after}` };
      }),
      await check('SQLite foreign keys', async () => {
        const rejected = await db
          .execute('INSERT INTO spike_child (run_id) VALUES (-1)')
          .then(
            () => false,
            () => true,
          );

        return {
          passed: rejected,
          detail: rejected ? 'orphan row rejected' : 'orphan row accepted',
        };
      }),
    ];
  } finally {
    db.close();
  }
}
