'use client';

import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('es');
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
      formData.append('sourceLanguage', 'en');

      const response = await axios.post(`${API_URL}/api/dub/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      setJobId(response.data.jobId);
      setStatus('Processing...');
      pollStatus(response.data.jobId);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/dub/status/${id}`);
        setStatus(`${response.data.status} (${response.data.progress}%)`);

        if (response.data.status === 'completed' && response.data.outputFile) {
          clearInterval(interval);
          setIsUploading(false);
          setStatus('Completed! ✅');
          setDownloadUrl(`${API_URL}/api/dub/download/${id}`);
        } else if (response.data.status === 'failed') {
          clearInterval(interval);
          setIsUploading(false);
          setError(response.data.error || 'Processing failed');
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎬 Transl8</h1>
          <p className="text-lg text-gray-600">AI-powered video dubbing</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {!jobId ? (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Language
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload & Translate'}
              </button>

              {isUploading && uploadProgress < 100 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">❌ {error}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{status}</h2>
              <p className="text-gray-600 mb-4">Job ID: {jobId}</p>

              {downloadUrl && (
                <div className="mt-6">
                  <a
                    href={downloadUrl}
                    className="inline-block bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700"
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
