'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { status } = require('../src/commands/status.js');

const CONFIG_WITH_ALL = {
  version: 1,
  project: { name: 'my-project' },
  bootstrap: { commands: ['pnpm install', 'pnpm prisma generate'] },
  preflight: { checks: [{ type: 'env_required', name: 'DATABASE_URL' }] },
  test: { command: 'pnpm', args: ['vitest', 'run'], timeoutMs: 30000, logFile: 'test.log' },
};

const CONFIG_DEFAULTS = {
  version: 1,
  project: { name: 'no-config-project' },
  bootstrap: { commands: [] },
  preflight: { checks: [] },
  test: { command: 'npm', args: ['test'], timeoutMs: 600000 },
};

async function capture(fn) {
  let output = '';
  let exitCode;

  const origWrite = process.stdout.write.bind(process.stdout);
  const origExit = process.exit;

  process.stdout.write = (chunk) => { output += chunk; return true; };
  process.exit = (code) => { exitCode = code; };

  try {
    await fn();
  } finally {
    process.stdout.write = origWrite;
    process.exit = origExit;
  }

  return { output, exitCode };
}

test('status prints all expected labels', async () => {
  const { output } = await capture(() =>
    status(CONFIG_WITH_ALL, '/tmp/myproject', '/tmp/myproject/.devguard.json')
  );

  assert.ok(output.includes('Project root:'), 'has Project root label');
  assert.ok(output.includes('Config:'), 'has Config label');
  assert.ok(output.includes('Bootstrap commands:'), 'has Bootstrap commands label');
  assert.ok(output.includes('Preflight checks:'), 'has Preflight checks label');
  assert.ok(output.includes('Test:'), 'has Test label');
  assert.ok(output.includes('Timeout:'), 'has Timeout label');
  assert.ok(output.includes('Log file:'), 'has Log file label');
});

test('status with config prints correct values', async () => {
  const { output, exitCode } = await capture(() =>
    status(CONFIG_WITH_ALL, '/tmp/myproject', '/tmp/myproject/.devguard.json')
  );

  assert.ok(output.includes('/tmp/myproject'), 'prints project root path');
  assert.ok(output.includes('/tmp/myproject/.devguard.json'), 'prints config path');
  assert.ok(output.includes('Bootstrap commands: 2'), 'prints bootstrap count');
  assert.ok(output.includes('Preflight checks:   1'), 'prints preflight count');
  assert.ok(output.includes('pnpm vitest run'), 'prints test command with args');
  assert.ok(output.includes('30000ms'), 'prints timeout');
  assert.equal(exitCode, 0, 'exits with code 0');
});

test('status without config shows defaults placeholders', async () => {
  const { output } = await capture(() =>
    status(CONFIG_DEFAULTS, '/tmp/noconfig', null)
  );

  assert.ok(
    output.includes('(defaults: no .devguard.json found)'),
    'shows defaults message when configPath is null'
  );
  assert.ok(output.includes('Bootstrap commands: 0'), 'shows 0 bootstrap commands');
  assert.ok(output.includes('Preflight checks:   0'), 'shows 0 preflight checks');
  assert.ok(output.includes('Log file:           (none)'), 'shows (none) for missing log file');
});
