'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function BetaOnboarding() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/beta/activate', {
        inviteCode: inviteCode.trim().toUpperCase(),
      });

      setSuccess(true);
      // Reload to update user session
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate beta access');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-2xl font-bold text-green-800 mb-4">Welcome to the Beta!</h2>
        <p className="text-green-700 mb-4">
          Your beta access has been activated. You now have free Pro tier access with unlimited
          processing.
        </p>
        <p className="text-sm text-green-600">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Join the Beta Program</h2>
      <p className="text-gray-600 mb-6">
        Enter your beta invite code to unlock free Pro tier access and help us improve the platform.
      </p>

      <form onSubmit={handleActivate}>
        <div className="mb-4">
          <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
            Invite Code
          </label>
          <input
            type="text"
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="XXXXXXXX"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
            required
            maxLength={16}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !inviteCode.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Activating...' : 'Activate Beta Access'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Beta Benefits:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Free Pro tier access</li>
          <li>• Unlimited video processing</li>
          <li>• 10 voice clone slots</li>
          <li>• Priority support</li>
          <li>• Early access to new features</li>
        </ul>
      </div>
    </div>
  );
}
