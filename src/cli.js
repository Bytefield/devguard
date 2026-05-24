'use strict';

const path = require('path');

const { loadConfig } = require('./config.js');
const { bootstrap } = require('./commands/bootstrap.js');
const { preflight } = require('./commands/preflight.js');
const { test } = require('./commands/test.js');
const { status } = require('./commands/status.js');

const pkg = require('../package.json');

const USAGE = `
Usage: devguard <command> [options]

Commands:
  bootstrap    Run setup commands defined in .devguard.json
  preflight    Run environment checks before execution
  test         Run the test suite with timeout and kill-tree protection
  status       Show detected project root and config summary

Options:
  --version    Print version and exit
  --help       Show this help message

`.trimStart();

const COMMANDS = { bootstrap, preflight, test, status };

async function main() {
  const args = process.argv.slice(2);
  const sub = args[0];

  if (!sub || sub === '--help' || sub === '-h') {
    process.stdout.write(USAGE);
    process.exit(sub ? 0 : 2);
  }

  if (sub === '--version' || sub === '-v') {
    process.stdout.write(`${pkg.version}\n`);
    process.exit(0);
  }

  if (!COMMANDS[sub]) {
    process.stderr.write(`Unknown command: ${sub}\n\n${USAGE}`);
    process.exit(2);
  }

  const { config, projectRoot, configPath } = loadConfig(process.cwd());

  await COMMANDS[sub](config, projectRoot, configPath);
}

main().catch((err) => {
  process.stderr.write(`Unhandled error: ${err.message}\n`);
  process.exit(1);
});
