'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const checkConsent = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Show banner for non-authenticated users
          const localConsent = localStorage.getItem('cookieConsent');
          if (!localConsent) {
            setShowBanner(true);
          }
          return;
        }

        const response = await apiClient.get('/gdpr/consent');
        if (!response.data.cookieConsent) {
          setShowBanner(true);
        }
      } catch (error) {
        // If error, check local storage
        const localConsent = localStorage.getItem('cookieConsent');
        if (!localConsent) {
          setShowBanner(true);
        }
      }
    };

    checkConsent();
  }, []);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await apiClient.post('/gdpr/consent', {
          cookieConsent: true,
        });
      }
      localStorage.setItem('cookieConsent', 'true');
      setShowBanner(false);
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
      // Still hide banner and save locally
      localStorage.setItem('cookieConsent', 'true');
      setShowBanner(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm">
              We use cookies to provide essential functionality and improve your experience. 
              By continuing to use our platform, you consent to our use of cookies.{' '}
              <a
                href="/legal/cookie-policy"
                className="underline hover:text-blue-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </a>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="px-4 py-2 text-sm border border-gray-600 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Accepting...' : 'Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
