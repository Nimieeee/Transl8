#!/usr/bin/env node
/**
 * Test Short Segment Adaptation
 * 
 * Tests the "Get out!" scenario to verify intelligent adaptation
 * with retry logic and validation feedback.
 */

const { createAdaptationService } = require('./packages/backend/src/lib/adaptation-service');

async function testShortSegmentAdaptation() {
  console.log('==========================================');
  console.log('Testing Short Segment Adaptation');
  console.log('==========================================\n');

  // Test segment: "Get out!" (0.5 seconds)
  const testSegment = {
    id: 0,
    text: 'Get out!',
    start_time: 0,
    end_time: 0.5,
    duration: 0.5,
    emotion: 'angry',
    speaker_id: 'speaker_1',
  };

  console.log(`📝 Test Segment: "${testSegment.text}"`);
  console.log(`⏱️  Duration: ${testSegment.duration}s`);
  console.log(`😠 Emotion: ${testSegment.emotion}\n`);

  // Create adaptation service for English → Spanish
  const config = {
    sourceLanguage: 'en',
    targetLanguage: 'es',
    maxRetries: 2,
  };

  console.log('🔧 Creating adaptation service...');
  const adaptationService = createAdaptationService(config);

  console.log('🚀 Starting adaptation...\n');

  try {
    const result = await adaptationService.adaptSegment(testSegment);

    console.log('\n==========================================');
    console.log('Adaptation Result');
    console.log('==========================================\n');

    console.log(`Status: ${result.status}`);
    console.log(`Attempts: ${result.attempts}`);
    console.log(`Original: "${testSegment.text}"`);
    console.log(`Adapted: "${result.adaptedText}"`);
    console.log(`Feedback: ${result.validationFeedback || 'N/A'}\n`);

    // Analyze the result
    const wordCount = result.adaptedText.split(/\s+/).length;
    const charCount = result.adaptedText.length;
    const wordsPerSecond = wordCount / testSegment.duration;

    console.log('📊 Analysis:');
    console.log(`  - Word count: ${wordCount}`);
    console.log(`  - Character count: ${charCount}`);
    console.log(`  - Words per second: ${wordsPerSecond.toFixed(2)}`);
    console.log(`  - Expected: 1-2 words for 0.5s segment\n`);

    // Check if it meets our criteria
    if (result.status === 'success' && wordCount <= 2) {
      console.log('✅ SUCCESS: Adaptation meets timing requirements!');
      console.log(`   "${result.adaptedText}" is concise enough for ${testSegment.duration}s\n`);
    } else if (result.status === 'success' && wordCount > 2) {
      console.log('⚠️  WARNING: Adaptation passed validation but may be too long');
      console.log(`   ${wordCount} words might be difficult to speak in ${testSegment.duration}s\n`);
    } else {
      console.log('❌ FAILED: Adaptation did not meet requirements');
      console.log(`   Status: ${result.status}\n`);
    }

    // Test a few more examples
    console.log('==========================================');
    console.log('Testing Additional Short Segments');
    console.log('==========================================\n');

    const additionalTests = [
      { text: 'Stop!', duration: 0.4, emotion: 'angry' },
      { text: 'Help me!', duration: 0.6, emotion: 'scared' },
      { text: 'No way!', duration: 0.5, emotion: 'surprised' },
    ];

    for (const test of additionalTests) {
      const segment = {
        id: 0,
        text: test.text,
        start_time: 0,
        end_time: test.duration,
        duration: test.duration,
        emotion: test.emotion,
        speaker_id: 'speaker_1',
      };

      console.log(`Testing: "${test.text}" (${test.duration}s, ${test.emotion})`);
      
      const result = await adaptationService.adaptSegment(segment);
      const wordCount = result.adaptedText.split(/\s+/).length;
      
      console.log(`  → "${result.adaptedText}" (${wordCount} words, ${result.status})`);
      
      if (result.status === 'success' && wordCount <= 2) {
        console.log('  ✅ Meets timing requirements\n');
      } else {
        console.log(`  ⚠️  May be too long (${wordCount} words)\n`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error during adaptation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testShortSegmentAdaptation()
  .then(() => {
    console.log('==========================================');
    console.log('Test Complete');
    console.log('==========================================\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
