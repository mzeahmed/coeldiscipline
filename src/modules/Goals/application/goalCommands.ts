import type { Goal, GoalDetails } from '../domain/goal';
import {
  checkDetails,
  checkDraft,
  checkDuration,
  hasStarted,
  normalizeDetails,
  type GoalDraft,
  type GoalError,
} from '../domain/goalRules';
import {
  reconciled,
  type Dependencies,
  type Options,
  type Outcome,
} from './context';

export type CreateResult =
  | { readonly kind: 'created'; readonly id: number }
  | { readonly kind: 'invalid'; readonly errors: readonly GoalError[] };

export type UpdateResult =
  | { readonly kind: 'updated' }
  | { readonly kind: 'notFound' }
  | { readonly kind: 'durationLocked' }
  | { readonly kind: 'invalid'; readonly errors: readonly GoalError[] };

export type ArchiveResult = 'archived' | 'unchanged' | 'notFound';

export type DeleteResult = 'deleted' | 'notFound';

export function createGoal(
  dependencies: Dependencies,
  draft: GoalDraft,
  options: Options = {},
): Promise<Outcome<CreateResult>> {
  return reconciled(dependencies, options, async session => {
    const errors = checkDraft(draft, session.today);

    if (errors.length > 0) {
      return { kind: 'invalid', errors };
    }

    const id = await session.repositories.goals.insert({
      ...normalizeDetails(draft),
      targetDays: draft.targetDays,
      startDate: draft.startDate,
      createdAt: session.now,
    });

    return { kind: 'created', id };
  });
}

export interface GoalChanges extends GoalDetails {
  /** Only a goal that has not started can change it. */
  readonly targetDays: Goal['targetDays'];
}

export function updateGoal(
  dependencies: Dependencies,
  id: number,
  changes: GoalChanges,
  options: Options = {},
): Promise<Outcome<UpdateResult>> {
  return reconciled(dependencies, options, async session => {
    const { goals } = session.repositories;
    const goal = await goals.findById(id);

    if (!goal) {
      return { kind: 'notFound' };
    }

    const errors = [
      ...checkDetails(changes),
      ...checkDuration(changes.targetDays),
    ];

    if (errors.length > 0) {
      return { kind: 'invalid', errors };
    }

    if (changes.targetDays !== goal.targetDays) {
      if (hasStarted(goal, session.today)) {
        return { kind: 'durationLocked' };
      }

      await goals.setTargetDays(id, changes.targetDays, session.now);
    }

    await goals.updateDetails(id, normalizeDetails(changes), session.now);

    return { kind: 'updated' };
  });
}

/** Keeps the history. The current day is not counted as missed. */
export function archiveGoal(
  dependencies: Dependencies,
  id: number,
  options: Options = {},
): Promise<Outcome<ArchiveResult>> {
  return reconciled(dependencies, options, async session => {
    const { goals } = session.repositories;
    const goal = await goals.findById(id);

    if (!goal) {
      return 'notFound';
    }

    if (goal.archivedOn !== null) {
      return 'unchanged';
    }

    await goals.setArchivedOn(id, session.today, session.now);

    return 'archived';
  });
}

/** Permanent: the caller must have obtained a confirmation. */
export function deleteGoal(
  dependencies: Dependencies,
  id: number,
  options: Options = {},
): Promise<Outcome<DeleteResult>> {
  return reconciled(dependencies, options, async ({ repositories }) => {
    if (!(await repositories.goals.findById(id))) {
      return 'notFound';
    }

    await repositories.goals.delete(id);

    return 'deleted';
  });
}
