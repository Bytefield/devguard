'use strict';

const path = require('path');

const { spawnCommand } = require('../lib/spawn.js');

function formatDuration(ms) {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
}

async function test(config, projectRoot) {
  const cfg = config.test || {};
  const command = cfg.command || 'npm';
  const args = cfg.args || ['test'];
  const timeoutMs = cfg.timeoutMs || 600000;
  const testEnv = cfg.env ? { ...process.env, ...cfg.env } : process.env;
  const logFile = cfg.logFile ? path.resolve(projectRoot, cfg.logFile) : null;

  let result;
  try {
    result = await spawnCommand(command, args, {
      cwd: projectRoot,
      env: testEnv,
      shell: false,
      timeout: timeoutMs,
      logFile,
    });
  } catch (err) {
    process.stderr.write(`❌ Failed to start test command: ${err.message}\n`);
    process.exit(1);
  }

  if (logFile) {
    process.stdout.write(`📄 Log: ${logFile}\n`);
  }

  if (result.timedOut) {
    process.stderr.write(`❌ Test suite exceeded ${formatDuration(timeoutMs)} timeout — killed\n`);
    process.exit(124);
  }

  if (result.signal) {
    process.stderr.write(`❌ Test suite killed by signal: ${result.signal}\n`);
    process.exit(1);
  }

  if (result.code === 0) {
    process.stdout.write('✅ Tests passed\n');
    process.exit(0);
  }

  process.stderr.write(`❌ Tests failed (exit code ${result.code})\n`);
  process.exit(result.code);
}

module.exports = { test };
