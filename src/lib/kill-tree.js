'use strict';

const { spawn } = require('child_process');

async function killTree(pid) {
  if (process.platform === 'win32') {
    const child = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return new Promise((resolve) => child.on('close', resolve));
  }

  // Unix: pid is the process group leader (spawned with detached:true)
  try {
    process.kill(-pid, 'SIGTERM');
  } catch (err) {
    if (err.code === 'ESRCH') return; // already dead
    throw err;
  }

  await new Promise((resolve) => {
    setTimeout(() => {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch (_) {
        // ESRCH: already dead — that's fine
      }
      resolve();
    }, 3000);
  });
}

module.exports = { killTree };
