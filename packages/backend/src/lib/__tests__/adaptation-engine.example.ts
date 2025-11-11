/**
 * Adaptation Engine - Example Usage
 *
 * This file demonstrates how to use the adaptation engine.
 * Run with: ts-node packages/backend/src/lib/__tests__/adaptation-engine.example.ts
 */

import { createAdaptationService } from '../adaptation-service';
import { ContextMapSegment } from '../../../../shared/src/types';

async function main() {
  console.log('=== Adaptation Engine Example ===\n');

  // Example segment from Context Map
  const testSegment: ContextMapSegment = {
    id: 0,
    start_ms: 0,
    end_ms: 3500,
    duration: 3.5,
    text: 'Hello everyone, welcome to my channel.',
    speaker: 'SPEAKER_00',
    confidence: 0.95,
    emotion: 'happy',
    previous_line: null,
    next_line: "Today we're going to talk about AI dubbing.",
    status: 'pending',
    attempts: 0,
  };

  console.log('Input Segment:');
  console.log(`  Text: "${testSegment.text}"`);
  console.log(`  Duration: ${testSegment.duration}s`);
  console.log(`  Emotion: ${testSegment.emotion}`);
  console.log(`  Next line: "${testSegment.next_line}"`);
  console.log();

  // Create adaptation service
  const service = createAdaptationService({
    sourceLanguage: 'en',
    targetLanguage: 'es',
    maxRetries: 2,
    glossary: {
      AI: 'IA',
      'machine learning': 'aprendizaje automático',
    },
  });

  // Test API connection
  console.log('Testing Gemini API connection...');
  const isConnected = await service.testConnection();

  if (!isConnected) {
    console.error('✗ Failed to connect to Gemini API');
    console.error('Please set GEMINI_API_KEY in your .env file');
    process.exit(1);
  }

  console.log('✓ Connected to Gemini API\n');

  // Adapt the segment
  console.log('Adapting segment...');
  const result = await service.adaptSegment(testSegment);

  console.log('\nResult:');
  console.log(`  Adapted text: "${result.adaptedText}"`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Attempts: ${result.attempts}`);
  console.log(`  Feedback: ${result.validationFeedback}`);
  console.log();

  // Example with multiple segments
  const segments: ContextMapSegment[] = [
    {
      id: 0,
      start_ms: 0,
      end_ms: 3500,
      duration: 3.5,
      text: 'Hello everyone, welcome to my channel.',
      speaker: 'SPEAKER_00',
      confidence: 0.95,
      emotion: 'happy',
      previous_line: null,
      next_line: "Today we're going to talk about AI dubbing.",
      status: 'pending',
      attempts: 0,
    },
    {
      id: 1,
      start_ms: 3500,
      end_ms: 7200,
      duration: 3.7,
      text: "Today we're going to talk about AI dubbing.",
      speaker: 'SPEAKER_00',
      confidence: 0.92,
      emotion: 'neutral',
      previous_line: 'Hello everyone, welcome to my channel.',
      next_line: 'This technology is amazing.',
      status: 'pending',
      attempts: 0,
    },
    {
      id: 2,
      start_ms: 7200,
      end_ms: 9400,
      duration: 2.2,
      text: 'This technology is amazing.',
      speaker: 'SPEAKER_00',
      confidence: 0.94,
      emotion: 'excited',
      previous_line: "Today we're going to talk about AI dubbing.",
      next_line: null,
      status: 'pending',
      attempts: 0,
    },
  ];

  console.log('Adapting multiple segments in parallel...');
  const results = await service.adaptSegmentsParallel(segments, 2);

  console.log('\nResults:');
  results.forEach((result, index) => {
    console.log(`\nSegment ${index}:`);
    console.log(`  Original: "${segments[index].text}"`);
    console.log(`  Adapted: "${result.adaptedText}"`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Attempts: ${result.attempts}`);
  });

  // Get statistics
  const stats = service.getAdaptationStats(results);
  console.log('\nStatistics:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Successful: ${stats.successful}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Success rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`  Average attempts: ${stats.averageAttempts.toFixed(2)}`);

  // Generate summary report
  const report = service.generateSummaryReport(results);
  console.log('\n' + report);
}

// Run example
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✓ Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Example failed:', error);
      process.exit(1);
    });
}

export { main };
