# 0002. Time handling and clock anomalies

Status: accepted. Domain rules implemented in `src/modules/Goals/domain/`;
storage and user interface to come.

## Goals

A personal discipline tool, not an anti-cheat system. A clock error must never
cause an irreversible failure or lock the application.

## Reference time zone

- Days are computed in a stored reference time zone, initialised from the phone
  and editable in the settings.
- Travelling or changing the phone time zone therefore has no effect.
- Entries store calendar dates (`YYYY-MM-DD`), so DST does not affect streaks.
- Changing the reference zone shows a preview first. It never deletes entries and
  resets the checkpoint to the new current date.

## Derived attempts

Only daily entries (`success` or `missed`) are stored. Attempts, streaks, records
and goal completion are computed from them:

- an attempt is a run of consecutive successful days;
- a missed day ends it as failed, reaching the target ends it as completed;
- archiving a goal leaves its open run as abandoned.

Repairing a clock error then only means removing wrong entries: everything else
follows. Empty attempts cannot exist.

This replaces the `attempt` table of the initial schema. A goal stores its
archive date; there is no stored status.

## Checkpoint and detection

The application stores the date of the last accepted reconciliation.
On launch, resume and before any write:

| Situation | Condition | Behaviour |
|---|---|---|
| Normal | 0 to 2 days since the checkpoint | reconcile silently |
| Long gap | 3 days or more, and days would be marked missed | ask to confirm today's date before writing |
| Clock moved back | today is before the checkpoint date | warn, write nothing until the user chooses |

## Recovery

**Long gap refused** ("my clock is wrong"): nothing is written and the app stays
read-only. It re-evaluates on the next resume, after the clock is fixed.

**Clock moved back**, two choices:

1. "The clock is wrong now": stay read-only until it is fixed.
2. "The clock was wrong before": after a preview and confirmation, in one
   transaction, delete the entries dated after today and the missed entries dated
   today, bring a later archive date back to today, then move the checkpoint to
   today.

Both paths have a way out, so the app is never blocked until a future date. A
short forward jump (under 3 days) is not detected when it happens, but is
repaired by choice 2 once the clock is corrected.

## Testability

The assessment and the repair are pure functions of the checkpoint, the current
date and the entries. The clock and the instant-to-date conversion
are injected.

## Limits of an offline application

- There is no trusted time source.
- A forward clock error cannot be told apart from a real absence: the
  confirmation relies on the user.
- A clock that is wrong and never corrected cannot be detected.
- Setting the clock back deliberately allows cheating.
- If the clock stayed wrong for several days, validations made on wrong dates are
  removed by the repair and cannot be reassigned.
- A goal created while the clock was ahead keeps its future start date.

## To verify

Hermes support for `Intl.DateTimeFormat` with a `timeZone` option, and a way to
list time zones, are checked in step 1.
