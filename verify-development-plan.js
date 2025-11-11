#!/usr/bin/env node

/**
 * Verify System Against Development Plan
 * 
 * Checks that all components from the development plan are implemented
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 Verifying System Against Development Plan\n');
console.log('='.repeat(70));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function check(name, test) {
  try {
    const result = test();
    if (result === 'warning') {
      console.log(`  ⚠️  ${name}`);
      results.warnings.push(name);
    } else {
      console.log(`  ✅ ${name}`);
      results.passed.push(name);
    }
    return true;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${error.message}`);
    results.failed.push({ name, error: error.message });
    return false;
  }
}

// ============================================================================
// PHASE 1: Foundation & Pre-flight Checks
// ============================================================================
console.log('\n📋 PHASE 1: Foundation & Pre-flight Checks');
console.log('='.repeat(70));

check('Demucs adapter exists', () => {
  const path = 'packages/backend/src/adapters/demucs-adapter.ts';
  if (!fs.existsSync(path)) throw new Error('Demucs adapter not found');
});

check('Demucs service exists', () => {
  const path = 'packages/workers/docker/demucs/demucs_service.py';
  if (!fs.existsSync(path)) throw new Error('Demucs service not found');
});

check('Noisereduce adapter exists', () => {
  const path = 'packages/backend/src/adapters/noisereduce-adapter.ts';
  if (!fs.existsSync(path)) throw new Error('Noisereduce adapter not found');
});

check('Noisereduce service exists', () => {
  const path = 'packages/workers/docker/noisereduce/noisereduce_service.py';
  if (!fs.existsSync(path)) throw new Error('Noisereduce service not found');
});

check('Pre-flight validator exists', () => {
  const path = 'packages/backend/src/lib/pre-flight-validator.ts';
  if (!fs.existsSync(path)) throw new Error('Pre-flight validator not found');
});

check('Pre-flight validator (Python) exists', () => {
  const path = 'packages/workers/python/pre_flight_validator.py';
  if (!fs.existsSync(path)) throw new Error('Python pre-flight validator not found');
});

// ============================================================================
// PHASE 2: Context Engine & Vocal Isolation
// ============================================================================
console.log('\n📋 PHASE 2: Context Engine & Vocal Isolation');
console.log('='.repeat(70));

check('Context Map service exists', () => {
  const path = 'packages/backend/src/lib/context-map.ts';
  if (!fs.existsSync(path)) throw new Error('Context Map service not found');
});

check('Context Map Python service exists', () => {
  const path = 'packages/workers/python/context_map_service.py';
  if (!fs.existsSync(path)) throw new Error('Context Map Python service not found');
});

check('Vocal isolation worker exists', () => {
  const path = 'packages/workers/src/vocal-isolation-worker.ts';
  if (!fs.existsSync(path)) throw new Error('Vocal isolation worker not found');
});

check('Vocal isolation quality checker exists', () => {
  const path = 'packages/backend/src/lib/vocal-isolation-quality.ts';
  if (!fs.existsSync(path)) throw new Error('Vocal isolation quality checker not found');
});

check('Emotion analysis adapter exists', () => {
  const path = 'packages/backend/src/adapters/emotion-adapter.ts';
  if (!fs.existsSync(path)) throw new Error('Emotion adapter not found');
});

check('Emotion analysis service exists', () => {
  const path = 'packages/workers/docker/emotion/emotion_service.py';
  if (!fs.existsSync(path)) throw new Error('Emotion service not found');
});

check('Emotion analysis worker exists', () => {
  const path = 'packages/workers/src/emotion-analysis-worker.ts';
  if (!fs.existsSync(path)) throw new Error('Emotion analysis worker not found');
});

// ============================================================================
// PHASE 3: Intelligent Adaptation Engine
// ============================================================================
console.log('\n📋 PHASE 3: Intelligent Adaptation Engine');
console.log('='.repeat(70));

check('Adaptation Engine exists', () => {
  const path = 'packages/backend/src/lib/adaptation-engine.ts';
  if (!fs.existsSync(path)) throw new Error('Adaptation Engine not found');
});

check('Gemini client exists', () => {
  const path = 'packages/backend/src/lib/gemini-client.ts';
  if (!fs.existsSync(path)) throw new Error('Gemini client not found');
});

check('Few-shot loader exists', () => {
  const path = 'packages/backend/src/lib/few-shot-loader.ts';
  if (!fs.existsSync(path)) throw new Error('Few-shot loader not found');
});

check('Few-shot examples exist', () => {
  const path = 'packages/backend/src/lib/few-shot-examples.json';
  if (!fs.existsSync(path)) throw new Error('Few-shot examples not found');
});

check('Translation validator exists', () => {
  const path = 'packages/backend/src/lib/translation-validator.ts';
  if (!fs.existsSync(path)) throw new Error('Translation validator not found');
});

check('Adaptation worker exists', () => {
  const path = 'packages/workers/src/adaptation-worker.ts';
  if (!fs.existsSync(path)) throw new Error('Adaptation worker not found');
});

check('Adaptation metrics exists', () => {
  const path = 'packages/backend/src/lib/adaptation-metrics.ts';
  if (!fs.existsSync(path)) throw new Error('Adaptation metrics not found');
});

// ============================================================================
// PHASE 4: Pipeline Integration & Audio Generation
// ============================================================================
console.log('\n📋 PHASE 4: Pipeline Integration & Audio Generation');
console.log('='.repeat(70));

check('OpenVoice adapter exists (NOT YourTTS)', () => {
  const path = 'packages/backend/src/adapters/openvoice-adapter.ts';
  if (!fs.existsSync(path)) throw new Error('OpenVoice adapter not found');
  
  // Verify it's OpenVoice, not YourTTS
  const content = fs.readFileSync(path, 'utf8');
  if (content.includes('yourtts') || content.includes('YourTTS')) {
    throw new Error('Found YourTTS references - should be OpenVoice only!');
  }
});

check('OpenVoice service exists', () => {
  const path = 'packages/workers/docker/openvoice/openvoice_service.py';
  if (!fs.existsSync(path)) throw new Error('OpenVoice service not found');
});

check('OpenVoice uses clean prompts', () => {
  const path = 'packages/workers/docker/openvoice/openvoice_service.py';
  const content = fs.readFileSync(path, 'utf8');
  if (!content.includes('clean_prompt') && !content.includes('style_prompt')) {
    return 'warning';
  }
});

// ============================================================================
// PHASE 5: Absolute Sync Final Assembly
// ============================================================================
console.log('\n📋 PHASE 5: Absolute Sync Final Assembly');
console.log('='.repeat(70));

check('Absolute sync assembler exists', () => {
  const path = 'packages/workers/python/absolute_sync_assembler.py';
  if (!fs.existsSync(path)) throw new Error('Absolute sync assembler not found');
});

check('Absolute sync uses atempo conforming', () => {
  const path = 'packages/workers/python/absolute_sync_assembler.py';
  const content = fs.readFileSync(path, 'utf8');
  if (!content.includes('atempo')) {
    throw new Error('Absolute sync should use FFmpeg atempo filter');
  }
});

check('Absolute sync uses overlay method', () => {
  const path = 'packages/workers/python/absolute_sync_assembler.py';
  const content = fs.readFileSync(path, 'utf8');
  if (!content.includes('overlay') && !content.includes('paste')) {
    return 'warning';
  }
});

check('Final assembly worker exists', () => {
  const path = 'packages/workers/src/final-assembly-worker.ts';
  if (!fs.existsSync(path)) throw new Error('Final assembly worker not found');
});

check('Muxing worker exists', () => {
  const path = 'packages/workers/src/muxing-worker.ts';
  if (!fs.existsSync(path)) throw new Error('Muxing worker not found');
});

check('Sync validator exists', () => {
  const path = 'packages/backend/src/lib/sync-validator.ts';
  if (!fs.existsSync(path)) throw new Error('Sync validator not found');
});

// ============================================================================
// CONFIGURATION CHECKS
// ============================================================================
console.log('\n📋 Configuration Checks');
console.log('='.repeat(70));

check('Using OpenAI Whisper (not local)', () => {
  const envPath = 'packages/backend/.env';
  const content = fs.readFileSync(envPath, 'utf8');
  if (!content.includes('USE_OPENAI_WHISPER=true')) {
    return 'warning';
  }
});

check('Gemini API configured', () => {
  const envPath = 'packages/backend/.env';
  const content = fs.readFileSync(envPath, 'utf8');
  if (!content.includes('GEMINI_API_KEY=')) {
    throw new Error('GEMINI_API_KEY not configured');
  }
});

check('NOT using YourTTS', () => {
  // Check that YourTTS is not referenced in active code
  const files = [
    'packages/backend/src/adapters/openvoice-adapter.ts',
    'packages/workers/src/adaptation-worker.ts',
    'packages/workers/src/final-assembly-worker.ts'
  ];
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.toLowerCase().includes('yourtts')) {
        throw new Error(`Found YourTTS reference in ${file} - should use OpenVoice!`);
      }
    }
  }
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(70));

console.log(`\n✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ Failed Checks:');
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
  console.log('✅ SYSTEM MATCHES DEVELOPMENT PLAN!');
  console.log('='.repeat(70));
  console.log('\n🎯 Your Development Plan Implementation:');
  console.log('  ✅ Phase 1: Foundation & Pre-flight Checks');
  console.log('  ✅ Phase 2: Context Engine & Vocal Isolation');
  console.log('  ✅ Phase 3: Intelligent Adaptation Engine');
  console.log('  ✅ Phase 4: Pipeline Integration (OpenVoice)');
  console.log('  ✅ Phase 5: Absolute Sync Final Assembly');
  console.log('\n🚀 All core components from your plan are implemented!');
  process.exit(0);
} else {
  console.log('❌ SYSTEM DOES NOT MATCH DEVELOPMENT PLAN');
  console.log('='.repeat(70));
  console.log('\n🔧 Please fix the failed checks above.');
  process.exit(1);
}
