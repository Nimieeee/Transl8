import dotenv from 'dotenv';
import Redis from 'ioredis';
import { Worker } from 'bullmq';
import { STTWorker } from './stt-worker';
import { TTSWorker } from './tts-worker';
import AdaptationWorker from './adaptation-worker';
import { FinalAssemblyWorker } from './final-assembly-worker';
import { MuxingWorker } from './muxing-worker';
import { initSentry } from './lib/sentry';

dotenv.config();

// Initialize Sentry for error tracking
initSentry();

console.log('Workers service initialized');
console.log('Redis URL:', process.env.REDIS_URL);

// Redis connection for BullMQ
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Initialize workers
let sttWorker: STTWorker;
let adaptationWorker: AdaptationWorker;
let ttsWorker: TTSWorker;
let finalAssemblyWorkerInstance: FinalAssemblyWorker;
let finalAssemblyBullWorker: Worker;
let muxingWorkerInstance: MuxingWorker;
let muxingBullWorker: Worker;

async function startWorkers() {
  try {
    console.log('Starting workers...');
    console.log('Pipeline: OpenAI Whisper → Mistral AI → OpenAI TTS → Absolute Sync → FFmpeg');

    // STT Worker (OpenAI Whisper API)
    sttWorker = new STTWorker(redis);
    await sttWorker.start();
    console.log('✓ STT Worker started (OpenAI Whisper)');

    // Adaptation Worker (Mistral AI)
    adaptationWorker = new AdaptationWorker(redis);
    console.log('✓ Adaptation Worker started (Mistral AI)');

    // TTS Worker (OpenAI TTS)
    ttsWorker = new TTSWorker(redis);
    await ttsWorker.start();
    console.log('✓ TTS Worker started (OpenAI TTS)');

    // Final Assembly Worker (Absolute Sync)
    finalAssemblyWorkerInstance = new FinalAssemblyWorker(redis);
    finalAssemblyBullWorker = new Worker(
      'final-assembly',
      async (job) => finalAssemblyWorkerInstance.process(job),
      { connection: redis }
    );
    console.log('✓ Final Assembly Worker started (Absolute Sync)');

    // Muxing Worker (FFmpeg)
    muxingWorkerInstance = new MuxingWorker();
    muxingBullWorker = new Worker('muxing', async (job) => muxingWorkerInstance.process(job), {
      connection: redis,
    });
    console.log('✓ Muxing Worker started (FFmpeg)');

    console.log('');
    console.log('All workers started successfully!');
    console.log('');
    console.log('Simplified Pipeline Flow:');
    console.log('1. Frontend uploads video → Backend creates STT job');
    console.log('2. STT worker transcribes with OpenAI Whisper');
    console.log('3. STT worker creates Context Map');
    console.log('4. STT worker triggers Adaptation');
    console.log('5. Adaptation worker translates with Mistral AI');
    console.log('6. Adaptation worker triggers TTS');
    console.log('7. TTS worker synthesizes with OpenAI TTS');
    console.log('8. TTS worker triggers Final Assembly');
    console.log('9. Final Assembly creates synchronized audio with Absolute Sync');
    console.log('10. Final Assembly triggers Muxing');
    console.log('11. Muxing worker combines audio + video with FFmpeg');
    console.log('');
  } catch (error) {
    console.error('Failed to start workers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down workers...');

  if (sttWorker) await sttWorker.stop();
  if (adaptationWorker) await adaptationWorker.close();
  if (ttsWorker) await ttsWorker.stop();
  if (finalAssemblyBullWorker) await finalAssemblyBullWorker.close();
  if (finalAssemblyWorkerInstance) await finalAssemblyWorkerInstance.close();
  if (muxingBullWorker) await muxingBullWorker.close();

  await redis.quit();
  console.log('All workers stopped');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start workers
startWorkers();
