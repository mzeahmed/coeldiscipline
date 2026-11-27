# 0001. Application architecture

Status: accepted.

## Layout

```text
src/
  app/             composition root, navigation
  domain/          pure rules and types
  application/     use cases and ports (storage, clock)
  infrastructure/  SQLite, system clock, backup files
  presentation/    screens, components, hooks, theme, i18n
```

Folders are created when their first file is written.

## Rules

- Dependencies point inwards. `domain` imports nothing from React Native, SQLite
  or third-party libraries. Only `app` knows concrete implementations.
- Domain functions are pure: they take a state and a date and return changes.
- Use cases apply those changes in a single transaction.
- Screens call use cases; they never compute business rules.
- No dependency injection library; plain functions where a class adds nothing.

## Dependencies

Libraries are added when a feature needs them. V1 expects React Navigation and
OP-SQLite. Zustand, date-fns and charting libraries are postponed. Expo is not
used. SQL is tested on Node with `node:sqlite` (still experimental in Node 22).
