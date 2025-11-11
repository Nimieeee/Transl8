'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface DPA {
  version: string;
  effectiveDate: string;
  title: string;
  content: any;
}

export default function DPAPage() {
  const [dpa, setDpa] = useState<DPA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDPA = async () => {
      try {
        const response = await apiClient.get('/legal/dpa');
        setDpa(response.data);
      } catch (error) {
        console.error('Failed to fetch DPA:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDPA();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Data Processing Agreement...</p>
        </div>
      </div>
    );
  }

  if (!dpa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load Data Processing Agreement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-4">{dpa.title}</h1>
          <div className="text-sm text-gray-600 mb-8">
            <p>Version: {dpa.version}</p>
            <p>Effective Date: {dpa.effectiveDate}</p>
          </div>

          <div className="prose max-w-none space-y-8">
            <p className="text-gray-700">{dpa.content.introduction}</p>

            {Object.entries(dpa.content).map(([key, section]: [string, any]) => {
              if (key === 'introduction') return null;

              return (
                <section key={key} className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>

                  {section.description && (
                    <p className="text-gray-700 mb-4">{section.description}</p>
                  )}

                  {section.items && Array.isArray(section.items) && (
                    <ul className="list-disc pl-6 space-y-2">
                      {section.items.map((item: string, index: number) => (
                        <li key={index} className="text-gray-700">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.items &&
                    typeof section.items === 'object' &&
                    !Array.isArray(section.items) && (
                      <div className="space-y-4">
                        {Object.entries(section.items).map(
                          ([itemKey, itemValue]: [string, any]) => (
                            <div key={itemKey} className="ml-4">
                              <strong className="text-gray-900">{itemKey}:</strong>
                              <span className="text-gray-700"> {itemValue}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {section.list && (
                    <ul className="list-disc pl-6 space-y-2 mt-4">
                      {section.list.map((item: string, index: number) => (
                        <li key={index} className="text-gray-700">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
