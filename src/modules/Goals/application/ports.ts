import type { LocalDate } from '@/shared/time/localDate';
import type { DailyEntry, Goal, GoalDetails } from '../domain/goal';

export type NewGoal = Omit<Goal, 'id' | 'archivedOn' | 'updatedAt'>;

export interface GoalRepository {
  /** @returns the identifier of the new goal. */
  insert(goal: NewGoal): Promise<number>;
  findById(id: number): Promise<Goal | null>;
  /** Oldest first. */
  findAll(): Promise<Goal[]>;
  updateDetails(
    id: number,
    details: GoalDetails,
    updatedAt: number,
  ): Promise<void>;
  setArchivedOn(
    id: number,
    archivedOn: LocalDate | null,
    updatedAt: number,
  ): Promise<void>;
  /** Deletes the goal and all its entries. */
  delete(id: number): Promise<void>;
}

export interface EntryRepository {
  /** Chronological order. */
  findByGoal(goalId: number): Promise<DailyEntry[]>;
  /**
   * Adds entries, keeping the existing one when a date is already recorded.
   *
   * @param recordedAt epoch milliseconds, kept for successful days.
   */
  add(
    goalId: number,
    entries: readonly DailyEntry[],
    recordedAt: number,
  ): Promise<void>;
  remove(goalId: number, dates: readonly LocalDate[]): Promise<void>;
}

/** See docs/decisions/0002-time-handling.md. */
export interface TimeStateRepository {
  getReferenceTimeZone(): Promise<string | null>;
  setReferenceTimeZone(timeZone: string): Promise<void>;
  /** Date of the last accepted reconciliation. */
  getCheckpoint(): Promise<LocalDate | null>;
  setCheckpoint(date: LocalDate): Promise<void>;
}

export interface Repositories {
  readonly goals: GoalRepository;
  readonly entries: EntryRepository;
  readonly timeState: TimeStateRepository;
}

export interface GoalStore {
  /** Runs `work` atomically: nothing is kept if it rejects. */
  transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}
