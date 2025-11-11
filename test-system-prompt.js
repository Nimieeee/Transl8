#!/usr/bin/env node
/**
 * Test System Prompt Preview
 * 
 * Shows what the adaptation engine system prompt looks like
 */

const path = require('path');

// Load the adaptation engine
const { AdaptationEngine } = require('./packages/backend/src/lib/adaptation-engine');

const config = {
  sourceLanguage: 'en',
  targetLanguage: 'es',
  maxRetries: 2
};

const engine = new AdaptationEngine(config);

const segment = {
  id: 0,
  text: 'Get out!',
  start_time: 0,
  end_time: 0.5,
  duration: 0.5,
  emotion: 'angry',
  speaker_id: 'speaker_1'
};

console.log('='.repeat(80));
console.log('SYSTEM PROMPT PREVIEW - FIRST ATTEMPT');
console.log('='.repeat(80));
console.log();

const prompt = engine.buildPrompt(segment, 0);
console.log(prompt);

console.log();
console.log('='.repeat(80));
console.log('SYSTEM PROMPT PREVIEW - RETRY WITH FEEDBACK');
console.log('='.repeat(80));
console.log();

const retryPrompt = engine.buildPrompt(
  segment, 
  1, 
  'too long (would require speaking too fast - reduce word count)'
);
console.log(retryPrompt);

console.log();
console.log('='.repeat(80));
console.log('PROMPT STATISTICS');
console.log('='.repeat(80));
console.log();
console.log(`First attempt prompt length: ${prompt.length} characters`);
console.log(`Retry prompt length: ${retryPrompt.length} characters`);
console.log(`Difference: ${retryPrompt.length - prompt.length} characters added for retry`);
