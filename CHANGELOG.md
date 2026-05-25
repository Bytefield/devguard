# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [0.2.1] - 2026-05-25

### Added
- `status` command to print detected project root and resolved config summary (read-only).
- `configPath` support in config loader so `status` can report whether defaults are in use.

### Changed
- Scoped npm package name to `@dirtyspaniard/devguard`.
- README updated for public install/usage and pnpm + Prisma guidance.

### Fixed
- Ensure `bootstrap` and `preflight` command checks run from the detected project root (not the current subdirectory).

## [0.1.0] - 2026-05-24

### Added
- Initial release: `bootstrap`, `preflight`, and `test` commands.
- Suite-level test timeout with cross-platform kill-tree protection and optional logfile.
- Declarative `.devguard.json` config (bootstrap commands, preflight checks, test command).
