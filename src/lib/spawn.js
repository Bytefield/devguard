'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { killTree } = require('./kill-tree.js');

function spawnCommand(command, args, options) {
  options = options || {};
  const {
    cwd = process.cwd(),
    env = process.env,
    shell = false,
    timeout,
    logFile,
  } = options;

  return new Promise((resolve, reject) => {
    const spawnOpts = { cwd, env, shell };

    // Create process group when shell:false so kill-tree can target -pid
    if (!shell) {
      spawnOpts.detached = true;
    }

    let writeStream = null;

    if (logFile) {
      const logDir = path.dirname(logFile);
      fs.mkdirSync(logDir, { recursive: true });
      writeStream = fs.createWriteStream(logFile, { flags: 'w' });
    } else {
      spawnOpts.stdio = 'inherit';
    }

    let child;
    try {
      child = spawn(command, args, spawnOpts);
    } catch (err) {
      return reject(new Error(`Command not found: ${command}`));
    }

    if (logFile && writeStream) {
      child.stdout.pipe(process.stdout);
      child.stdout.pipe(writeStream);
      child.stderr.pipe(process.stderr);
      child.stderr.pipe(writeStream);
    }

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      if (err.code === 'ENOENT') {
        reject(new Error(`Command not found: ${command}`));
      } else {
        reject(err);
      }
    });

    let timedOut = false;
    let timer = null;

    if (timeout) {
      timer = setTimeout(() => {
        timedOut = true;
        killTree(child.pid);
      }, timeout);
    }

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      if (writeStream) writeStream.end();
      resolve({ code, signal, timedOut });
    });
  });
}

module.exports = { spawnCommand };
