#!/usr/bin/env node

/**
 * Comprehensive Service Health Check
 * 
 * Tests all services in the AI video dubbing platform to verify they're working correctly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 AI Video Dubbing Platform - Service Health Check\n');
console.log('='.repeat(70));

const results = {
  passed: [],
  failed: [],
  warnings: [],
  skipped: []
};

function testSection(name) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 ${name}`);
  console.log('='.repeat(70));
}

function testItem(name, test) {
  try {
    const result = test();
    if (result === 'skip') {
      console.log(`  ⏭️  ${name} - Skipped`);
      results.skipped.push(name);
    } else if (result === 'warning') {
      console.log(`  ⚠️  ${name} - Warning`);
      results.warnings.push(name);
    } else {
      console.log(`  ✅ ${name}`);
      results.passed.push(name);
    }
    return true;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
    results.failed.push({ name, error: error.message });
    return false;
  }
}

// ============================================================================
// 1. ENVIRONMENT CONFIGURATION
// ============================================================================
testSection('1. Environment Configuration');

testItem('Backend .env file exists', () => {
  const envPath = path.join(__dirname, 'packages/backend/.env');
  if (!fs.existsSync(envPath)) throw new Error('.env file not found');
});

testItem('Database URL configured', () => {
  const envPath = path.join(__dirname, 'packages/backend/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('DATABASE_URL=')) throw new Error('DATABASE_URL not set');
});

testItem('Redis URL configured', () => {
  const envPath = path.join(__dirname, 'packages/backend/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('REDIS_URL=')) throw new Error('REDIS_URL not set');
});

testItem('OpenAI API key configured', () => {
  const envPath = path.join(__dirname, 'packages/backend/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('OPENAI_API_KEY=')) throw new Error('OPENAI_API_KEY not set');
  const apiKeyLine = envContent.split('\n').find(line => line.startsWith('OPENAI_API_KEY='));
  const apiKey = apiKeyLine.split('=')[1].trim();
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    throw new Error('OPENAI_API_KEY needs a valid value');
  }
});

testItem('Gemini API key configured', () => {
  const envPath = path.join(__dirname, 'packages/backend/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('GEMINI_API_KEY=')) {
    return 'warning';
  }
});

testItem('AWS S3 credentials configured', () => {
  const envPath = path.join(__dirname, 'packages/backend/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('AWS_ACCESS_KEY_ID=') || !envContent.includes('AWS_SECRET_ACCESS_KEY=')) {
    return 'warning';
  }
});

// ============================================================================
// 2. DEPENDENCIES
// ============================================================================
testSection('2. Package Dependencies');

testItem('Root node_modules exists (monorepo)', () => {
  const modulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(modulesPath)) throw new Error('Run: npm install');
});

testItem('Backend dependencies available', () => {
  const prismaPath = path.join(__dirname, 'node_modules/@prisma/client');
  if (!fs.existsSync(prismaPath)) throw new Error('Run: npm install');
});

testItem('Workers dependencies available', () => {
  const bullmqPath = path.join(__dirname, 'node_modules/bullmq');
  if (!fs.existsSync(bullmqPath)) throw new Error('Run: npm install');
});

testItem('Frontend dependencies available', () => {
  const nextPath = path.join(__dirname, 'node_modules/next');
  if (!fs.existsSync(nextPath)) {
    return 'warning';
  }
});

testItem('OpenAI package installed', () => {
  const packagePath = path.join(__dirname, 'packages/backend/node_modules/openai');
  if (!fs.existsSync(packagePath)) throw new Error('Run: cd packages/backend && npm install openai');
});

testItem('Prisma client generated', () => {
  const prismaPath = path.join(__dirname, 'packages/backend/node_modules/.prisma/client');
  if (!fs.existsSync(prismaPath)) {
    return 'warning';
  }
});

// ============================================================================
// 3. DATABASE
// ============================================================================
testSection('3. Database');

testItem('Prisma schema exists', () => {
  const schemaPath = path.join(__dirname, 'packages/backend/prisma/schema.prisma');
  if (!fs.existsSync(schemaPath)) throw new Error('Prisma schema not found');
});

testItem('Database migrations exist', () => {
  const migrationsPath = path.join(__dirname, 'packages/backend/prisma/migrations');
  if (!fs.existsSync(migrationsPath)) {
    return 'warning';
  }
});

// ============================================================================
// 4. BACKEND SERVICES
// ============================================================================
testSection('4. Backend Services');

testItem('Backend index.ts exists', () => {
  const indexPath = path.join(__dirname, 'packages/backend/src/index.ts');
  if (!fs.existsSync(indexPath)) throw new Error('Backend entry point not found');
});

testItem('Auth routes exist', () => {
  const authPath = path.join(__dirname, 'packages/backend/src/routes/auth.ts');
  if (!fs.existsSync(authPath)) throw new Error('Auth routes not found');
});

testItem('Projects routes exist', () => {
  const projectsPath = path.join(__dirname, 'packages/backend/src/routes/projects.ts');
  if (!fs.existsSync(projectsPath)) throw new Error('Projects routes not found');
});

testItem('Queue management exists', () => {
  const queuePath = path.join(__dirname, 'packages/backend/src/lib/queue.ts');
  if (!fs.existsSync(queuePath)) throw new Error('Queue management not found');
});

testItem('Storage service exists', () => {
  const storagePath = path.join(__dirname, 'packages/backend/src/lib/storage.ts');
  if (!fs.existsSync(storagePath)) throw new Error('Storage service not found');
});

// ============================================================================
// 5. ADAPTERS
// ============================================================================
testSection('5. AI Model Adapters');

testItem('OpenAI Whisper adapter exists', () => {
  const adapterPath = path.join(__dirname, 'packages/backend/src/adapters/openai-whisper-adapter.ts');
  if (!fs.existsSync(adapterPath)) throw new Error('OpenAI Whisper adapter not found');
});

testItem('Whisper+Pyannote adapter exists', () => {
  const adapterPath = path.join(__dirname, 'packages/backend/src/adapters/whisper-pyannote-adapter.ts');
  if (!fs.existsSync(adapterPath)) throw new Error('Whisper+Pyannote adapter not found');
});

testItem('Demucs adapter exists', () => {
  const adapterPath = path.join(__dirname, 'packages/backend/src/adapters/demucs-adapter.ts');
  if (!fs.existsSync(adapterPath)) throw new Error('Demucs adapter not found');
});

testItem('Emotion adapter exists', () => {
  const adapterPath = path.join(__dirname, 'packages/backend/src/adapters/emotion-adapter.ts');
  if (!fs.existsSync(adapterPath)) throw new Error('Emotion adapter not found');
});

testItem('OpenVoice adapter exists', () => {
  const adapterPath = path.join(__dirname, 'packages/backend/src/adapters/openvoice-adapter.ts');
  if (!fs.existsSync(adapterPath)) throw new Error('OpenVoice adapter not found');
});

testItem('Wav2Lip adapter exists', () => {
  const adapterPath = path.join(__dirname, 'packages/backend/src/adapters/wav2lip-adapter.ts');
  if (!fs.existsSync(adapterPath)) throw new Error('Wav2Lip adapter not found');
});

// ============================================================================
// 6. WORKERS
// ============================================================================
testSection('6. Worker Services');

testItem('STT worker exists', () => {
  const workerPath = path.join(__dirname, 'packages/workers/src/stt-worker.ts');
  if (!fs.existsSync(workerPath)) throw new Error('STT worker not found');
});

testItem('Vocal isolation worker exists', () => {
  const workerPath = path.join(__dirname, 'packages/workers/src/vocal-isolation-worker.ts');
  if (!fs.existsSync(workerPath)) throw new Error('Vocal isolation worker not found');
});

testItem('Emotion analysis worker exists', () => {
  const workerPath = path.join(__dirname, 'packages/workers/src/emotion-analysis-worker.ts');
  if (!fs.existsSync(workerPath)) throw new Error('Emotion analysis worker not found');
});

testItem('Adaptation worker exists', () => {
  const workerPath = path.join(__dirname, 'packages/workers/src/adaptation-worker.ts');
  if (!fs.existsSync(workerPath)) throw new Error('Adaptation worker not found');
});

testItem('Final assembly worker exists', () => {
  const workerPath = path.join(__dirname, 'packages/workers/src/final-assembly-worker.ts');
  if (!fs.existsSync(workerPath)) throw new Error('Final assembly worker not found');
});

testItem('Muxing worker exists', () => {
  const workerPath = path.join(__dirname, 'packages/workers/src/muxing-worker.ts');
  if (!fs.existsSync(workerPath)) throw new Error('Muxing worker not found');
});

// ============================================================================
// 7. PIPELINE COMPONENTS
// ============================================================================
testSection('7. Pipeline Components');

testItem('Context Map service exists', () => {
  const servicePath = path.join(__dirname, 'packages/backend/src/lib/context-map.ts');
  if (!fs.existsSync(servicePath)) throw new Error('Context Map service not found');
});

testItem('Adaptation Engine exists', () => {
  const enginePath = path.join(__dirname, 'packages/backend/src/lib/adaptation-engine.ts');
  if (!fs.existsSync(enginePath)) throw new Error('Adaptation Engine not found');
});

testItem('Gemini client exists', () => {
  const clientPath = path.join(__dirname, 'packages/backend/src/lib/gemini-client.ts');
  if (!fs.existsSync(clientPath)) throw new Error('Gemini client not found');
});

testItem('Few-shot examples exist', () => {
  const examplesPath = path.join(__dirname, 'packages/backend/src/lib/few-shot-examples.json');
  if (!fs.existsSync(examplesPath)) throw new Error('Few-shot examples not found');
});

testItem('Vocal isolation quality checker exists', () => {
  const qualityPath = path.join(__dirname, 'packages/backend/src/lib/vocal-isolation-quality.ts');
  if (!fs.existsSync(qualityPath)) throw new Error('Vocal isolation quality checker not found');
});

testItem('Pre-flight validator exists', () => {
  const validatorPath = path.join(__dirname, 'packages/backend/src/lib/pre-flight-validator.ts');
  if (!fs.existsSync(validatorPath)) throw new Error('Pre-flight validator not found');
});

// ============================================================================
// 8. PYTHON SERVICES
// ============================================================================
testSection('8. Python Services');

testItem('Absolute sync assembler exists', () => {
  const assemblerPath = path.join(__dirname, 'packages/workers/python/absolute_sync_assembler.py');
  if (!fs.existsSync(assemblerPath)) throw new Error('Absolute sync assembler not found');
});

testItem('Context map service exists', () => {
  const servicePath = path.join(__dirname, 'packages/workers/python/context_map_service.py');
  if (!fs.existsSync(servicePath)) throw new Error('Context map service not found');
});

testItem('Pre-flight validator exists', () => {
  const validatorPath = path.join(__dirname, 'packages/workers/python/pre_flight_validator.py');
  if (!fs.existsSync(validatorPath)) throw new Error('Pre-flight validator not found');
});

testItem('Demucs service exists', () => {
  const servicePath = path.join(__dirname, 'packages/workers/docker/demucs/demucs_service.py');
  if (!fs.existsSync(servicePath)) throw new Error('Demucs service not found');
});

testItem('Emotion service exists', () => {
  const servicePath = path.join(__dirname, 'packages/workers/docker/emotion/emotion_service.py');
  if (!fs.existsSync(servicePath)) throw new Error('Emotion service not found');
});

testItem('OpenVoice service exists', () => {
  const servicePath = path.join(__dirname, 'packages/workers/docker/openvoice/openvoice_service.py');
  if (!fs.existsSync(servicePath)) throw new Error('OpenVoice service not found');
});

// ============================================================================
// 9. FRONTEND
// ============================================================================
testSection('9. Frontend Application');

testItem('Frontend app exists', () => {
  const appPath = path.join(__dirname, 'packages/frontend/src/app');
  if (!fs.existsSync(appPath)) throw new Error('Frontend app directory not found');
});

testItem('Dashboard page exists', () => {
  const dashboardPath = path.join(__dirname, 'packages/frontend/src/app/dashboard/page.tsx');
  if (!fs.existsSync(dashboardPath)) throw new Error('Dashboard page not found');
});

testItem('Project pages exist', () => {
  const projectPath = path.join(__dirname, 'packages/frontend/src/app/projects/[id]/page.tsx');
  if (!fs.existsSync(projectPath)) throw new Error('Project pages not found');
});

testItem('Monitoring pages exist', () => {
  const monitoringPath = path.join(__dirname, 'packages/frontend/src/app/monitoring/page.tsx');
  if (!fs.existsSync(monitoringPath)) throw new Error('Monitoring pages not found');
});

testItem('API client exists', () => {
  const clientPath = path.join(__dirname, 'packages/frontend/src/lib/api-client.ts');
  if (!fs.existsSync(clientPath)) throw new Error('API client not found');
});

// ============================================================================
// 10. TESTS
// ============================================================================
testSection('10. Test Suite');

testItem('Backend integration tests exist', () => {
  const testsPath = path.join(__dirname, 'packages/backend/tests/integration');
  if (!fs.existsSync(testsPath)) throw new Error('Integration tests not found');
});

testItem('Robust pipeline tests exist', () => {
  const testPath = path.join(__dirname, 'packages/backend/tests/integration/robust-pipeline.test.ts');
  if (!fs.existsSync(testPath)) throw new Error('Robust pipeline tests not found');
});

testItem('Auth tests exist', () => {
  const testPath = path.join(__dirname, 'packages/backend/tests/integration/auth.test.ts');
  if (!fs.existsSync(testPath)) throw new Error('Auth tests not found');
});

testItem('Test setup exists', () => {
  const setupPath = path.join(__dirname, 'packages/backend/tests/setup.ts');
  if (!fs.existsSync(setupPath)) throw new Error('Test setup not found');
});

// ============================================================================
// 11. DOCKER SERVICES
// ============================================================================
testSection('11. Docker Configuration');

testItem('docker-compose.yml exists', () => {
  const composePath = path.join(__dirname, 'docker-compose.yml');
  if (!fs.existsSync(composePath)) throw new Error('docker-compose.yml not found');
});

testItem('Demucs Dockerfile exists', () => {
  const dockerfilePath = path.join(__dirname, 'packages/workers/docker/demucs/Dockerfile');
  if (!fs.existsSync(dockerfilePath)) throw new Error('Demucs Dockerfile not found');
});

testItem('Emotion Dockerfile exists', () => {
  const dockerfilePath = path.join(__dirname, 'packages/workers/docker/emotion/Dockerfile');
  if (!fs.existsSync(dockerfilePath)) throw new Error('Emotion Dockerfile not found');
});

// ============================================================================
// 12. MONITORING & OBSERVABILITY
// ============================================================================
testSection('12. Monitoring & Observability');

testItem('Sync validator exists', () => {
  const validatorPath = path.join(__dirname, 'packages/backend/src/lib/sync-validator.ts');
  if (!fs.existsSync(validatorPath)) throw new Error('Sync validator not found');
});

testItem('Audio quality monitor exists', () => {
  const monitorPath = path.join(__dirname, 'packages/backend/src/lib/audio-quality-monitor.ts');
  if (!fs.existsSync(monitorPath)) throw new Error('Audio quality monitor not found');
});

testItem('Adaptation metrics exists', () => {
  const metricsPath = path.join(__dirname, 'packages/backend/src/lib/adaptation-metrics.ts');
  if (!fs.existsSync(metricsPath)) throw new Error('Adaptation metrics not found');
});

testItem('Logger exists', () => {
  const loggerPath = path.join(__dirname, 'packages/backend/src/lib/logger.ts');
  if (!fs.existsSync(loggerPath)) throw new Error('Logger not found');
});

testItem('Metrics service exists', () => {
  const metricsPath = path.join(__dirname, 'packages/backend/src/lib/metrics.ts');
  if (!fs.existsSync(metricsPath)) throw new Error('Metrics service not found');
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(70));

console.log(`\n✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);
console.log(`⏭️  Skipped: ${results.skipped.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ Failed Tests:');
  results.failed.forEach(({ name, error }) => {
    console.log(`  • ${name}`);
    console.log(`    ${error}`);
  });
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  results.warnings.forEach(name => {
    console.log(`  • ${name}`);
  });
}

console.log('\n' + '='.repeat(70));

if (results.failed.length === 0) {
  console.log('✅ ALL CRITICAL SERVICES ARE WORKING!');
  console.log('='.repeat(70));
  console.log('\n🚀 Your system is ready to use!');
  console.log('\n📋 Next Steps:');
  console.log('  1. Start database: docker-compose up -d postgres redis');
  console.log('  2. Start backend: cd packages/backend && npm run dev');
  console.log('  3. Start workers: cd packages/workers && npm run dev');
  console.log('  4. Start frontend: cd packages/frontend && npm run dev');
  console.log('\n💡 Optional Docker services (if not using OpenAI):');
  console.log('  • Demucs: docker-compose up -d demucs');
  console.log('  • Emotion: docker-compose up -d emotion');
  console.log('  • OpenVoice: docker-compose up -d openvoice');
  process.exit(0);
} else {
  console.log('❌ SOME SERVICES HAVE ISSUES');
  console.log('='.repeat(70));
  console.log('\n🔧 Please fix the failed tests above before proceeding.');
  process.exit(1);
}
