"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
const stt_worker_1 = require("./stt-worker");
const translation_worker_1 = require("./translation-worker");
const tts_worker_1 = require("./tts-worker");
const muxing_worker_1 = require("./muxing-worker");
dotenv_1.default.config();
const connection = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: process.env.REDIS_HOST?.includes('upstash.io') ? {} : undefined
});
const sttWorker = new bullmq_1.Worker('stt', stt_worker_1.processStt, { connection });
const translationWorker = new bullmq_1.Worker('translation', translation_worker_1.processTranslation, { connection });
const ttsWorker = new bullmq_1.Worker('tts', tts_worker_1.processTts, { connection });
const muxingWorker = new bullmq_1.Worker('muxing', muxing_worker_1.processMuxing, { connection });
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
