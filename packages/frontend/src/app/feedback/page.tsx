'use client';

import { useState } from 'react';
import { FeedbackForm } from '@/components/beta/feedback-form';

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Share Your Feedback</h1>
          <p className="text-lg text-gray-600">
            Help us improve by sharing your thoughts and experiences
          </p>
        </div>

        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('submit')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'submit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Submit Feedback
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Feedback
            </button>
          </nav>
        </div>

        {activeTab === 'submit' ? (
          <div className="space-y-6">
            <FeedbackForm />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                What kind of feedback helps us most?
              </h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <strong>Bug Reports:</strong> Describe what happened, what you expected, and steps
                  to reproduce the issue.
                </div>
                <div>
                  <strong>Feature Requests:</strong> Explain the problem you're trying to solve and
                  how the feature would help.
                </div>
                <div>
                  <strong>Usability Feedback:</strong> Tell us about confusing workflows, unclear
                  UI, or friction points.
                </div>
                <div>
                  <strong>Quality Issues:</strong> Share specific examples of output quality
                  problems with context.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600 text-center py-8">
              Feedback history coming soon. Check back later to see your submitted feedback and
              responses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
