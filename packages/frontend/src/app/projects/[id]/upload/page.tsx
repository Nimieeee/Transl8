'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { VideoUpload } from '@/components/upload/video-upload';
import { useProject } from '@/hooks/use-projects';

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { project, isLoading } = useProject(projectId);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (videoUrl: string) => {
    // Navigate to configuration page
    router.push(`/projects/${projectId}/configure`);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );
  }

  if (!project) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">
              Back to Dashboard
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-600 mt-1">Upload your video</p>
              </div>
              <button onClick={() => router.push('/dashboard')} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <nav aria-label="Progress">
              <ol className="flex items-center">
                <li className="relative pr-8 sm:pr-20">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-full">
                      <span className="text-white font-medium">1</span>
                    </div>
                    <span className="ml-4 text-sm font-medium text-gray-900">Upload</span>
                  </div>
                </li>
                <li className="relative pr-8 sm:pr-20">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded-full">
                      <span className="text-gray-600 font-medium">2</span>
                    </div>
                    <span className="ml-4 text-sm font-medium text-gray-500">Configure</span>
                  </div>
                </li>
                <li className="relative">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded-full">
                      <span className="text-gray-600 font-medium">3</span>
                    </div>
                    <span className="ml-4 text-sm font-medium text-gray-500">Process</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-md bg-error-50 p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-error-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-error-800">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-error-400 hover:text-error-500"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Upload Component */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Upload Video File</h2>
            <VideoUpload
              projectId={projectId}
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Upload Requirements</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Supported formats: MP4, MOV</li>
                    <li>Maximum file size: 500MB</li>
                    <li>Maximum duration: 5 minutes (MVP)</li>
                    <li>Recommended: Clear audio with minimal background noise</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}
