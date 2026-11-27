import type { SqlDatabase } from '@/shared/database/sqlDatabase';
import type { GoalStore } from '../application/ports';
import {
  sqliteEntryRepository,
  sqliteGoalRepository,
  sqliteTimeStateRepository,
} from './sqliteRepositories';

/** The database must have been migrated with `GOAL_MIGRATIONS`. */
export function sqliteGoalStore(database: SqlDatabase): GoalStore {
  return {
    transaction: work =>
      database.transaction(executor =>
        work({
          goals: sqliteGoalRepository(executor),
          entries: sqliteEntryRepository(executor),
          timeState: sqliteTimeStateRepository(executor),
        }),
      ),
  };
}
