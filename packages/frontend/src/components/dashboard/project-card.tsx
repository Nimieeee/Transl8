'use client';

import Link from 'next/link';
import { Project } from '@/types/api';

interface ProjectCardProps {
  project: Project;
  onDelete?: (projectId: string) => void;
}

const statusColors = {
  uploading: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  completed: 'bg-success-100 text-success-800',
  failed: 'bg-error-100 text-error-800',
};

const statusLabels = {
  uploading: 'Uploading',
  processing: 'Processing',
  review: 'Review',
  completed: 'Completed',
  failed: 'Failed',
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card hover:shadow-medium transition-shadow duration-200">
      <Link href={`/projects/${project.id}`}>
        <div className="aspect-video bg-gray-200 rounded-lg mb-4 overflow-hidden">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-400"
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
          )}
        </div>
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <Link href={`/projects/${project.id}`}>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
              {project.name}
            </h3>
          </Link>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              statusColors[project.status]
            }`}
          >
            {statusLabels[project.status]}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-600 space-x-4">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {formatDuration(project.duration)}
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            {project.sourceLanguage} → {project.targetLanguage}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <span className="text-xs text-gray-500">{formatDate(project.createdAt)}</span>
          <div className="flex space-x-2">
            <Link
              href={`/projects/${project.id}`}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View
            </Link>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm('Are you sure you want to delete this project?')) {
                    onDelete(project.id);
                  }
                }}
                className="text-sm text-error-600 hover:text-error-700 font-medium"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
