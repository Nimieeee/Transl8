'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface TermsOfService {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  content: any;
}

export default function TermsOfServicePage() {
  const [terms, setTerms] = useState<TermsOfService | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const response = await apiClient.get('/legal/terms-of-service');
        setTerms(response.data);
      } catch (error) {
        console.error('Failed to fetch terms of service:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading terms of service...</p>
        </div>
      </div>
    );
  }

  if (!terms) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load terms of service</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <div className="text-sm text-gray-600 mb-8">
            <p>Version: {terms.version}</p>
            <p>Effective Date: {terms.effectiveDate}</p>
            <p>Last Updated: {terms.lastUpdated}</p>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 mb-6">{terms.content.introduction}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {terms.content.serviceDescription.title}
              </h2>
              <p className="text-gray-700">{terms.content.serviceDescription.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {terms.content.userResponsibilities.title}
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                {terms.content.userResponsibilities.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {terms.content.contentOwnership.title}
              </h2>
              <p className="text-gray-700">{terms.content.contentOwnership.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {terms.content.subscriptionTerms.title}
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                {terms.content.subscriptionTerms.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {terms.content.serviceAvailability.title}
              </h2>
              <p className="text-gray-700">{terms.content.serviceAvailability.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{terms.content.termination.title}</h2>
              <p className="text-gray-700">{terms.content.termination.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{terms.content.disclaimers.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {terms.content.disclaimers.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{terms.content.changes.title}</h2>
              <p className="text-gray-700">{terms.content.changes.description}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{terms.content.contact.title}</h2>
              <p className="text-gray-700">{terms.content.contact.description}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
