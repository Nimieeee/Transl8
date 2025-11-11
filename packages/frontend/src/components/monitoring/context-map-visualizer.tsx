'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface ContextMapSegment {
  id: number;
  start_ms: number;
  end_ms: number;
  duration: number;
  text: string;
  speaker: string;
  confidence: number;
  clean_prompt_path?: string;
  emotion?: string;
  previous_line?: string | null;
  next_line?: string | null;
  adapted_text?: string;
  status?: string;
  attempts?: number;
  validation_feedback?: string;
  generated_audio_path?: string;
}

interface ContextMap {
  project_id: string;
  original_duration_ms: number;
  source_language: string;
  target_language: string;
  created_at: string;
  updated_at: string;
  segments: ContextMapSegment[];
}

interface ContextMapVisualizerProps {
  projectId: string;
}

export function ContextMapVisualizer({ projectId }: ContextMapVisualizerProps) {
  const [selectedSegment, setSelectedSegment] = useState<ContextMapSegment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: contextMap, isLoading, error, refetch } = useQuery<ContextMap>({
    queryKey: ['context-map', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/projects/${projectId}/context-map`);
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load Context Map</p>
      </div>
    );
  }

  if (!contextMap) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">No Context Map available for this project</p>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    if (!status || status === 'pending') return 'bg-gray-300';
    if (status === 'success') return 'bg-green-500';
    if (status.startsWith('failed_')) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusLabel = (status?: string) => {
    if (!status || status === 'pending') return 'Pending';
    if (status === 'success') return 'Success';
    if (status === 'failed_adaptation') return 'Failed Adaptation';
    return status;
  };

  const filteredSegments = contextMap.segments.filter(segment => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'success') return segment.status === 'success';
    if (filterStatus === 'failed') return segment.status?.startsWith('failed_');
    if (filterStatus === 'pending') return !segment.status || segment.status === 'pending';
    return true;
  });

  const stats = {
    total: contextMap.segments.length,
    success: contextMap.segments.filter(s => s.status === 'success').length,
    failed: contextMap.segments.filter(s => s.status?.startsWith('failed_')).length,
    pending: contextMap.segments.filter(s => !s.status || s.status === 'pending').length,
  };

  const completionRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Context Map Visualization</h2>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Segments</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600">Success</p>
            <p className="text-2xl font-bold text-green-900">{stats.success}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600">Failed</p>
            <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Completion</p>
            <p className="text-2xl font-bold text-blue-900">{completionRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Duration:</span>
            <span className="ml-2 font-medium">{(contextMap.original_duration_ms / 1000).toFixed(1)}s</span>
          </div>
          <div>
            <span className="text-gray-600">Languages:</span>
            <span className="ml-2 font-medium">{contextMap.source_language} → {contextMap.target_language}</span>
          </div>
          <div>
            <span className="text-gray-600">Created:</span>
            <span className="ml-2 font-medium">{new Date(contextMap.created_at).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-600">Updated:</span>
            <span className="ml-2 font-medium">{new Date(contextMap.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('success')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filterStatus === 'success' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Success ({stats.success})
          </button>
          <button
            onClick={() => setFilterStatus('failed')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filterStatus === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Failed ({stats.failed})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Pending ({stats.pending})
          </button>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Segment Timeline</h3>
        <div className="relative">
          <div className="h-12 bg-gray-100 rounded-lg relative overflow-hidden">
            {filteredSegments.map((segment) => {
              const left = (segment.start_ms / contextMap.original_duration_ms) * 100;
              const width = ((segment.end_ms - segment.start_ms) / contextMap.original_duration_ms) * 100;
              
              return (
                <div
                  key={segment.id}
                  className={`absolute h-full ${getStatusColor(segment.status)} cursor-pointer hover:opacity-80 transition border-r border-white`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={() => setSelectedSegment(segment)}
                  title={`Segment ${segment.id}: ${segment.text.substring(0, 50)}...`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0s</span>
            <span>{(contextMap.original_duration_ms / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Segment List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Segments ({filteredSegments.length})</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredSegments.map((segment) => (
            <div
              key={segment.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                selectedSegment?.id === segment.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedSegment(segment)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm font-medium text-gray-900">Segment {segment.id}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(segment.status)} text-white`}>
                      {getStatusLabel(segment.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(segment.start_ms / 1000).toFixed(2)}s - {(segment.end_ms / 1000).toFixed(2)}s
                    </span>
                    <span className="text-xs text-gray-500">
                      {segment.speaker}
                    </span>
                    {segment.emotion && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                        {segment.emotion}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{segment.text}</p>
                  {segment.adapted_text && (
                    <p className="text-sm text-blue-700 italic">→ {segment.adapted_text}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {segment.clean_prompt_path && (
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Clean Prompt
                      </span>
                    )}
                    {segment.generated_audio_path && (
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Audio Generated
                      </span>
                    )}
                    {segment.attempts && segment.attempts > 0 && (
                      <span>Attempts: {segment.attempts}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Segment Details */}
      {selectedSegment && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Segment {selectedSegment.id} Details</h3>
            <button
              onClick={() => setSelectedSegment(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Timing</p>
                <p className="font-medium">{(selectedSegment.start_ms / 1000).toFixed(3)}s - {(selectedSegment.end_ms / 1000).toFixed(3)}s</p>
                <p className="text-sm text-gray-500">Duration: {selectedSegment.duration.toFixed(3)}s</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Speaker</p>
                <p className="font-medium">{selectedSegment.speaker}</p>
                <p className="text-sm text-gray-500">Confidence: {(selectedSegment.confidence * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Original Text</p>
              <p className="p-3 bg-gray-50 rounded-lg">{selectedSegment.text}</p>
            </div>

            {selectedSegment.adapted_text && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Adapted Text</p>
                <p className="p-3 bg-blue-50 rounded-lg">{selectedSegment.adapted_text}</p>
              </div>
            )}

            {selectedSegment.emotion && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Emotion</p>
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-medium">
                  {selectedSegment.emotion}
                </span>
              </div>
            )}

            {selectedSegment.status && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-lg font-medium ${getStatusColor(selectedSegment.status)} text-white`}>
                  {getStatusLabel(selectedSegment.status)}
                </span>
                {selectedSegment.attempts && selectedSegment.attempts > 0 && (
                  <span className="ml-2 text-sm text-gray-600">
                    ({selectedSegment.attempts} attempt{selectedSegment.attempts > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            )}

            {selectedSegment.validation_feedback && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Validation Feedback</p>
                <p className="p-3 bg-yellow-50 text-yellow-900 rounded-lg text-sm">{selectedSegment.validation_feedback}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Clean Prompt Path</p>
                <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                  {selectedSegment.clean_prompt_path || 'Not available'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Generated Audio Path</p>
                <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                  {selectedSegment.generated_audio_path || 'Not available'}
                </p>
              </div>
            </div>

            {selectedSegment.previous_line && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Previous Line (Context)</p>
                <p className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">{selectedSegment.previous_line}</p>
              </div>
            )}

            {selectedSegment.next_line && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Next Line (Context)</p>
                <p className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">{selectedSegment.next_line}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
