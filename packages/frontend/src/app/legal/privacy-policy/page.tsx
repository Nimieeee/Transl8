'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface PrivacyPolicy {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  content: any;
}

export default function PrivacyPolicyPage() {
  const [policy, setPolicy] = useState<PrivacyPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await apiClient.get('/legal/privacy-policy');
        setPolicy(response.data);
      } catch (error) {
        console.error('Failed to fetch privacy policy:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading privacy policy...</p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load privacy policy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <div className="text-sm text-gray-600 mb-8">
            <p>Version: {policy.version}</p>
            <p>Effective Date: {policy.effectiveDate}</p>
            <p>Last Updated: {policy.lastUpdated}</p>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 mb-6">{policy.content.introduction}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.dataCollection.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {policy.content.dataCollection.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.dataUsage.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {policy.content.dataUsage.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.dataStorage.title}</h2>
              <p className="text-gray-700">{policy.content.dataStorage.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.dataSharing.title}</h2>
              <p className="text-gray-700">{policy.content.dataSharing.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.userRights.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {policy.content.userRights.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.dataRetention.title}</h2>
              <p className="text-gray-700">{policy.content.dataRetention.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.cookies.title}</h2>
              <p className="text-gray-700">{policy.content.cookies.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.contact.title}</h2>
              <p className="text-gray-700">{policy.content.contact.description}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
