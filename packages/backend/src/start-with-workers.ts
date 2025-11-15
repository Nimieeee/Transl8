import { Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import backend server
import './index';

// Import worker processors
import { processStt } from '../../workers/src/stt-worker';
import { processTranslation } from '../../workers/src/translation-worker';
import { processTts } from '../../workers/src/tts-worker';
import { processMuxing } from '../../workers/src/muxing-worker';

// Redis connection for workers
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: process.env.REDIS_HOST?.includes('upstash.io') ? {} : undefined
});

// Start workers
console.log('Starting workers...');

const sttWorker = new Worker('stt', processStt, { connection });
const translationWorker = new Worker('translation', processTranslation, { connection });
const ttsWorker = new Worker('tts', processTts, { connection });
const muxingWorker = new Worker('muxing', processMuxing, { connection });

console.log('✅ Workers started alongside backend server');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    sttWorker.close(),
    translationWorker.close(),
    ttsWorker.close(),
    muxingWorker.close()
  ]);
  process.exit(0);
});
