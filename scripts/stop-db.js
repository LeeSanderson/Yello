#!/usr/bin/env node

const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';
const podmanCmd = isWindows ? 'podman.exe' : 'podman';

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    return null;
  }
}

function containerRunning() {
  const result = runCommand(`${podmanCmd} ps --format "{{.Names}}"`);
  return result && result.includes('yellow-postgres');
}

function stopContainer() {
  console.log('🛑 Stopping PostgreSQL database...');
  
  if (containerRunning()) {
    runCommand(`${podmanCmd} stop yellow-postgres`);
    console.log('✅ Database stopped');
  } else {
    console.log('ℹ️  Database container is not running');
  }
}

function main() {
  stopContainer();
}

if (require.main === module) {
  main();
}