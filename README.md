# devguard

Tiny, zero-dependency CLI safety guards for local dev and AI-agent workflows (Node ≥20).

It standardizes three things across any repo:

- **bootstrap**: run setup commands (install, generate artifacts, etc.)
- **preflight**: fail-fast environment checks before running anything expensive
- **test**: run tests with a suite-level timeout + cross-platform kill-tree + optional log file
- **status**: show detected project root + resolved config summary (read-only)

## Install

```sh
npm i -g @dirtyspaniard/devguard
```

For development:

```sh
npm link
```

## Usage

```sh
devguard bootstrap
devguard preflight
devguard test
devguard status
```

All commands resolve the nearest `.devguard.json` by walking up from the current directory.

## Config: `.devguard.json`

See `examples/` for ready-to-copy configs (generic Node, pnpm + Prisma, etc.).

## Config: `.devguard.json`

```json
{
  "version": 1,
  "project": { "name": "my-repo" },
  "bootstrap": { "commands": ["pnpm install", "pnpm exec prisma generate"] },
  "preflight": {
    "checks": [
      {
        "type": "command",
        "command": "node -e \"require('@prisma/client')\"",
        "message": "Prisma client not generated. Run: pnpm exec prisma generate"
      }
    ]
  },
  "test": {
    "command": "pnpm",
    "args": ["test", "--", "--runInBand"],
    "timeoutMs": 900000,
    "logFile": ".devguard/test.log"
  }
}
```

## Checks

Supported `preflight.checks`:

- `exists`: verify a path exists (relative to project root)
- `command`: run a command and require exit code 0 (default timeout 10s)
- `json_path_exists`: assert a dot-path exists in a JSON file
- `env_required`: require an env var to be set and non-empty

## Hook integration

Example `.husky/pre-push`:

```sh
devguard preflight && devguard test
```

## Agent integration

```sh
devguard bootstrap && devguard preflight && devguard test
```

## Exit codes

- `0`: success
- `1`: failure (bootstrap/preflight/tests)
- `2`: usage/config error
- `124`: timeout (suite killed)

## Release checklist

- Ensure npm account has MFA/2FA enabled (ideally required for publishing).
- Run `npm test`.
- Run `npm pack` and inspect the tarball contents (`tar -tf ...`) before publishing.
- Tag the release (`git tag -a vX.Y.Z -m "vX.Y.Z"`) and push tags.
- Publish scoped package as public (`npm publish --access public`).
- (Optional) Publish with provenance (`npm publish --provenance`) if your setup supports it.

## Notes

pnpm + Prisma: avoid path-based checks like `node_modules/.prisma/client` (pnpm may store artifacts under `.pnpm/...`). Prefer a `command` check (`node -e "require('@prisma/client')"`).
