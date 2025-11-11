import { Project, ProjectStatus, User } from '@prisma/client';

export interface ProjectFixture {
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: ProjectStatus;
  duration?: number;
}

export const testProjects: Record<string, ProjectFixture> = {
  basic: {
    name: 'Test Project',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    status: 'UPLOADING',
  },
  processing: {
    name: 'Processing Project',
    sourceLanguage: 'en',
    targetLanguage: 'fr',
    status: 'PROCESSING',
    duration: 120,
  },
  completed: {
    name: 'Completed Project',
    sourceLanguage: 'en',
    targetLanguage: 'de',
    status: 'COMPLETED',
    duration: 180,
  },
};

export async function createTestProject(
  prisma: any,
  userId: string,
  projectType: keyof typeof testProjects = 'basic'
): Promise<Project> {
  const fixture = testProjects[projectType];

  return prisma.project.create({
    data: {
      userId,
      name: fixture.name,
      sourceLanguage: fixture.sourceLanguage,
      targetLanguage: fixture.targetLanguage,
      status: fixture.status,
      duration: fixture.duration,
    },
  });
}
