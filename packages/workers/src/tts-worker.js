"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTts = processTts;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const queue_1 = require("./lib/queue");
async function processTts(job) {
    const { projectId } = job.data;
    await prisma_1.default.job.create({
        data: { projectId, stage: 'TTS', status: 'PROCESSING' }
    });
    try {
        const project = await prisma_1.default.project.findUnique({
            where: { id: projectId },
            include: { translations: true }
        });
        if (!project || !project.translations[0]) {
            throw new Error('No translation found');
        }
        // Call TTS API (OpenAI TTS)
        const response = await axios_1.default.post('https://api.openai.com/v1/audio/speech', {
            model: 'tts-1',
            voice: 'alloy',
            input: JSON.stringify(project.translations[0].content)
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
            responseType: 'arraybuffer'
        });
        // Upload audio to storage
        const audioUrl = `https://storage.example.com/${projectId}/audio.mp3`;
        await prisma_1.default.project.update({
            where: { id: projectId },
            data: { audioUrl }
        });
        await prisma_1.default.job.updateMany({
            where: { projectId, stage: 'TTS' },
            data: { status: 'COMPLETED', progress: 100 }
        });
        await (0, queue_1.addJob)('muxing', { projectId });
    }
    catch (error) {
        await prisma_1.default.job.updateMany({
            where: { projectId, stage: 'TTS' },
            data: { status: 'FAILED', errorMessage: error.message }
        });
        throw error;
    }
}
