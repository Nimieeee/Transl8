"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMuxing = processMuxing;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const prisma_1 = __importDefault(require("./lib/prisma"));
async function processMuxing(job) {
    const { projectId } = job.data;
    await prisma_1.default.job.create({
        data: { projectId, stage: 'MUXING', status: 'PROCESSING' }
    });
    try {
        const project = await prisma_1.default.project.findUnique({
            where: { id: projectId }
        });
        if (!project || !project.videoUrl || !project.audioUrl) {
            throw new Error('Missing video or audio');
        }
        const outputPath = `/tmp/${projectId}-output.mp4`;
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)()
                .input(project.videoUrl)
                .input(project.audioUrl)
                .outputOptions('-c:v copy')
                .outputOptions('-c:a aac')
                .outputOptions('-map 0:v:0')
                .outputOptions('-map 1:a:0')
                .save(outputPath)
                .on('end', resolve)
                .on('error', reject);
        });
        const outputVideoUrl = `https://storage.example.com/${projectId}/output.mp4`;
        await prisma_1.default.project.update({
            where: { id: projectId },
            data: {
                outputVideoUrl,
                status: 'COMPLETED'
            }
        });
        await prisma_1.default.job.updateMany({
            where: { projectId, stage: 'MUXING' },
            data: { status: 'COMPLETED', progress: 100 }
        });
    }
    catch (error) {
        await prisma_1.default.job.updateMany({
            where: { projectId, stage: 'MUXING' },
            data: { status: 'FAILED', errorMessage: error.message }
        });
        await prisma_1.default.project.update({
            where: { id: projectId },
            data: { status: 'FAILED' }
        });
        throw error;
    }
}
