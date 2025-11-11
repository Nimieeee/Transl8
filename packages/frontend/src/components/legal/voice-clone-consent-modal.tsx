'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface VoiceCloneConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  voiceCloneId?: string;
}

export function VoiceCloneConsentModal({
  isOpen,
  onClose,
  onAccept,
  voiceCloneId,
}: VoiceCloneConsentModalProps) {
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consentForm, setConsentForm] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConsentForm();
    }
  }, [isOpen]);

  const fetchConsentForm = async () => {
    try {
      const response = await apiClient.get('/licensing/voice-clone-consent');
      setConsentForm(response.data);
    } catch (error) {
      console.error('Failed to fetch consent form:', error);
    }
  };

  const handleAccept = async () => {
    if (!consent) {
      alert('Please check the consent box to continue');
      return;
    }

    if (!voiceCloneId) {
      // Just close modal if no voice clone ID (pre-creation consent)
      onAccept();
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/licensing/voice-clone-consent', {
        voiceCloneId,
        consent: true,
      });
      onAccept();
    } catch (error) {
      console.error('Failed to record consent:', error);
      alert('Failed to record consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !consentForm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">{consentForm.title}</h2>
          
          <p className="text-gray-700 mb-6">{consentForm.content.introduction}</p>

          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-2">
                {consentForm.content.legalRepresentation.title}
              </h3>
              <p className="text-gray-700 mb-2">{consentForm.content.legalRepresentation.text}</p>
              <ul className="list-disc pl-6 space-y-1">
                {consentForm.content.legalRepresentation.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">
                {consentForm.content.usageRestrictions.title}
              </h3>
              <p className="text-gray-700 mb-2">{consentForm.content.usageRestrictions.text}</p>
              <ul className="list-disc pl-6 space-y-1">
                {consentForm.content.usageRestrictions.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">
                {consentForm.content.liabilityAcknowledgment.title}
              </h3>
              <p className="text-gray-700 mb-2">{consentForm.content.liabilityAcknowledgment.text}</p>
              <ul className="list-disc pl-6 space-y-1">
                {consentForm.content.liabilityAcknowledgment.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </section>

            <section className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">
                {consentForm.content.consent.title}
              </h3>
              <p className="text-gray-700 mb-4">{consentForm.content.consent.text}</p>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">
                  I have read, understood, and agree to the Voice Clone Consent and Acknowledgment terms above.
                </span>
              </label>
            </section>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={!consent || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'I Agree'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
