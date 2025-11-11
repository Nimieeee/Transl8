'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useProject } from '@/hooks/use-projects';
import { useWebSocket } from '@/hooks/use-websocket';

const stageLabels = {
  stt: 'Speech-to-Text',
  mt: 'Translation',
  tts: 'Voice Generation',
  muxing: 'Audio Mixing',
  lipsync: 'Lip Synchronization',
};

const stageOrder = ['stt', 'mt', 'tts', 'muxing', 'lipsync'];

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { project, status, isLoading } = useProject(projectId);
  const { isConnected, lastMessage } = useWebSocket(projectId);

  useEffect(() => {
    if (lastMessage?.type === 'job:completed') {
      // Refresh project status
      window.location.reload();
    }
  }, [lastMessage]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary mt-4"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const currentStageIndex = status?.currentJob
    ? stageOrder.indexOf(status.currentJob.stage)
    : -1;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {project.sourceLanguage} → {project.targetLanguage}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {isConnected && (
                  <div className="flex items-center text-sm text-success-600">
                    <div className="h-2 w-2 bg-success-500 rounded-full mr-2"></div>
                    Live
                  </div>
                )}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-secondary"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Card */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Project Status</h2>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  project.status === 'completed'
                    ? 'bg-success-100 text-success-800'
                    : project.status === 'failed'
                    ? 'bg-error-100 text-error-800'
                    : project.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
            </div>

            {/* Progress Bar */}
            {project.status === 'processing' && status && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">
                      {status.currentJob && stageLabels[status.currentJob.stage as keyof typeof stageLabels]}
                    </span>
                    <span className="font-medium text-gray-900">{status.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                </div>

                {status.estimatedTimeRemaining && (
                  <p className="text-sm text-gray-600">
                    Estimated time remaining: {Math.ceil(status.estimatedTimeRemaining / 60)} minutes
                  </p>
                )}
              </div>
            )}

            {/* Pipeline Stages */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Pipeline Stages</h3>
              <div className="space-y-2">
                {stageOrder.map((stage, index) => {
                  const isCompleted = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const isPending = index > currentStageIndex;

                  return (
                    <div
                      key={stage}
                      className={`flex items-center p-3 rounded-lg ${
                        isCompleted
                          ? 'bg-success-50'
                          : isCurrent
                          ? 'bg-primary-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <div className="w-6 h-6 bg-success-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : isCurrent ? (
                          <div className="w-6 h-6 bg-primary-500 rounded-full animate-pulse"></div>
                        ) : (
                          <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                        )}
                      </div>
                      <span
                        className={`ml-3 text-sm font-medium ${
                          isCompleted
                            ? 'text-success-900'
                            : isCurrent
                            ? 'text-primary-900'
                            : 'text-gray-500'
                        }`}
                      >
                        {stageLabels[stage as keyof typeof stageLabels]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.status === 'review' && (
              <>
                <Link href={`/projects/${projectId}/transcript`} className="card hover:shadow-medium transition-shadow cursor-pointer">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Review Transcript</h3>
                      <p className="text-sm text-gray-600">Edit and approve the transcription</p>
                    </div>
                  </div>
                </Link>

                <Link href={`/projects/${projectId}/translation`} className="card hover:shadow-medium transition-shadow cursor-pointer">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Review Translation</h3>
                      <p className="text-sm text-gray-600">Edit and approve the translation</p>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {project.status === 'completed' && project.videoUrl && (
              <div className="md:col-span-2">
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Download Video</h3>
                  <video
                    controls
                    className="w-full rounded-lg mb-4"
                    src={project.videoUrl}
                  />
                  <a
                    href={project.videoUrl}
                    download
                    className="btn-primary w-full text-center"
                  >
                    Download Dubbed Video
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {project.status === 'failed' && status?.currentJob?.errorMessage && (
            <div className="mt-6 rounded-md bg-error-50 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-error-800">Processing Failed</h3>
                  <p className="text-sm text-error-700 mt-1">{status.currentJob.errorMessage}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
