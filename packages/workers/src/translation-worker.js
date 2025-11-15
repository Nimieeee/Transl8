"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTranslation = processTranslation;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const queue_1 = require("./lib/queue");
async function processTranslation(job) {
    const { projectId } = job.data;
    await prisma_1.default.job.create({
        data: { projectId, stage: 'MT', status: 'PROCESSING' }
    });
    try {
        const project = await prisma_1.default.project.findUnique({
            where: { id: projectId },
            include: { transcripts: true }
        });
        if (!project || !project.transcripts[0]) {
            throw new Error('No transcript found');
        }
        const transcript = project.transcripts[0];
        // Call translation API (using OpenAI for simplicity)
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4',
            messages: [{
                    role: 'user',
                    content: `Translate this from ${project.sourceLanguage} to ${project.targetLanguage}: ${JSON.stringify(transcript.content)}`
                }]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        const translation = response.data.choices[0].message.content;
        await prisma_1.default.translation.create({
            data: {
                projectId,
                targetLanguage: project.targetLanguage,
                content: JSON.parse(translation),
                approved: false
            }
        });
        await prisma_1.default.job.updateMany({
            where: { projectId, stage: 'MT' },
            data: { status: 'COMPLETED', progress: 100 }
        });
        await (0, queue_1.addJob)('tts', { projectId });
    }
    catch (error) {
        await prisma_1.default.job.updateMany({
            where: { projectId, stage: 'MT' },
            data: { status: 'FAILED', errorMessage: error.message }
        });
        throw error;
    }
}
