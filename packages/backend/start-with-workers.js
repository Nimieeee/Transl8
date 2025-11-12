#!/usr/bin/env node

/**
 * Start both backend API and workers in the same process
 * This is suitable for MVP/small-scale deployments
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Transl8 Backend + Workers...');

// Start backend API
const backend = spawn('node', ['dist/index.js'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  env: { ...process.env }
});

// Start workers
const workers = spawn('node', ['../workers/dist/index.js'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  env: { ...process.env }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  backend.kill('SIGTERM');
  workers.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  backend.kill('SIGINT');
  workers.kill('SIGINT');
});

backend.on('exit', (code) => {
  console.log(`Backend exited with code ${code}`);
  workers.kill();
  process.exit(code);
});

workers.on('exit', (code) => {
  console.log(`Workers exited with code ${code}`);
  backend.kill();
  process.exit(code);
});
