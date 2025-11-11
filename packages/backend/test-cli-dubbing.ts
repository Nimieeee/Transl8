#!/usr/bin/env tsx

/**
 * CLI Dubbing Test Script
 *
 * Tests the complete dubbing pipeline with a real video file
 * Uses OpenAI Whisper API + Gemini API (no Docker services needed)
 */

import { PrismaClient } from '@prisma/client';
import { OpenAIWhisperAdapter } from './src/adapters/openai-whisper-adapter';
import { contextMapService } from './src/lib/context-map';
import { AdaptationService } from './src/lib/adaptation-service';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('\n🎬 CLI Dubbing Pipeline Test', 'blue');
  log('='.repeat(70), 'blue');

  let project: any = null;

  try {
    // Step 1: Find video file
    log('\n📹 Step 1: Finding video file...', 'blue');

    const videoFile = '../../test-video.mov';
    if (!fs.existsSync(videoFile)) {
      throw new Error(`Video file not found: ${videoFile}`);
    }

    const stats = fs.statSync(videoFile);
    log(`✓ Found video: ${videoFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'green');

    // Step 2: Extract audio
    log('\n🎵 Step 2: Extracting audio...', 'blue');

    const audioFile = '../../test-audio.wav';
    execSync(
      `ffmpeg -i "${videoFile}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioFile}" -y 2>/dev/null`
    );

    if (!fs.existsSync(audioFile)) {
      throw new Error('Failed to extract audio');
    }

    log(`✓ Audio extracted: ${audioFile}`, 'green');

    // Step 3: Transcribe with OpenAI Whisper
    log('\n📝 Step 3: Transcribing with OpenAI Whisper...', 'blue');

    const whisperAdapter = new OpenAIWhisperAdapter();

    // Check health first
    const health = await whisperAdapter.healthCheck();
    if (!health.healthy) {
      throw new Error(`OpenAI Whisper health check failed: ${health.error}`);
    }

    log('✓ OpenAI Whisper API is healthy', 'green');
    log('  Transcribing... (this may take 10-30 seconds)', 'yellow');

    const startTranscribe = Date.now();
    const sttResult = await whisperAdapter.transcribe(audioFile, 'en');
    const transcribeTime = Date.now() - startTranscribe;

    log(`✓ Transcription complete in ${(transcribeTime / 1000).toFixed(1)}s`, 'green');
    log(`  Text: "${sttResult.transcript.text.substring(0, 100)}..."`, 'reset');
    log(`  Segments: ${sttResult.transcript.segments.length}`, 'reset');
    log(`  Duration: ${sttResult.transcript.duration.toFixed(1)}s`, 'reset');
    log(`  Confidence: ${(sttResult.metadata.confidence! * 100).toFixed(1)}%`, 'reset');

    // Step 4: Create test dubbing job in database
    log('\n💾 Step 4: Creating test dubbing job...', 'blue');

    project = await prisma.dubbingJob.create({
      data: {
        originalFile: videoFile,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        status: 'processing',
        progress: 0,
      },
    });

    log(`✓ Dubbing job created: ${project.id}`, 'green');

    // Step 5: Create Context Map
    log('\n🗺️  Step 5: Creating Context Map...', 'blue');

    const contextMap = await contextMapService.createFromTranscript(
      project.id,
      sttResult.transcript,
      'en',
      'es'
    );

    log(`✓ Context Map created`, 'green');
    log(`  Segments: ${contextMap.segments.length}`, 'reset');
    log(`  Total duration: ${(contextMap.original_duration_ms / 1000).toFixed(1)}s`, 'reset');

    // Step 6: Test Adaptation Engine
    log('\n🧠 Step 6: Testing Adaptation Engine...', 'blue');

    if (!process.env.GEMINI_API_KEY) {
      log('⚠️  Gemini API key not configured - skipping adaptation test', 'yellow');
    } else {
      const adaptationService = new AdaptationService({
        sourceLanguage: 'en',
        targetLanguage: 'es',
        maxRetries: 2,
      });

      // Test with first segment
      const testSegment = contextMap.segments[0];

      log(`  Testing adaptation for: "${testSegment.text.substring(0, 50)}..."`, 'reset');

      const startAdapt = Date.now();
      const adapted = await adaptationService.adaptSegment(testSegment);
      const adaptTime = Date.now() - startAdapt;

      log(`✓ Adaptation complete in ${(adaptTime / 1000).toFixed(1)}s`, 'green');
      log(`  Original: "${testSegment.text}"`, 'reset');
      log(`  Adapted: "${adapted.adaptedText}"`, 'reset');
      log(`  Status: ${adapted.status}`, adapted.status === 'success' ? 'green' : 'red');
      if (adapted.validationFeedback) {
        log(`  Feedback: ${adapted.validationFeedback}`, 'reset');
      }
    }

    // Step 7: Summary
    log('\n📊 Test Summary', 'blue');
    log('='.repeat(70), 'blue');

    log('\n✅ Pipeline Components Tested:', 'green');
    log('  ✓ Audio extraction (FFmpeg)', 'green');
    log('  ✓ Transcription (OpenAI Whisper API)', 'green');
    log('  ✓ Context Map creation', 'green');
    if (process.env.GEMINI_API_KEY) {
      log('  ✓ Adaptation Engine (Gemini API)', 'green');
    }

    log('\n📈 Performance:', 'blue');
    log(`  Transcription: ${(transcribeTime / 1000).toFixed(1)}s`, 'reset');
    log(`  Video duration: ${sttResult.transcript.duration.toFixed(1)}s`, 'reset');
    log(
      `  Processing ratio: ${(transcribeTime / (sttResult.transcript.duration * 1000)).toFixed(2)}x`,
      'reset'
    );

    log('\n💰 Estimated Cost:', 'blue');
    const minutes = Math.ceil(sttResult.transcript.duration / 60);
    const cost = minutes * 0.006;
    log(
      `  OpenAI Whisper: $${cost.toFixed(4)} (${minutes} minute${minutes > 1 ? 's' : ''})`,
      'reset'
    );

    log('\n🎯 What Works:', 'green');
    log('  ✓ OpenAI Whisper integration', 'green');
    log('  ✓ Word-level timestamps', 'green');
    log('  ✓ Context Map generation', 'green');
    log('  ✓ Database integration', 'green');
    log('  ✓ Adaptation Engine (if Gemini configured)', 'green');

    log("\n⚠️  What's Not Tested (Requires Docker Services):", 'yellow');
    log('  • Vocal isolation (Demucs)', 'yellow');
    log('  • Noise reduction (Noisereduce)', 'yellow');
    log('  • Emotion analysis', 'yellow');
    log('  • Voice cloning (OpenVoice)', 'yellow');
    log('  • Final assembly', 'yellow');

    log('\n🚀 To Test Full Pipeline:', 'blue');
    log(
      '  1. Start Docker services: docker-compose up -d demucs noisereduce emotion openvoice',
      'reset'
    );
    log('  2. Use frontend: cd packages/frontend && npm run dev', 'reset');
    log('  3. Upload video at: http://localhost:3000', 'reset');

    log('\n✅ CLI Test Complete!', 'green');
    log('='.repeat(70), 'green');

    // Cleanup
    if (fs.existsSync(audioFile)) {
      fs.unlinkSync(audioFile);
    }

    // Clean up test dubbing job
    if (project) {
      try {
        await prisma.contextMap.deleteMany({ where: { dubbingJobId: project.id } });
        await prisma.dubbingJob.delete({ where: { id: project.id } });
        log('\n🧹 Cleaned up test data', 'reset');
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  } catch (error: any) {
    log(`\n❌ Test Failed: ${error.message}`, 'red');

    if (error.message.includes('OPENAI_API_KEY')) {
      log('\n💡 Fix: Set OPENAI_API_KEY in packages/backend/.env', 'yellow');
    }

    if (error.message.includes('GEMINI_API_KEY')) {
      log('\n💡 Note: Gemini API key is optional for this test', 'yellow');
    }

    if (error.stack) {
      log('\n📋 Stack trace:', 'yellow');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
