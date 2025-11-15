"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processStt = processStt;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const queue_1 = require("./lib/queue");
async function processStt(job) {
    const { projectId, videoUrl } = job.data;
    await prisma_1.default.job.create({
        data: { projectId, stage: 'STT', status: 'PROCESSING' }
    });
    try {
        // Call OpenAI Whisper API
        const response = await axios_1.default.post('https://api.openai.com/v1/audio/transcriptions', {
            file: videoUrl,
            model: 'whisper-1'
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        const transcript = response.data;
        await prisma_1.default.transcript.create({
            data: {
                projectId,
                content: transcript,
                approved: false
            }
        });
        await prisma_1.default.job.updateMany({
            where: { projectId, stage: 'STT' },
            data: { status: 'COMPLETED', progress: 100 }
        });
        // Trigger next stage
        await (0, queue_1.addJob)('translation', { projectId });
    }
    catch (error) {
        await prisma_1.default.job.updateMany({
            where: { projectId, stage: 'STT' },
            data: { status: 'FAILED', errorMessage: error.message }
        });
        throw error;
    }
}
