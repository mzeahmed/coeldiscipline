import type { SqlExecutor } from '@/shared/database/sqlDatabase';
import { parseLocalDate } from '@/shared/time/localDate';
import type {
  EntryRepository,
  GoalRepository,
  TimeStateRepository,
} from '../application/ports';
import { toEntry, toGoal } from './rows';

export function sqliteGoalRepository(sql: SqlExecutor): GoalRepository {
  return {
    async insert(goal) {
      const [row] = await sql.execute(
        `INSERT INTO goal (title, description, motivation, category,
           target_days, start_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          goal.title,
          goal.description,
          goal.motivation,
          goal.category,
          goal.targetDays,
          goal.startDate,
          goal.createdAt,
          goal.createdAt,
        ],
      );

      return Number(row?.id);
    },

    async findById(id) {
      const [row] = await sql.execute('SELECT * FROM goal WHERE id = ?', [id]);

      return row ? toGoal(row) : null;
    },

    async findAll() {
      const rows = await sql.execute(
        'SELECT * FROM goal ORDER BY created_at, id',
      );

      return rows.map(toGoal);
    },

    async updateDetails(id, details, updatedAt) {
      await sql.execute(
        `UPDATE goal SET title = ?, description = ?, motivation = ?,
           category = ?, updated_at = ?
         WHERE id = ?`,
        [
          details.title,
          details.description,
          details.motivation,
          details.category,
          updatedAt,
          id,
        ],
      );
    },

    async setArchivedOn(id, archivedOn, updatedAt) {
      await sql.execute(
        'UPDATE goal SET archived_on = ?, updated_at = ? WHERE id = ?',
        [archivedOn, updatedAt, id],
      );
    },

    async delete(id) {
      // Entries are removed by the foreign key cascade.
      await sql.execute('DELETE FROM goal WHERE id = ?', [id]);
    },
  };
}

export function sqliteEntryRepository(sql: SqlExecutor): EntryRepository {
  return {
    async findByGoal(goalId) {
      const rows = await sql.execute(
        'SELECT date, status FROM daily_entry WHERE goal_id = ? ORDER BY date',
        [goalId],
      );

      return rows.map(toEntry);
    },

    async add(goalId, entries, recordedAt) {
      for (const { date, status } of entries) {
        await sql.execute(
          `INSERT INTO daily_entry (goal_id, date, status, validated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (goal_id, date) DO NOTHING`,
          [goalId, date, status, status === 'success' ? recordedAt : null],
        );
      }
    },

    async remove(goalId, dates) {
      for (const date of dates) {
        await sql.execute(
          'DELETE FROM daily_entry WHERE goal_id = ? AND date = ?',
          [goalId, date],
        );
      }
    },
  };
}

export function sqliteTimeStateRepository(
  sql: SqlExecutor,
): TimeStateRepository {
  const read = async (key: string): Promise<string | null> => {
    const [row] = await sql.execute(
      'SELECT value FROM app_meta WHERE key = ?',
      [key],
    );

    return typeof row?.value === 'string' ? row.value : null;
  };

  const write = async (key: string, value: string): Promise<void> => {
    await sql.execute(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  };

  return {
    getReferenceTimeZone: () => read('reference_time_zone'),
    setReferenceTimeZone: timeZone => write('reference_time_zone', timeZone),
    async getCheckpoint() {
      const value = await read('checkpoint_date');

      return value === null ? null : parseLocalDate(value);
    },
    setCheckpoint: date => write('checkpoint_date', date),
  };
}
