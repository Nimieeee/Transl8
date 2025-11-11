#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

// Try to find the dist/index.js file
const possiblePaths = [
  path.join(__dirname, 'dist', 'index.js'),                    // From backend dir
  path.join(__dirname, '..', '..', 'packages', 'backend', 'dist', 'index.js'), // From root
  path.join(process.cwd(), 'dist', 'index.js'),                // Current working dir
  path.join(process.cwd(), 'packages', 'backend', 'dist', 'index.js'), // From root cwd
];

const fs = require('fs');
let indexPath = null;

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    indexPath = p;
    console.log(`Found index.js at: ${indexPath}`);
    break;
  }
}

if (!indexPath) {
  console.error('Could not find dist/index.js in any of these locations:');
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

// Start the application
require(indexPath);
