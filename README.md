# devguard

CLI safety guards for local dev and AI agent workflows. Zero dependencies, Node ≥20.

## Install

```sh
npm link   # from repo root (dev)
# or
npm i -g devguard
```

## Usage

```sh
devguard bootstrap    # run setup commands (pnpm install, prisma generate, …)
devguard preflight    # verify environment before running tests
devguard test         # run test suite with timeout + kill-tree protection
devguard status       # print detected project root and config summary
```

`status` is read-only — it never runs commands. Use it to debug why devguard is picking up the wrong
root or config, or to confirm the resolved test command and timeout before a long run.

All three read `.devguard.json` by walking up from the current directory.

## Config: `.devguard.json`

```json
{
  "version": 1,
  "project": {
    "name": "string"
  },
  "bootstrap": {
    "commands": ["string"]
  },
  "preflight": {
    "checks": [Check]
  },
  "test": {
    "command": "string",
    "args": ["string"],
    "env": { "KEY": "value" },
    "timeoutMs": 600000,
    "logFile": "string (relative to project root)"
  }
}
```

## Checks

| Type | Fields | Passes when |
|------|--------|-------------|
| `exists` | `path` (string) | File/dir exists at `path` |
| `command` | `command` (string), `timeoutMs?` | Command exits 0 within timeout (default 10s) |
| `json_path_exists` | `file`, `path` (dot notation) | Value at dot-path is not `undefined` |
| `env_required` | `name` (string) | `process.env[name]` is set and non-empty |

All checks accept optional `name` (display label) and `message` (failure text) fields.

### Examples

```json
{ "type": "exists", "path": ".env", "message": "Missing .env file" }
{ "type": "command", "command": "node -e \"require('@prisma/client')\"", "message": "Run prisma generate first" }
{ "type": "json_path_exists", "file": "package.json", "path": "pnpm.onlyBuiltDependencies" }
{ "type": "env_required", "name": "DATABASE_URL", "message": "Set DATABASE_URL in .env" }
```

> **pnpm + Prisma note:** In pnpm projects, the generated client lives inside the pnpm store
> (`.pnpm/…`), so an `exists` check on `node_modules/.prisma/client` can produce false negatives.
> Use a `command` check instead: `node -e "require('@prisma/client')"` — it passes only when the
> client is actually importable, regardless of where pnpm physically stores it.

## Hook integration

```sh
# .husky/pre-push
devguard test
```

## Agent integration

```sh
devguard bootstrap && devguard preflight && devguard test
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Failure (tests failed, check failed, bootstrap step failed) |
| 2 | Usage error (unknown command, config parse error) |
| 124 | Timeout (matches GNU timeout — process killed) |

## Limitations

- `json_path_exists` only supports simple dot notation (`a.b.c`). Array indices, bracket notation, and keys containing dots are not supported.
- `command` checks use basic quote-aware tokenization — complex shell expressions (pipes, redirects, variable expansion) should use `bootstrap.commands` instead, which runs with `shell:true`.
