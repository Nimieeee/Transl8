export const mockTranscript = {
  text: 'Hello everyone, welcome to my channel. Today we will discuss AI video dubbing.',
  duration: 10.5,
  language: 'en',
  segments: [
    {
      id: 0,
      start: 0.0,
      end: 3.5,
      text: 'Hello everyone, welcome to my channel.',
      speaker: 'SPEAKER_00',
      confidence: 0.95,
      words: [
        { word: 'Hello', start: 0.0, end: 0.5, confidence: 0.98 },
        { word: 'everyone', start: 0.5, end: 1.2, confidence: 0.96 },
        { word: 'welcome', start: 1.3, end: 1.8, confidence: 0.97 },
        { word: 'to', start: 1.9, end: 2.0, confidence: 0.99 },
        { word: 'my', start: 2.1, end: 2.3, confidence: 0.98 },
        { word: 'channel', start: 2.4, end: 3.5, confidence: 0.95 },
      ],
    },
    {
      id: 1,
      start: 3.5,
      end: 10.5,
      text: 'Today we will discuss AI video dubbing.',
      speaker: 'SPEAKER_00',
      confidence: 0.92,
      words: [
        { word: 'Today', start: 3.5, end: 4.0, confidence: 0.94 },
        { word: 'we', start: 4.1, end: 4.3, confidence: 0.98 },
        { word: 'will', start: 4.4, end: 4.7, confidence: 0.96 },
        { word: 'discuss', start: 4.8, end: 5.5, confidence: 0.93 },
        { word: 'AI', start: 5.6, end: 6.0, confidence: 0.89 },
        { word: 'video', start: 6.1, end: 6.6, confidence: 0.91 },
        { word: 'dubbing', start: 6.7, end: 10.5, confidence: 0.90 },
      ],
    },
  ],
};

export const mockMultiSpeakerTranscript = {
  text: 'Hello. Hi there. How are you? I am doing great.',
  duration: 8.0,
  language: 'en',
  segments: [
    {
      id: 0,
      start: 0.0,
      end: 2.0,
      text: 'Hello.',
      speaker: 'SPEAKER_00',
      confidence: 0.96,
      words: [{ word: 'Hello', start: 0.0, end: 2.0, confidence: 0.96 }],
    },
    {
      id: 1,
      start: 2.0,
      end: 4.0,
      text: 'Hi there.',
      speaker: 'SPEAKER_01',
      confidence: 0.94,
      words: [
        { word: 'Hi', start: 2.0, end: 2.5, confidence: 0.95 },
        { word: 'there', start: 2.6, end: 4.0, confidence: 0.93 },
      ],
    },
    {
      id: 2,
      start: 4.0,
      end: 6.0,
      text: 'How are you?',
      speaker: 'SPEAKER_00',
      confidence: 0.97,
      words: [
        { word: 'How', start: 4.0, end: 4.5, confidence: 0.98 },
        { word: 'are', start: 4.6, end: 5.0, confidence: 0.97 },
        { word: 'you', start: 5.1, end: 6.0, confidence: 0.96 },
      ],
    },
    {
      id: 3,
      start: 6.0,
      end: 8.0,
      text: 'I am doing great.',
      speaker: 'SPEAKER_01',
      confidence: 0.95,
      words: [
        { word: 'I', start: 6.0, end: 6.2, confidence: 0.98 },
        { word: 'am', start: 6.3, end: 6.5, confidence: 0.96 },
        { word: 'doing', start: 6.6, end: 7.0, confidence: 0.94 },
        { word: 'great', start: 7.1, end: 8.0, confidence: 0.93 },
      ],
    },
  ],
};

export const mockTranslation = {
  text: 'Hola a todos, bienvenidos a mi canal. Hoy discutiremos el doblaje de video con IA.',
  targetLanguage: 'es',
  segments: [
    {
      id: 0,
      start: 0.0,
      end: 3.5,
      text: 'Hola a todos, bienvenidos a mi canal.',
      speaker: 'SPEAKER_00',
    },
    {
      id: 1,
      start: 3.5,
      end: 10.5,
      text: 'Hoy discutiremos el doblaje de video con IA.',
      speaker: 'SPEAKER_00',
    },
  ],
};
