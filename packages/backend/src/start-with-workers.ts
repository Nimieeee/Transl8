import { spawn } from 'child_process';
import path from 'path';

// Start backend server
console.log('Starting backend server...');
import './index';

// Start workers in separate process
console.log('Starting workers...');
const workersPath = path.join(__dirname, '../../workers/dist/index.js');
const workersProcess = spawn('node', [workersPath], {
  stdio: 'inherit',
  env: process.env
});

workersProcess.on('error', (error) => {
  console.error('Failed to start workers:', error);
});

workersProcess.on('exit', (code) => {
  console.log(`Workers process exited with code ${code}`);
});

console.log('✅ Backend and workers started');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  workersProcess.kill('SIGTERM');
  process.exit(0);
});
