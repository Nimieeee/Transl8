'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';

interface JobStatus {
  jobId: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export default function StatusPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch job status
  const fetchStatus = async () => {
    try {
      const response = await apiClient.get(`/dub/status/${jobId}`);
      setJobStatus(response.data);
      setError('');

      // Redirect to download page when complete
      if (response.data.status === 'completed') {
        setTimeout(() => {
          router.push(`/download/${jobId}`);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Status fetch error:', err);
      setError(
        err.response?.data?.error?.message || 'Failed to fetch job status'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Poll status endpoint every 2 seconds
  useEffect(() => {
    if (!jobId) return;

    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [jobId]);

  // Get status message based on progress
  const getStatusMessage = () => {
    if (!jobStatus) return '';

    if (jobStatus.status === 'failed') {
      return 'Dubbing failed';
    }

    if (jobStatus.status === 'completed') {
      return 'Dubbing completed!';
    }

    if (jobStatus.progress === 0) {
      return 'Starting dubbing process...';
    } else if (jobStatus.progress <= 20) {
      return 'Extracting audio from video...';
    } else if (jobStatus.progress <= 40) {
      return 'Transcribing audio to text...';
    } else if (jobStatus.progress <= 60) {
      return 'Translating text to Spanish...';
    } else if (jobStatus.progress <= 80) {
      return 'Generating Spanish speech...';
    } else if (jobStatus.progress < 100) {
      return 'Merging audio with video...';
    } else {
      return 'Finalizing...';
    }
  };

  // Get progress bar color based on status
  const getProgressColor = () => {
    if (jobStatus?.status === 'failed') {
      return 'bg-red-600';
    }
    if (jobStatus?.status === 'completed') {
      return 'bg-green-600';
    }
    return 'bg-blue-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dubbing in Progress
          </h1>
          <p className="text-gray-600 mb-8">
            Your video is being dubbed. This may take a few minutes.
          </p>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {jobStatus && (
            <div className="space-y-6">
              {/* Status Message */}
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  {getStatusMessage()}
                </p>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{jobStatus.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`${getProgressColor()} h-4 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {jobStatus.status === 'failed' && jobStatus.error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Error Details
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{jobStatus.error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {jobStatus.status === 'completed' && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Your video has been dubbed successfully! Redirecting to download page...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Info */}
              <div className="border-t border-gray-200 pt-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Job ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {jobStatus.jobId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          jobStatus.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : jobStatus.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : jobStatus.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {jobStatus.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Started At
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(jobStatus.createdAt).toLocaleString()}
                    </dd>
                  </div>
                  {jobStatus.completedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Completed At
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(jobStatus.completedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {jobStatus.status === 'failed' && (
                  <button
                    onClick={() => router.push('/upload')}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => router.push('/upload')}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload Another Video
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
