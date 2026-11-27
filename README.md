# CoelDiscipline

Android application for personal discipline: make commitments to yourself, track
them and measure consistency. Built with React Native (without Expo) and
TypeScript, local-first: no account, no server, works offline.

**Status:** early development. No feature is implemented yet; see the
[implementation plan](docs/implementation-plan.md).

## Requirements

- Node 22.11 or later
- JDK 17 and the Android SDK
- An Android phone with USB debugging (Android is the only supported platform)

`scripts/env.sh` assumes Ubuntu paths; adjust it to your setup.

## Getting started

```bash
npm ci
make dev       # debug app, installed next to the release one (Metro on port 8082)
make install   # standalone release app, requires a signing key
make check     # type checking, ESLint and tests
make help      # all commands
```

Release builds need a personal signing key: see
[release signing](docs/release-signing.md). Pushing a `v*` tag builds a signed APK
with GitHub Actions.

## Documentation

- [Requirements](docs/CoelDiscipline.md) (French)
- [Implementation plan](docs/implementation-plan.md)
- [Architecture](docs/decisions/0001-architecture.md)
- [Time handling](docs/decisions/0002-time-handling.md) (proposed)

## License

[MIT](LICENSE)
