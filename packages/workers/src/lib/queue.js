"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.muxingQueue = exports.ttsQueue = exports.translationQueue = exports.sttQueue = void 0;
exports.addJob = addJob;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const connection = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: process.env.REDIS_HOST?.includes('upstash.io') ? {} : undefined
});
exports.sttQueue = new bullmq_1.Queue('stt', { connection });
exports.translationQueue = new bullmq_1.Queue('translation', { connection });
exports.ttsQueue = new bullmq_1.Queue('tts', { connection });
exports.muxingQueue = new bullmq_1.Queue('muxing', { connection });
async function addJob(queueName, data) {
    const queues = {
        stt: exports.sttQueue,
        translation: exports.translationQueue,
        tts: exports.ttsQueue,
        muxing: exports.muxingQueue
    };
    const queue = queues[queueName];
    if (!queue)
        throw new Error(`Unknown queue: ${queueName}`);
    return queue.add(queueName, data);
}
