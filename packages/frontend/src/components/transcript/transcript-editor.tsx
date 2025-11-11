'use client';

import { useState, useEffect } from 'react';
import { TranscriptSegment } from '@/types/api';

interface TranscriptEditorProps {
  segments: TranscriptSegment[];
  onUpdate: (segments: TranscriptSegment[]) => void;
  isUpdating: boolean;
}

const speakerColors = [
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-green-100 text-green-800 border-green-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-orange-100 text-orange-800 border-orange-300',
  'bg-pink-100 text-pink-800 border-pink-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
];

export function TranscriptEditor({ segments, onUpdate, isUpdating }: TranscriptEditorProps) {
  const [editedSegments, setEditedSegments] = useState<TranscriptSegment[]>(segments);
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditedSegments(segments);
  }, [segments]);

  const getSpeakerColor = (speaker: string): string => {
    const speakers = Array.from(new Set(segments.map((s) => s.speaker))).sort();
    const index = speakers.indexOf(speaker);
    return speakerColors[index % speakerColors.length];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleTextChange = (segmentId: number, newText: string) => {
    const updated = editedSegments.map((seg) =>
      seg.id === segmentId ? { ...seg, text: newText } : seg
    );
    setEditedSegments(updated);
    setHasChanges(true);

    // Auto-save after 2 seconds of inactivity
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      onUpdate(updated);
      setHasChanges(false);
    }, 2000);
    setAutoSaveTimeout(timeout);
  };

  const handleSaveNow = () => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    onUpdate(editedSegments);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      {/* Save Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isUpdating && (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="text-sm text-gray-600">Saving...</span>
            </>
          )}
          {hasChanges && !isUpdating && (
            <>
              <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Unsaved changes</span>
            </>
          )}
          {!hasChanges && !isUpdating && (
            <>
              <div className="h-2 w-2 bg-success-500 rounded-full"></div>
              <span className="text-sm text-gray-600">All changes saved</span>
            </>
          )}
        </div>
        {hasChanges && (
          <button onClick={handleSaveNow} disabled={isUpdating} className="btn-secondary text-sm">
            Save Now
          </button>
        )}
      </div>

      {/* Segments */}
      <div className="space-y-3">
        {editedSegments.map((segment) => (
          <div key={segment.id} className="card hover:shadow-medium transition-shadow">
            <div className="flex items-start space-x-4">
              {/* Timestamp */}
              <div className="flex-shrink-0 text-xs text-gray-500 font-mono pt-1 w-24">
                <div>{formatTime(segment.start)}</div>
                <div>{formatTime(segment.end)}</div>
              </div>

              {/* Speaker Label */}
              <div className="flex-shrink-0 pt-1">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded border ${getSpeakerColor(
                    segment.speaker
                  )}`}
                >
                  {segment.speaker}
                </span>
              </div>

              {/* Text Editor */}
              <div className="flex-1">
                <textarea
                  value={segment.text}
                  onChange={(e) => handleTextChange(segment.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={Math.max(2, Math.ceil(segment.text.length / 80))}
                />
                {segment.confidence < 0.8 && (
                  <div className="mt-1 flex items-center text-xs text-warning-600">
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Low confidence ({Math.round(segment.confidence * 100)}%)
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="card bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Speaker Legend</h4>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(segments.map((s) => s.speaker)))
            .sort()
            .map((speaker) => (
              <span
                key={speaker}
                className={`px-3 py-1 text-sm font-medium rounded border ${getSpeakerColor(
                  speaker
                )}`}
              >
                {speaker}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
