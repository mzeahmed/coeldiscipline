# Implementation plan (V1)

Requirements: [CoelDiscipline.md](CoelDiscipline.md) (French).

Every step ends with type checking, ESLint and tests, a report and a proposed
commit message, then waits for validation. Nothing is committed automatically.

| # | Step | Done when | Status |
|---|---|---|---|
| 0 | Foundations: demo removal, `src/app`, strict TypeScript, CI checks, debug/release separation, release signing, license, documentation | local checks and Android builds pass | Done, awaiting validation |
| 1 | Spike: OP-SQLite, React Navigation, time zone support of `Intl` on Hermes | a release build reads and writes on the phone, and converts an instant to a date in a chosen zone | |
| 2 | Domain: local dates, entries, derived attempts and streaks, validation, reconciliation, clock assessment and repair | domain tests pass | |
| 3 | SQLite migrations and store | constraints, cascading deletion and rollback are tested | |
| 4 | Use cases with an injected clock | multi-day scenarios are tested end to end | |
| 5 | Translations (fr, en), goal creation, home screen with quick validation | data survives a restart, offline | |
| 6 | Goal detail, editing, history, archiving, deletion, completed goals | full goal lifecycle works | |
| 7 | Reconciliation on launch, resume and midnight; clock warnings and recovery; time zone setting | verified on the phone | |
| 8 | JSON export and import | round trip, invalid files and rollback are tested | |
| 9 | Documentation and acceptance of the MVP criteria | `v1.0.0` APK | |

Steps 2 to 4 depend on the validation of
[decisions/0002-time-handling.md](decisions/0002-time-handling.md).

## Test coverage by step

| Scenario | Step |
|---|---|
| First validation, repeated validation, undo | 2, 4 |
| Reset after a missed day, several days away, no empty attempt | 2, 4 |
| Midnight, month and year boundaries, leap years | 2 |
| DST and time zone changes, clock anomalies | 2, 4 |
| Goal completion | 2, 4 |
| Reconciliation idempotency | 2, 3 |
| Archiving, deletion, transaction integrity | 3, 4 |
| Export and restore | 8 |

## Open points

- **Step 6.** A goal "has started" once its start date is today or earlier; its
  duration is then locked. To be confirmed.
- **Step 5.** The language follows the phone (French, otherwise English), with no
  in-app selector. To be confirmed.
- **Step 8.** React Native has no built-in file picker. The choice between a
  maintained library and a small Kotlin module (Storage Access Framework) will be
  submitted before implementation.
