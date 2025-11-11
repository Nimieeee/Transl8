'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProject } from '@/hooks/use-projects';
import { useVoices, useVoiceClones } from '@/hooks/use-voices';
import { VoiceConfig } from '@/types/api';
import apiClient from '@/lib/api-client';

type Step = 'language' | 'voice' | 'review';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export default function ConfigurePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { project, updateProject, isUpdating } = useProject(projectId);

  const [currentStep, setCurrentStep] = useState<Step>('language');
  const [sourceLanguage, setSourceLanguage] = useState(project?.sourceLanguage || 'en');
  const [targetLanguage, setTargetLanguage] = useState(project?.targetLanguage || 'es');
  const [voiceType, setVoiceType] = useState<'preset' | 'clone'>('preset');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);

  const { voices, isLoading: isLoadingVoices } = useVoices(targetLanguage);
  const { clones, isLoading: isLoadingClones } = useVoiceClones();

  const handleNext = () => {
    if (currentStep === 'language') {
      setCurrentStep('voice');
    } else if (currentStep === 'voice') {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'voice') {
      setCurrentStep('language');
    } else if (currentStep === 'review') {
      setCurrentStep('voice');
    }
  };

  const handleStartProcessing = async () => {
    setIsStarting(true);
    try {
      // Update project configuration
      await updateProject({
        sourceLanguage,
        targetLanguage,
      });

      // Save voice configuration
      const voiceConfig: VoiceConfig = {
        type: voiceType,
        voiceId: selectedVoiceId,
      };

      await apiClient.put(`/projects/${projectId}`, {
        voiceConfig,
      });

      // Start processing
      await apiClient.post(`/projects/${projectId}/start`);

      // Navigate to project page
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to start processing:', error);
      alert('Failed to start processing. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  if (!project) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-600 mt-1">Configure your dubbing project</p>
              </div>
              <button onClick={() => router.push('/dashboard')} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <nav aria-label="Progress">
              <ol className="flex items-center">
                <li className="relative pr-8 sm:pr-20">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-success-600 rounded-full">
                      <svg
                        className="w-6 h-6 text-white"
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
                    </div>
                    <span className="ml-4 text-sm font-medium text-gray-900">Upload</span>
                  </div>
                </li>
                <li className="relative pr-8 sm:pr-20">
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        currentStep !== 'language' ? 'bg-primary-600' : 'bg-primary-600'
                      }`}
                    >
                      <span className="text-white font-medium">2</span>
                    </div>
                    <span className="ml-4 text-sm font-medium text-gray-900">Configure</span>
                  </div>
                </li>
                <li className="relative">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded-full">
                      <span className="text-gray-600 font-medium">3</span>
                    </div>
                    <span className="ml-4 text-sm font-medium text-gray-500">Process</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          {/* Configuration Steps */}
          <div className="card">
            {/* Language Selection */}
            {currentStep === 'language' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Select Languages</h2>

                <div>
                  <label className="label">Source Language</label>
                  <select
                    className="input"
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">The language spoken in your video</p>
                </div>

                <div>
                  <label className="label">Target Language</label>
                  <select
                    className="input"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">The language you want to dub into</p>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleNext} className="btn-primary">
                    Next: Select Voice
                  </button>
                </div>
              </div>
            )}

            {/* Voice Selection */}
            {currentStep === 'voice' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Select Voice</h2>

                {/* Voice Type Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setVoiceType('preset')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        voiceType === 'preset'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Preset Voices
                    </button>
                    <button
                      onClick={() => setVoiceType('clone')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        voiceType === 'clone'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Voice Clones
                    </button>
                  </nav>
                </div>

                {/* Preset Voices */}
                {voiceType === 'preset' && (
                  <div className="space-y-4">
                    {isLoadingVoices ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      </div>
                    ) : voices.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        No preset voices available for {targetLanguage}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {voices.map((voice) => (
                          <div
                            key={voice.id}
                            onClick={() => setSelectedVoiceId(voice.id)}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              selectedVoiceId === voice.id
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900">{voice.name}</h3>
                                <p className="text-sm text-gray-500">
                                  {voice.gender} • {voice.style}
                                </p>
                              </div>
                              {voice.sampleUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const audio = new Audio(voice.sampleUrl);
                                    audio.play();
                                  }}
                                  className="text-primary-600 hover:text-primary-700"
                                >
                                  <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Voice Clones */}
                {voiceType === 'clone' && (
                  <div className="space-y-4">
                    {isLoadingClones ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      </div>
                    ) : clones.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No voice clones yet</p>
                        <button onClick={() => router.push('/voices')} className="btn-primary">
                          Create Voice Clone
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clones.map((clone) => (
                          <div
                            key={clone.id}
                            onClick={() => setSelectedVoiceId(clone.id)}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              selectedVoiceId === clone.id
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <h3 className="font-medium text-gray-900">{clone.name}</h3>
                            <p className="text-sm text-gray-500">{clone.language}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button onClick={handleBack} className="btn-secondary">
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!selectedVoiceId}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Review
                  </button>
                </div>
              </div>
            )}

            {/* Review */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Review Configuration</h2>

                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-600">Source Language</span>
                    <span className="font-medium text-gray-900">
                      {languages.find((l) => l.code === sourceLanguage)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-600">Target Language</span>
                    <span className="font-medium text-gray-900">
                      {languages.find((l) => l.code === targetLanguage)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-600">Voice Type</span>
                    <span className="font-medium text-gray-900">
                      {voiceType === 'preset' ? 'Preset Voice' : 'Voice Clone'}
                    </span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-gray-600">Selected Voice</span>
                    <span className="font-medium text-gray-900">
                      {voiceType === 'preset'
                        ? voices.find((v) => v.id === selectedVoiceId)?.name
                        : clones.find((c) => c.id === selectedVoiceId)?.name}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Processing will begin immediately. You'll be able to review and edit the
                        transcript and translation before final rendering.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button onClick={handleBack} className="btn-secondary">
                    Back
                  </button>
                  <button
                    onClick={handleStartProcessing}
                    disabled={isStarting || isUpdating}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStarting ? 'Starting...' : 'Start Processing'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
  );
}
