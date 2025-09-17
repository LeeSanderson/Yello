#!/usr/bin/env node

const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';
const podmanCmd = isWindows ? 'podman.exe' : 'podman';

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return null;
  }
}

function checkPodman() {
  const result = runCommand(`${podmanCmd} --version`);
  return !!result;
}

function containerRunning() {
  const result = runCommand(`${podmanCmd} ps --format "{{.Names}}"`);
  return result && result.includes('yellow-postgres');
}

function databaseReady() {
  const result = runCommand(`${podmanCmd} exec yellow-postgres pg_isready -U yellow_user -d yellow_dev`);
  return result && result.includes('accepting connections');
}

function main() {
  if (!checkPodman()) {
    console.log('false');
    return;
  }
  
  if (!containerRunning()) {
    console.log('false');
    return;
  }
  
  if (!databaseReady()) {
    console.log('false');
    return;
  }
  
  console.log('true');
}

if (require.main === module) {
  main();
}