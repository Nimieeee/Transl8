'use client';

import { useRouter } from 'next/navigation';
import { GDPRSection } from '@/components/settings/gdpr-section';

export default function SettingsPage() {
  const router = useRouter();
  
  // Mock user data for MVP (no auth implemented yet)
  const user = {
    email: 'user@example.com',
    subscriptionTier: 'free',
    createdAt: new Date().toISOString(),
    processingMinutesUsed: 0,
    processingMinutesLimit: 10,
    voiceCloneSlots: 0,
  };

  const tierFeatures = {
    free: ['10 minutes/month', 'Watermarked videos', 'Basic voices'],
    creator: ['120 minutes/month', 'No watermark', '3 voice clones', 'Premium voices'],
    pro: [
      'Unlimited processing',
      'No watermark',
      '10 voice clones',
      'Lip-sync',
      'Priority processing',
    ],
    enterprise: [
      'Unlimited processing',
      'API access',
      'Unlimited voice clones',
      'Custom models',
      'Dedicated support',
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <button onClick={() => router.push('/dashboard')} className="btn-secondary">
                Back to Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Account Information */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Email</span>
                <span className="font-medium text-gray-900">{user.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Subscription Tier</span>
                <span className="font-medium text-gray-900 capitalize">
                  {user.subscriptionTier}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Usage */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Processing Minutes</span>
                  <span className="font-medium text-gray-900">
                    {user.processingMinutesUsed} /{' '}
                    {user.processingMinutesLimit === -1 ? '∞' : user.processingMinutesLimit}
                  </span>
                </div>
                {user.processingMinutesLimit !== -1 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((user.processingMinutesUsed / user.processingMinutesLimit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Voice Clone Slots</span>
                  <span className="font-medium text-gray-900">
                    {user.voiceCloneSlots === -1
                      ? 'Unlimited'
                      : `${user.voiceCloneSlots} available`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 capitalize">
                  {user.subscriptionTier} Plan
                </h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {tierFeatures[user.subscriptionTier as keyof typeof tierFeatures]?.map(
                    (feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg
                          className="w-4 h-4 text-success-500 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    )
                  )}
                </ul>
              </div>
              {user.subscriptionTier !== 'enterprise' && (
                <button className="btn-primary w-full">Upgrade Plan</button>
              )}
            </div>
          </div>

          {/* GDPR & Privacy */}
          <div className="card mb-6">
            <GDPRSection />
          </div>

          {/* Danger Zone */}
          <div className="card border-error-200">
            <h2 className="text-lg font-semibold text-error-900 mb-4">Danger Zone</h2>
            <div className="space-y-3">
              <button
                onClick={() => logout()}
                className="btn-outline w-full text-error-600 border-error-600 hover:bg-error-50"
              >
                Logout
              </button>
            </div>
          </div>
        </main>
    </div>
  );
}
