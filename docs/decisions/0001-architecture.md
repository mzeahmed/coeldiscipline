# 0001. Application architecture

Status: accepted. Revised: the code is organised by feature module instead of by
global layer.

## Layout

```text
src/
  App.tsx          application root
  navigation/      routes; assembles module screens
  modules/
    <Feature>/     PascalCase
      domain/      pure rules and types
      application/ use cases and ports
      data/        SQLite repositories, files, device APIs
      components/  screens/  hooks/
      index.ts     public entry point
  shared/          used by several modules: database, time, i18n, theme, ui
```

Folders are created when their first file is written. `__tests__/` mirrors `src/`.

Planned modules: `Goals` (goals, daily entries, streaks, reconciliation),
`Dashboard`, `Settings`, `Backup`. Goals and tracking stay together: they share
rules and transactions. `Diagnostics` is temporary.

## Rules

- Inside a module, dependencies point towards `domain`, which imports nothing from
  React Native, SQLite or third-party UI libraries.
- Another module is imported only through its `index.ts` (`@/modules/Goals`).
  Inside a module, use relative imports.
- Modules do not depend on each other in cycles. `shared` depends on no module.
- Domain functions are pure: they take a state and a date and return changes.
- Use cases apply those changes in a single transaction.
- Screens call use cases; they never compute business rules.
- No dependency injection library; plain functions where a class adds nothing.

ESLint enforces the entry point rule for `@/` imports, the independence of
`shared` and of `domain`. It does not detect relative paths into another module,
nor cycles.

## Dependencies

Libraries are added when a feature needs them. V1 uses React Navigation and
OP-SQLite. Zustand, date-fns and charting libraries are postponed. Expo is not
used. SQL is tested on Node with `node:sqlite` (still experimental in Node 22).
