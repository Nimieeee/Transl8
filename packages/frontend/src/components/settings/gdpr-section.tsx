'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function GDPRSection() {
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const response = await apiClient.get('/gdpr/export', {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user-data-export-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert('Your data has been exported successfully!');
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE_MY_ACCOUNT') {
      alert('Please type "DELETE_MY_ACCOUNT" to confirm');
      return;
    }

    setDeleteLoading(true);
    try {
      await apiClient.delete('/gdpr/delete-account', {
        data: { confirmation: deleteConfirmation },
      });

      alert('Your account has been deleted. You will be logged out.');

      // Clear local storage and redirect to home
      localStorage.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. Please try again or contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Privacy & Data Rights</h2>
        <p className="text-gray-600 mb-6">
          Manage your personal data and exercise your GDPR rights.
        </p>
      </div>

      {/* Data Export */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Export Your Data</h3>
        <p className="text-gray-600 mb-4">
          Download a copy of all your personal data, including projects, transcripts, translations,
          and voice clones.
        </p>
        <button
          onClick={handleExportData}
          disabled={exportLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportLoading ? 'Exporting...' : 'Export My Data'}
        </button>
      </div>

      {/* Account Deletion */}
      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <h3 className="text-lg font-semibold mb-2 text-red-800">Delete Account</h3>
        <p className="text-gray-700 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type{' '}
                <span className="font-mono bg-gray-200 px-2 py-1 rounded">DELETE_MY_ACCOUNT</span>{' '}
                to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="DELETE_MY_ACCOUNT"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmation !== 'DELETE_MY_ACCOUNT'}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Links */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Legal Documents</h3>
        <div className="space-y-2">
          <a
            href="/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline"
          >
            Privacy Policy →
          </a>
          <a
            href="/legal/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline"
          >
            Terms of Service →
          </a>
          <a
            href="/legal/cookie-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline"
          >
            Cookie Policy →
          </a>
          <a
            href="/legal/dpa"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline"
          >
            Data Processing Agreement →
          </a>
        </div>
      </div>
    </div>
  );
}
