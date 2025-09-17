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

function containerExists() {
  const result = runCommand(`${podmanCmd} ps -a --format "{{.Names}}"`);
  return result && result.includes('yellow-postgres');
}

function volumeExists() {
  const result = runCommand(`${podmanCmd} volume ls --format "{{.Name}}"`);
  return result && result.includes('yellow_postgres_data');
}

function resetDatabase() {
  console.log('🗑️  Resetting PostgreSQL database...');
  
  // Stop and remove container
  if (containerExists()) {
    runCommand(`${podmanCmd} stop yellow-postgres`);
    runCommand(`${podmanCmd} rm yellow-postgres`);
    console.log('📦 Container removed');
  }
  
  // Remove volume
  if (volumeExists()) {
    runCommand(`${podmanCmd} volume rm yellow_postgres_data`);
    console.log('💾 Volume removed');
  }
  
  console.log('✅ Database reset complete');
  console.log('💡 Run "bun run db:start" to create a fresh database');
}

function main() {
  resetDatabase();
}

if (require.main === module) {
  main();
}