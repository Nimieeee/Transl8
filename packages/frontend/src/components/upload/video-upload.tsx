'use client';

import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';

interface VideoUploadProps {
  projectId: string;
  onUploadComplete: (videoUrl: string) => void;
  onError: (error: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
];

export function VideoUpload({ projectId, onUploadComplete, onError }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('es'); // Default to Spanish
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  const MAX_DURATION = 300; // 5 minutes in seconds
  const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-m4v'];

  const validateFile = async (file: File): Promise<boolean> => {
    setValidationError(null);

    // Check file type
    if (!ALLOWED_FORMATS.includes(file.type)) {
      setValidationError('Invalid file format. Please upload MP4 or MOV files.');
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setValidationError('File size exceeds 500MB limit.');
      return false;
    }

    // Check video duration
    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_DURATION) {
        setValidationError(
          `Video duration exceeds 5 minute limit (${Math.round(duration / 60)} minutes).`
        );
        return false;
      }
    } catch (err) {
      setValidationError('Failed to read video file. Please try another file.');
      return false;
    }

    return true;
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (selectedFile: File) => {
    const isValid = await validateFile(selectedFile);
    if (isValid) {
      setFile(selectedFile);
      setValidationError(null);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('video', file);
      formData.append('targetLanguage', targetLanguage);

      // Upload directly to backend
      const { data } = await apiClient.post(`/projects/${projectId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      onUploadComplete(data.videoUrl || data.project?.videoUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      console.error('Error response:', err.response);
      console.error('Error config:', err.config);
      
      let errorMessage = 'Failed to upload video. Please try again.';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
        if (err.response.data.details) {
          console.error('Error details:', err.response.data.details);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Check for common issues
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and backend URL.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Insufficient quota or permission denied.';
      } else if (err.response?.status === 413) {
        errorMessage = 'File too large. Maximum size is 500MB.';
      }
      
      onError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      {!file && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-900">
            Drop your video here, or click to browse
          </p>
          <p className="mt-2 text-sm text-gray-500">MP4 or MOV up to 500MB, max 5 minutes</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-m4v"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary mt-6">
            Select Video
          </button>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="rounded-md bg-error-50 p-4">
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
              <p className="text-sm text-error-800">{validationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Language Selector */}
      {file && !isUploading && (
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Language</label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">
            Select the language you want to translate your video into
          </p>
        </div>
      )}

      {/* File Preview */}
      {file && !isUploading && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-10 w-10 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setValidationError(null);
              }}
              className="text-gray-400 hover:text-gray-500"
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
          <div className="mt-4">
            <button onClick={handleUpload} className="btn-primary w-full">
              Upload & Translate to{' '}
              {SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage)?.name}
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Uploading {file?.name}</p>
              <p className="text-sm text-gray-500">{uploadProgress}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Please don't close this window while uploading
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
