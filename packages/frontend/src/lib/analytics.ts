import { apiClient } from './api-client';

let sessionId: string | null = null;

// Generate or retrieve session ID
function getSessionId(): string {
  if (sessionId) return sessionId;

  // Try to get from sessionStorage
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('analytics_session_id');
    if (stored) {
      sessionId = stored;
      return sessionId;
    }
  }

  // Generate new session ID
  sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('analytics_session_id', sessionId);
  }

  return sessionId;
}

interface TrackEventOptions {
  eventName: string;
  eventData?: Record<string, any>;
  pageUrl?: string;
}

export const analytics = {
  // Track an analytics event
  track: async ({ eventName, eventData, pageUrl }: TrackEventOptions) => {
    try {
      await apiClient.post('/api/analytics/events', {
        eventName,
        eventData,
        pageUrl: pageUrl || (typeof window !== 'undefined' ? window.location.pathname : undefined),
        sessionId: getSessionId(),
      });
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.error('Analytics tracking failed:', error);
    }
  },

  // Track page view
  pageView: async (pagePath?: string) => {
    const path = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '/');
    await analytics.track({
      eventName: 'page_view',
      pageUrl: path,
    });
  },

  // Track user registration
  userRegistered: async () => {
    await analytics.track({
      eventName: 'user_registered',
    });
  },

  // Track project creation
  projectCreated: async (projectId: string, sourceLanguage: string, targetLanguage: string) => {
    await analytics.track({
      eventName: 'project_created',
      eventData: {
        projectId,
        sourceLanguage,
        targetLanguage,
      },
    });
  },

  // Track video upload
  videoUploaded: async (projectId: string, duration: number, fileSize: number) => {
    await analytics.track({
      eventName: 'video_uploaded',
      eventData: {
        projectId,
        duration,
        fileSize,
      },
    });
  },

  // Track transcript editing
  transcriptEdited: async (projectId: string) => {
    await analytics.track({
      eventName: 'transcript_edited',
      eventData: { projectId },
    });
  },

  // Track translation editing
  translationEdited: async (projectId: string) => {
    await analytics.track({
      eventName: 'translation_edited',
      eventData: { projectId },
    });
  },

  // Track voice clone creation
  voiceCloneCreated: async (voiceId: string, language: string) => {
    await analytics.track({
      eventName: 'voice_clone_created',
      eventData: {
        voiceId,
        language,
      },
    });
  },

  // Track project completion
  projectCompleted: async (projectId: string, processingTime: number) => {
    await analytics.track({
      eventName: 'project_completed',
      eventData: {
        projectId,
        processingTime,
      },
    });
  },

  // Track feature usage
  featureUsed: async (featureName: string, metadata?: Record<string, any>) => {
    await analytics.track({
      eventName: 'feature_used',
      eventData: {
        feature: featureName,
        ...metadata,
      },
    });
  },

  // Track errors
  errorOccurred: async (errorType: string, errorMessage: string, context?: Record<string, any>) => {
    await analytics.track({
      eventName: 'error_occurred',
      eventData: {
        errorType,
        errorMessage,
        ...context,
      },
    });
  },
};
