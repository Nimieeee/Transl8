'use client';

import { useState } from 'react';
import axios from 'axios';

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [sourceLanguage] = useState('en');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('targetLanguage', targetLanguage);
      formData.append('sourceLanguage', sourceLanguage);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/dub/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(progress);
          },
        }
      );

      setJobId(response.data.jobId);
      setStatus('Processing...');
      
      // Start polling for status
      pollStatus(response.data.jobId);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/dub/status/${id}`
        );

        setStatus(`${response.data.status} (${response.data.progress}%)`);

        // Only mark as completed if status is 'completed' AND outputFile exists
        if (response.data.status === 'completed' && response.data.outputFile) {
          clearInterval(interval);
          setIsUploading(false);
          setStatus('Completed! ✅');
          setDownloadUrl(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/dub/download/${id}`);
        } else if (response.data.status === 'failed') {
          clearInterval(interval);
          setIsUploading(false);
          setError(response.data.error || 'Processing failed');
        } else if (response.data.status === 'completed' && !response.data.outputFile) {
          // Status is completed but no output file yet - keep polling
          setStatus('Finalizing video... (99%)');
        }
      } catch (err) {
        console.error('Status check failed:', err);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎬 Transl8
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered video dubbing in 10 languages
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {!jobId ? (
            <>
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Language Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Language
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Your video will be translated from English to {SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name}
                </p>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold
                  hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                  transition-colors duration-200"
              >
                {isUploading ? 'Uploading...' : 'Upload & Translate'}
              </button>

              {/* Upload Progress */}
              {isUploading && uploadProgress < 100 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">❌ {error}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Processing Status */}
              <div className="text-center py-8">
                <div className="flex justify-center mb-6">
                  <div className="loader"></div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {status}
                </h2>
                <p className="text-gray-600 mb-4">
                  Job ID: {jobId}
                </p>
                <p className="text-sm text-gray-500">
                  This may take a few minutes. Please don't close this page.
                </p>

                {downloadUrl && (
                  <div className="mt-6">
                    <a
                      href={downloadUrl}
                      className="inline-block bg-green-600 text-white py-3 px-6 rounded-lg font-semibold
                        hover:bg-green-700 transition-colors duration-200"
                    >
                      📥 Download Dubbed Video
                    </a>
                    <button
                      onClick={() => {
                        setJobId(null);
                        setFile(null);
                        setStatus('');
                        setDownloadUrl(null);
                      }}
                      className="block w-full mt-4 text-blue-600 hover:text-blue-700"
                    >
                      Translate Another Video
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">❌ {error}</p>
                    <button
                      onClick={() => {
                        setJobId(null);
                        setError(null);
                        setStatus('');
                      }}
                      className="mt-2 text-blue-600 hover:text-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold text-gray-900">Accurate</h3>
            <p className="text-sm text-gray-600">AI-powered translation</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900">Fast</h3>
            <p className="text-sm text-gray-600">Minutes, not hours</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-3xl mb-2">🌍</div>
            <h3 className="font-semibold text-gray-900">10+ Languages</h3>
            <p className="text-sm text-gray-600">Global reach</p>
          </div>
        </div>
      </div>
    </div>
  );
}
