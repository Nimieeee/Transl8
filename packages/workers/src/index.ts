import { Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { processStt } from './stt-worker';
import { processTranslation } from './translation-worker';
import { processTts } from './tts-worker';
import { processMuxing } from './muxing-worker';

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: process.env.REDIS_HOST?.includes('upstash.io') ? {} : undefined
});

const sttWorker = new Worker('stt', processStt, { connection });
const translationWorker = new Worker('translation', processTranslation, { connection });
const ttsWorker = new Worker('tts', processTts, { connection });
const muxingWorker = new Worker('muxing', processMuxing, { connection });

console.log('Workers started');

process.on('SIGTERM', async () => {
  await Promise.all([
    sttWorker.close(),
    translationWorker.close(),
    ttsWorker.close(),
    muxingWorker.close()
  ]);
  process.exit(0);
});
