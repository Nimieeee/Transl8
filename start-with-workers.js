#!/usr/bin/env node

/**
 * Start both backend API and workers in the same process
 * Root-level wrapper for Render deployment
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Transl8 Backend + Workers...');
console.log('Working directory:', process.cwd());

// Start backend API
const backend = spawn('node', ['dist/index.js'], {
  cwd: path.join(__dirname, 'packages', 'backend'),
  stdio: 'inherit',
  env: { ...process.env }
});

// Start workers
const workers = spawn('node', ['dist/index.js'], {
  cwd: path.join(__dirname, 'packages', 'workers'),
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
  process.exit(code || 0);
});

workers.on('exit', (code) => {
  console.log(`Workers exited with code ${code}`);
  backend.kill();
  process.exit(code || 0);
});

console.log('Backend and Workers started successfully');
