import { openOpSqliteDatabase } from '@/shared/database/opSqliteDatabase';

const mockExecute = jest.fn(async (_sql: string) => ({ rows: [{ id: 1 }] }));

// The native module is unavailable under Node: only the adapter is tested.
jest.mock('@op-engineering/op-sqlite', () => ({
  open: () => ({
    execute: mockExecute,
    transaction: (work: (tx: unknown) => Promise<void>) =>
      work({ execute: mockExecute }),
  }),
}));

test('enforces foreign keys and returns the result of a transaction', async () => {
  const database = await openOpSqliteDatabase('test.db');

  const rows = await database.transaction(sql => sql.execute('SELECT 1'));

  expect(mockExecute.mock.calls[0]?.[0]).toBe('PRAGMA foreign_keys = ON');
  expect(rows).toEqual([{ id: 1 }]);
});
