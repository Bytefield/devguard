'use strict';

const fs = require('fs');
const path = require('path');

const { spawnCommand } = require('../lib/spawn.js');

// Basic tokenizer: handles double and single quoted strings
function parseCommand(str) {
  const tokens = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inQuote) {
      if (c === quoteChar) {
        inQuote = false;
      } else {
        current += c;
      }
    } else if (c === '"' || c === "'") {
      inQuote = true;
      quoteChar = c;
    } else if (c === ' ' || c === '\t') {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += c;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function navigateDotPath(obj, dotPath) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

async function runCheck(check, projectRoot) {
  const type = check.type;

  if (type === 'exists') {
    const target = path.resolve(projectRoot, check.path);
    const passed = fs.existsSync(target);
    return {
      name: check.name || `exists:${check.path}`,
      passed,
      message: passed ? null : (check.message || `Path not found: ${check.path}`),
    };
  }

  if (type === 'command') {
    const tokens = parseCommand(check.command);
    const cmd = tokens[0];
    const args = tokens.slice(1);
    const timeoutMs = check.timeoutMs || 10000;

    let result;
    try {
      result = await spawnCommand(cmd, args, { shell: false, timeout: timeoutMs, cwd: projectRoot });
    } catch (err) {
      return {
        name: check.name || `command:${check.command}`,
        passed: false,
        message: check.message || `Command failed: ${check.command}`,
      };
    }

    const passed = !result.timedOut && result.code === 0;
    return {
      name: check.name || `command:${check.command}`,
      passed,
      message: passed ? null : (check.message || `Command failed: ${check.command}`),
    };
  }

  if (type === 'json_path_exists') {
    const filePath = path.resolve(projectRoot, check.file);
    let obj;
    try {
      obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) {
      return {
        name: check.name || `json_path_exists:${check.path}`,
        passed: false,
        message: check.message || `Cannot read or parse file: ${check.file}`,
      };
    }

    const value = navigateDotPath(obj, check.path);
    const passed = value !== undefined;
    return {
      name: check.name || `json_path_exists:${check.path}`,
      passed,
      message: passed ? null : (check.message || `Path ${check.path} not found in ${check.file}`),
    };
  }

  if (type === 'env_required') {
    const val = process.env[check.name];
    const passed = val !== undefined && val !== '';
    return {
      name: check.name || `env_required:${check.name}`,
      passed,
      message: passed ? null : (check.message || `Environment variable not set: ${check.name}`),
    };
  }

  return {
    name: check.name || `unknown:${type}`,
    passed: false,
    message: `Unknown check type: ${type}`,
  };
}

async function preflight(config, projectRoot) {
  const checks = (config.preflight && config.preflight.checks) || [];

  if (checks.length === 0) {
    process.stdout.write('⚠ No preflight checks configured\n');
    process.exit(0);
  }

  const results = [];
  for (const check of checks) {
    const result = await runCheck(check, projectRoot);
    const icon = result.passed ? '✓' : '✗';
    process.stdout.write(`  ${icon} ${result.name || result.message}\n`);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  const total = results.length;

  if (failed.length === 0) {
    process.stdout.write(`✅ Preflight: ${passed}/${total} checks passed\n`);
    process.exit(0);
  } else {
    process.stderr.write(
      `❌ Preflight: ${failed.length}/${total} checks failed:\n` +
        failed.map((r) => `   ✗ ${r.message}`).join('\n') +
        '\n'
    );
    process.exit(1);
  }
}

module.exports = { preflight };
