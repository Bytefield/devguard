'use strict';

const { spawnCommand } = require('../lib/spawn.js');

async function bootstrap(config, projectRoot) {
  const commands = (config.bootstrap && config.bootstrap.commands) || [];

  if (commands.length === 0) {
    process.stdout.write('⚠ No bootstrap commands configured\n');
    process.exit(0);
  }

  const total = commands.length;
  for (let i = 0; i < total; i++) {
    const cmd = commands[i];
    process.stdout.write(`→ Running: ${cmd}\n`);

    let result;
    try {
      // D1 exception: bootstrap commands are user strings that may contain pipes/redirects
      result = await spawnCommand(cmd, [], { shell: true, cwd: projectRoot });
    } catch (err) {
      process.stderr.write(`❌ Bootstrap failed at step ${i + 1}/${total}: ${cmd}\n   ${err.message}\n`);
      process.exit(1);
    }

    if (result.code !== 0) {
      process.stderr.write(
        `❌ Bootstrap failed at step ${i + 1}/${total}: ${cmd} (exit code ${result.code})\n`
      );
      process.exit(1);
    }
  }

  process.stdout.write(`✅ Bootstrap complete (${total} commands)\n`);
}

module.exports = { bootstrap };
