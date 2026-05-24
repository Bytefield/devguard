'use strict';

const fs = require('fs');
const path = require('path');

const MAX_LEVELS = 10;
const CONFIG_FILE = '.devguard.json';

function findConfig(startDir) {
  let dir = startDir;
  for (let i = 0; i < MAX_LEVELS; i++) {
    const candidate = path.join(dir, CONFIG_FILE);
    try {
      const stat = fs.lstatSync(dir);
      if (!stat.isDirectory()) break;
    } catch (_) {
      break;
    }

    if (fs.existsSync(candidate)) {
      return { configPath: candidate, projectRoot: dir };
    }

    const parsed = path.parse(dir);
    if (parsed.root === dir) break;
    dir = path.dirname(dir);
  }
  return null;
}

function loadConfig(cwd) {
  cwd = cwd || process.cwd();

  const found = findConfig(cwd);

  if (!found) {
    process.stderr.write('⚠ No .devguard.json found, using defaults\n');
    return {
      configPath: null,
      projectRoot: cwd,
      config: {
        version: 1,
        project: { name: path.basename(cwd) },
        bootstrap: { commands: [] },
        preflight: { checks: [] },
        test: { command: 'npm', args: ['test'], timeoutMs: 600000 },
      },
    };
  }

  let raw;
  try {
    raw = fs.readFileSync(found.configPath, 'utf8');
  } catch (err) {
    process.stderr.write(`❌ Cannot read ${found.configPath}: ${err.message}\n`);
    process.exit(2);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`❌ Invalid JSON in ${found.configPath}: ${err.message}\n`);
    process.exit(2);
  }

  if (config.version !== 1) {
    process.stderr.write(`❌ Unsupported config version: ${config.version} (expected 1)\n`);
    process.exit(2);
  }

  config.bootstrap = config.bootstrap || { commands: [] };
  config.preflight = config.preflight || { checks: [] };
  config.test = config.test || { command: 'npm', args: ['test'], timeoutMs: 600000 };

  return { config, projectRoot: found.projectRoot, configPath: found.configPath };
}

module.exports = { loadConfig };
