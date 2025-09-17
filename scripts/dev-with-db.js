#!/usr/bin/env node

const { spawn, execSync } = require('child_process');

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return null;
  }
}

function checkDatabase() {
  const result = runCommand('node scripts/check-db.js');
  return result && result.trim() === 'true';
}

async function startDatabase() {
  console.log('🔍 Checking database status...');

  if (checkDatabase()) {
    console.log('✅ Database is already running');
    return;
  }

  console.log('🚀 Starting database...');

  return new Promise((resolve, reject) => {
    const startDb = spawn('node', ['scripts/start-db.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    startDb.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Database start failed with code ${code}`));
      }
    });

    startDb.on('error', reject);
  });
}

async function startDevelopment() {
  console.log('🚀 Starting development servers...');

  const args = [
    'concurrently',
    '"bun run dev:server"',
    '"bun run dev:client"'
  ];

  const dev = spawn('npx', args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true
  });

  dev.on('close', (code) => {
    console.log(`Development servers exited with code ${code}`);
  });

  dev.on('error', (error) => {
    console.error('Failed to start development servers:', error);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development servers...');
    dev.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    dev.kill('SIGTERM');
    process.exit(0);
  });
}

async function main() {
  try {
    await startDatabase();
    await startDevelopment();
  } catch (error) {
    console.error('❌ Failed to start development environment:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}