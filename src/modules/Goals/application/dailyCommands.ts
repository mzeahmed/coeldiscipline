import type { LocalDate } from '@/shared/time/localDate';
import {
  undoValidation,
  validateDay,
  type UndoResult,
  type ValidationResult,
} from '../domain/validation';
import {
  reconciled,
  type Dependencies,
  type Options,
  type Outcome,
} from './context';

type NotFound = { readonly kind: 'notFound' };

/** @param displayedDate day the user was looking at when asking. */
export function validateToday(
  dependencies: Dependencies,
  goalId: number,
  displayedDate: LocalDate,
  options: Options = {},
): Promise<Outcome<ValidationResult | NotFound>> {
  return reconciled(dependencies, options, async session => {
    const { goals, entries } = session.repositories;
    const goal = await goals.findById(goalId);

    if (!goal) {
      return { kind: 'notFound' };
    }

    const result = validateDay(
      goal,
      await entries.findByGoal(goalId),
      displayedDate,
      session.today,
    );

    if (result.kind === 'add') {
      await entries.add(goalId, [result.entry], session.now);
    }

    return result;
  });
}

export function undoToday(
  dependencies: Dependencies,
  goalId: number,
  displayedDate: LocalDate,
  options: Options = {},
): Promise<Outcome<UndoResult | NotFound>> {
  return reconciled(dependencies, options, async session => {
    const { goals, entries } = session.repositories;
    const goal = await goals.findById(goalId);

    if (!goal) {
      return { kind: 'notFound' };
    }

    const result = undoValidation(
      goal,
      await entries.findByGoal(goalId),
      displayedDate,
      session.today,
    );

    if (result.kind === 'remove') {
      await entries.remove(goalId, [result.date]);
    }

    return result;
  });
}
