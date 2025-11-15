'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Project {
  id: string;
  name: string;
  status: string;
  videoUrl?: string;
  outputVideoUrl?: string;
}

export default function ProjectPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = async () => {
    try {
      const { data } = await apiClient.get(`/projects/${params.id}`);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project', error);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      await apiClient.post(`/projects/${params.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      loadProject();
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const startDubbing = async () => {
    try {
      await apiClient.post('/dub/start', { projectId: params.id });
      loadProject();
    } catch (error) {
      console.error('Failed to start dubbing', error);
    }
  };

  if (!project) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{project.name}</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload Video</h2>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-4"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {project.videoUrl && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Start Dubbing</h2>
            <button
              onClick={startDubbing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Start Processing
            </button>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-lg">
            Status: <span className="font-semibold">{project.status}</span>
          </p>
          {project.outputVideoUrl && (
            <div className="mt-4">
              <a
                href={project.outputVideoUrl}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Result
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
