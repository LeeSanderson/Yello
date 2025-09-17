#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const podmanCmd = isWindows ? 'podman.exe' : 'podman';

function runCommand(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    return null;
  }
}

function checkPodman() {
  const result = runCommand(`${podmanCmd} --version`);
  if (!result) {
    console.error('❌ Podman is not installed or not in PATH');
    console.error('Please install Podman: https://podman.io/getting-started/installation');
    process.exit(1);
  }
  console.log('✅ Podman found:', result.trim());
}

function containerExists() {
  const result = runCommand(`${podmanCmd} ps -a --format "{{.Names}}"`);
  return result && result.includes('yellow-postgres');
}

function containerRunning() {
  const result = runCommand(`${podmanCmd} ps --format "{{.Names}}"`);
  return result && result.includes('yellow-postgres');
}

function startContainer() {
  console.log('🐘 Starting PostgreSQL database with Podman...');
  
  if (containerExists()) {
    if (containerRunning()) {
      console.log('✅ Container is already running');
      return;
    }
    console.log('📦 Container exists, starting...');
    runCommand(`${podmanCmd} start yellow-postgres`);
  } else {
    console.log('📦 Creating new container...');
    
    // Get absolute path to init script
    const initScriptPath = path.resolve(__dirname, 'init-db.sql');
    const initScriptMount = isWindows 
      ? `${initScriptPath.replace(/\\/g, '/')}:/docker-entrypoint-initdb.d/init-db.sql`
      : `${initScriptPath}:/docker-entrypoint-initdb.d/init-db.sql`;
    
    const createCmd = [
      podmanCmd, 'run', '-d',
      '--name', 'yellow-postgres',
      '-e', 'POSTGRES_DB=yellow_dev',
      '-e', 'POSTGRES_USER=yellow_user',
      '-e', 'POSTGRES_PASSWORD=yellow_password',
      '-p', '5432:5432',
      '-v', 'yellow_postgres_data:/var/lib/postgresql/data',
      '-v', initScriptMount,
      'postgres:15-alpine'
    ].join(' ');
    
    runCommand(createCmd);
  }
}

function waitForDatabase() {
  console.log('⏳ Waiting for database to be ready...');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  const checkReady = () => {
    const result = runCommand(`${podmanCmd} exec yellow-postgres pg_isready -U yellow_user -d yellow_dev`);
    if (result && result.includes('accepting connections')) {
      console.log('✅ Database is ready!');
      console.log('📊 Connection: postgresql://yellow_user:yellow_password@localhost:5432/yellow_dev');
      return true;
    }
    
    attempts++;
    if (attempts >= maxAttempts) {
      console.error('❌ Database failed to start after 30 attempts');
      process.exit(1);
    }
    
    console.log(`⏳ Waiting for database... (${attempts}/${maxAttempts})`);
    setTimeout(checkReady, 2000);
  };
  
  // Initial delay
  setTimeout(checkReady, 3000);
}

function main() {
  checkPodman();
  startContainer();
  waitForDatabase();
}

if (require.main === module) {
  main();
}