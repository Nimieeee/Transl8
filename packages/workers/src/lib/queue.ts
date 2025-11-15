import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: process.env.REDIS_HOST?.includes('upstash.io') ? {} : undefined
});

export const sttQueue = new Queue('stt', { connection });
export const translationQueue = new Queue('translation', { connection });
export const ttsQueue = new Queue('tts', { connection });
export const muxingQueue = new Queue('muxing', { connection });

export async function addJob(queueName: string, data: any) {
  const queues: Record<string, Queue> = {
    stt: sttQueue,
    translation: translationQueue,
    tts: ttsQueue,
    muxing: muxingQueue
  };

  const queue = queues[queueName];
  if (!queue) throw new Error(`Unknown queue: ${queueName}`);

  return queue.add(queueName, data);
}
