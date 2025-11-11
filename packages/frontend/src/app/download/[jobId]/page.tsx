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

export default function DownloadPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch job status to verify it's completed
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await apiClient.get(`/dub/status/${jobId}`);
        setJobStatus(response.data);

        // Redirect back to status page if not completed
        if (response.data.status !== 'completed') {
          router.push(`/status/${jobId}`);
          return;
        }

        setError('');
      } catch (err: any) {
        console.error('Status fetch error:', err);
        setError(err.response?.data?.error?.message || 'Failed to fetch job status');
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchStatus();
    }
  }, [jobId, router]);

  // Handle download click
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setError('');

      // Create download URL (MVP: no auth required)
      const downloadUrl = `http://localhost:3001/api/dub/download/${jobId}`;

      // Fetch the video file
      const response = await fetch(downloadUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to download video');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dubbed-video-${jobId}.mp4`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.message || 'Failed to download video');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Video is Ready!</h1>
            <p className="text-gray-600">Your video has been successfully dubbed to Spanish.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {jobStatus && (
            <div className="space-y-6">
              {/* Download Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg
                        className="-ml-1 mr-3 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download Dubbed Video
                    </>
                  )}
                </button>
              </div>

              {/* Expiration Notice */}
              {jobStatus.expiresAt && (
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-yellow-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        This video will be available until{' '}
                        <span className="font-medium">
                          {new Date(jobStatus.expiresAt).toLocaleString()}
                        </span>
                        . Please download it before then.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Details */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Job Details</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Job ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{jobStatus.jobId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {jobStatus.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Started At</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(jobStatus.createdAt).toLocaleString()}
                    </dd>
                  </div>
                  {jobStatus.completedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Completed At</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(jobStatus.completedAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/upload')}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Dub Another Video
                  </button>
                  <button
                    onClick={() => router.push('/upload')}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to Upload
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
