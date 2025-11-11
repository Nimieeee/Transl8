'use client';

import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { TranscriptEditor } from '@/components/transcript/transcript-editor';
import { useProject } from '@/hooks/use-projects';
import { useTranscript } from '@/hooks/use-transcript';

export default function TranscriptPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { project } = useProject(projectId);
  const { transcript, isLoading, updateTranscript, approveTranscript, isUpdating, isApproving } =
    useTranscript(projectId);

  const handleApprove = () => {
    if (confirm('Are you sure you want to approve this transcript and proceed to translation?')) {
      approveTranscript(undefined, {
        onSuccess: () => {
          router.push(`/projects/${projectId}/translation`);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!transcript) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Transcript not ready</h2>
            <p className="text-gray-600 mt-2">The transcript is still being generated.</p>
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="btn-primary mt-4"
            >
              Back to Project
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
                <p className="text-sm text-gray-600 mt-1">Review and edit transcript</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || transcript.approved}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApproving ? 'Approving...' : transcript.approved ? 'Approved' : 'Approve & Continue'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Info Banner */}
          <div className="mb-6 bg-blue-50 rounded-lg p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-blue-400 flex-shrink-0"
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
                <p className="text-sm text-blue-700">
                  Review the transcript for accuracy. You can edit any text directly. Changes are auto-saved.
                  Segments with low confidence are highlighted for your attention.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card">
              <div className="text-sm text-gray-600">Duration</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {Math.floor(transcript.duration / 60)}:{Math.floor(transcript.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600">Segments</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {transcript.segments.length}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600">Speakers</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {new Set(transcript.segments.map((s) => s.speaker)).size}
              </div>
            </div>
          </div>

          {/* Editor */}
          <TranscriptEditor
            segments={transcript.segments}
            onUpdate={(segments) => updateTranscript({ segments })}
            isUpdating={isUpdating}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}
