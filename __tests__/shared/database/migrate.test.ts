/** @jest-environment node */
import { migrate } from '@/shared/database/migrate';
import type { SqlDatabase } from '@/shared/database/sqlDatabase';
import { nodeSqliteDatabase } from '../../../test-support/nodeSqliteDatabase';

const query = (database: SqlDatabase, sql: string) =>
  database.transaction(executor => executor.execute(sql));

const version = async (database: SqlDatabase) =>
  (await query(database, 'PRAGMA user_version'))[0]?.user_version;

const first = ['CREATE TABLE a (id INTEGER)'];
const second = ['CREATE TABLE b (id INTEGER)'];

test('applies only the pending migrations', async () => {
  const database = nodeSqliteDatabase();

  await migrate(database, [first]);
  await query(database, 'INSERT INTO a VALUES (1)');
  await migrate(database, [first, second]);
  await migrate(database, [first, second]);

  expect(await version(database)).toBe(2);
  expect(await query(database, 'SELECT * FROM a')).toEqual([{ id: 1 }]);
});

test('keeps nothing from a failing upgrade', async () => {
  const database = nodeSqliteDatabase();
  await migrate(database, [first]);

  await expect(
    migrate(database, [first, second, ['not sql']]),
  ).rejects.toThrow();

  expect(await version(database)).toBe(1);
  await expect(query(database, 'SELECT * FROM b')).rejects.toThrow();
});

test('refuses a database from a newer application', async () => {
  const database = nodeSqliteDatabase();
  await migrate(database, [first, second]);

  await expect(migrate(database, [first])).rejects.toThrow('newer');
});
