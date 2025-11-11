'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface CookiePolicy {
  version: string;
  effectiveDate: string;
  content: any;
}

export default function CookiePolicyPage() {
  const [policy, setPolicy] = useState<CookiePolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await apiClient.get('/legal/cookie-policy');
        setPolicy(response.data);
      } catch (error) {
        console.error('Failed to fetch cookie policy:', error);
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
          <p className="mt-4 text-gray-600">Loading cookie policy...</p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load cookie policy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-4">Cookie Policy</h1>
          <div className="text-sm text-gray-600 mb-8">
            <p>Version: {policy.version}</p>
            <p>Effective Date: {policy.effectiveDate}</p>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 mb-6">{policy.content.introduction}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.whatAreCookies.title}</h2>
              <p className="text-gray-700">{policy.content.whatAreCookies.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{policy.content.cookieTypes.title}</h2>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  {policy.content.cookieTypes.essential.title}
                </h3>
                <p className="text-gray-700 mb-2">
                  {policy.content.cookieTypes.essential.description}
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  {policy.content.cookieTypes.essential.examples.map(
                    (item: string, index: number) => (
                      <li key={index} className="text-gray-700">
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  {policy.content.cookieTypes.functional.title}
                </h3>
                <p className="text-gray-700 mb-2">
                  {policy.content.cookieTypes.functional.description}
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  {policy.content.cookieTypes.functional.examples.map(
                    (item: string, index: number) => (
                      <li key={index} className="text-gray-700">
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  {policy.content.cookieTypes.analytics.title}
                </h3>
                <p className="text-gray-700 mb-2">
                  {policy.content.cookieTypes.analytics.description}
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  {policy.content.cookieTypes.analytics.examples.map(
                    (item: string, index: number) => (
                      <li key={index} className="text-gray-700">
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {policy.content.managingCookies.title}
              </h2>
              <p className="text-gray-700">{policy.content.managingCookies.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {policy.content.thirdPartyCookies.title}
              </h2>
              <p className="text-gray-700">{policy.content.thirdPartyCookies.description}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
