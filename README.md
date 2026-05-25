# devguard

> CLI safety guards for local dev and AI agent workflows. Zero dependencies, Node ≥ 20.

---

## Why

AI agents and Git worktrees create ephemeral environments where it's easy to run tests against a broken setup — missing `.env`, `prisma generate` never ran, or a hung process that silently blocks CI.

**devguard puts explicit checkpoints before any of that can happen.**

Instead of debugging a cryptic test failure ten minutes in, you fail fast at the gate with a clear message and a non-zero exit code.

---

## Install

```bash
npm i -g @dirtyspaniard/devguard
# or link locally during development
npm link   # from repo root
```

---

## Commands

### `devguard bootstrap`

Runs your setup sequence — install dependencies, generate artifacts (Prisma client, migrations), seed the database, whatever your project needs. Steps are defined in `.devguard.json` and run in order.

### `devguard preflight`

Verifies the environment is ready before touching tests. Checks files, env vars, importable modules, or any command that must exit 0.

It runs all configured checks and reports a summary. Exit code is non-zero if any check fails.

### `devguard test`

Runs your test suite with timeout enforcement and **kill-tree protection** — when the timeout fires, it kills the entire process tree, not just the parent process. Exit code `124` signals a timeout, matching the GNU `timeout` standard.

### `devguard status` *(read-only)*

Prints the detected project root, resolved config, and the test command that would run. Never executes anything. Use it to debug why devguard is picking up the wrong root, or to confirm the resolved timeout before a long run.

---

## Agent integration

The canonical one-liner for AI agent workflows and fresh worktrees:

```bash
devguard bootstrap && devguard preflight && devguard test
```

This is the recommended entry point whenever an agent spins up a new environment. It ensures setup is complete, the environment is sane, and the test suite runs with a guaranteed timeout — in that order, with a hard stop at the first failure.

Hook it into Husky for the same guarantee on every push:

```bash
# .husky/pre-push
devguard preflight && devguard test
```

---

## Config: `.devguard.json`

devguard walks up from the current directory to find `.devguard.json`. Place it at your project root.

```json
{
  "version": 1,
  "project": {
    "name": "my-app"
  },
  "bootstrap": {
    "commands": [
      "pnpm install",
      "pnpm exec prisma generate",
      "pnpm exec prisma migrate deploy"
    ]
  },
  "preflight": {
    "checks": [
      { "type": "exists", "path": ".env", "message": "Missing .env — copy .env.example" },
      { "type": "env_required", "name": "DATABASE_URL", "message": "Set DATABASE_URL in .env" },
      { "type": "command", "command": "node -e \"require('@prisma/client')\"", "message": "Run prisma generate first" }
    ]
  },
  "test": {
    "command": "pnpm",
    "args": ["test", "--", "--runInBand"],
    "env": { "NODE_ENV": "test" },
    "timeoutMs": 600000,
    "logFile": "logs/test.log"
  }
}
```

---

## Preflight checks

All checks accept optional `name` (display label) and `message` (failure text) fields.

| Type | Required fields | Passes when |
|---|---|---|
| `exists` | `path` | File or directory exists at `path` |
| `command` | `command`, `timeoutMs?` | Command exits 0 within timeout (default 10s) |
| `json_path_exists` | `file`, `path` (dot notation) | Value at dot-path is not `undefined` |
| `env_required` | `name` | `process.env[name]` is set and non-empty |

### Examples

```jsonc
// File must exist
{ "type": "exists", "path": ".env", "message": "Missing .env file" }

// Prisma client must be importable (pnpm-safe)
{ "type": "command", "command": "node -e \"require('@prisma/client')\"", "message": "Run prisma generate first" }

// Field must exist in package.json
{ "type": "json_path_exists", "file": "package.json", "path": "pnpm.onlyBuiltDependencies" }

// Env var must be set
{ "type": "env_required", "name": "DATABASE_URL", "message": "Set DATABASE_URL in .env" }
```

> **pnpm + Prisma note:** In pnpm projects, the generated client lives inside the pnpm store (`.pnpm/…`), so an `exists` check on `node_modules/.prisma/client` can produce false negatives. Use a `command` check instead: `node -e "require('@prisma/client')"` — it passes only when the client is actually importable, regardless of where pnpm physically stores it.

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Failure — test failed, check failed, or bootstrap step failed |
| `2` | Usage error — unknown command or config parse error |
| `124` | Timeout — process tree killed (matches GNU `timeout`) |

---

## Limitations

- `json_path_exists` supports simple dot notation only (`a.b.c`). Array indices, bracket notation, and keys containing dots are not supported.
- `command` checks use basic quote-aware tokenization. For complex shell expressions (pipes, redirects, variable expansion), use `bootstrap.commands` instead — those run with `shell: true`.

---

## License

MIT
