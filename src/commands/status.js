'use strict';

const path = require('path');

async function status(config, projectRoot, configPath) {
  const testCfg = config.test || {};
  const command = testCfg.command || 'npm';
  const args = testCfg.args || ['test'];
  const timeoutMs = testCfg.timeoutMs || 600000;
  const logFile = testCfg.logFile ? path.resolve(projectRoot, testCfg.logFile) : null;

  const bootstrapCount = (config.bootstrap && config.bootstrap.commands)
    ? config.bootstrap.commands.length : 0;
  const preflightCount = (config.preflight && config.preflight.checks)
    ? config.preflight.checks.length : 0;

  const lines = [
    `Project root:       ${projectRoot}`,
    `Config:             ${configPath || '(defaults: no .devguard.json found)'}`,
    `Bootstrap commands: ${bootstrapCount}`,
    `Preflight checks:   ${preflightCount}`,
    `Test:               ${[command, ...args].join(' ')}`,
    `Timeout:            ${timeoutMs}ms`,
    `Log file:           ${logFile || '(none)'}`,
  ];

  process.stdout.write(lines.join('\n') + '\n');
  process.exit(0);
}

module.exports = { status };
