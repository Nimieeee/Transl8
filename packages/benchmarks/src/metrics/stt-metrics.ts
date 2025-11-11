/**
 * STT Metrics Calculation
 * Implements Word Error Rate (WER) and Diarization Error Rate (DER)
 */

import * as levenshtein from 'fast-levenshtein';

export interface WERResult {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  totalWords: number;
}

export interface DERResult {
  der: number;
  missedSpeech: number;
  falseAlarm: number;
  speakerError: number;
  totalSpeechTime: number;
}

/**
 * Calculate Word Error Rate (WER)
 * WER = (S + D + I) / N
 * where S = substitutions, D = deletions, I = insertions, N = total words in reference
 */
export function calculateWER(reference: string, hypothesis: string): WERResult {
  // Normalize text
  const refWords = normalizeText(reference).split(/\s+/).filter(Boolean);
  const hypWords = normalizeText(hypothesis).split(/\s+/).filter(Boolean);

  // Calculate edit distance and operations
  const { distance, operations } = levenshteinWithOperations(refWords, hypWords);

  const substitutions = operations.filter((op) => op === 'substitute').length;
  const deletions = operations.filter((op) => op === 'delete').length;
  const insertions = operations.filter((op) => op === 'insert').length;

  const wer = refWords.length > 0 ? distance / refWords.length : 0;

  return {
    wer: Math.round(wer * 10000) / 100, // Percentage with 2 decimal places
    substitutions,
    deletions,
    insertions,
    totalWords: refWords.length,
  };
}

/**
 * Calculate Diarization Error Rate (DER)
 * DER = (Miss + FA + SpkErr) / Total
 */
export function calculateDER(
  referenceSegments: Array<{ start: number; end: number; speaker: string }>,
  hypothesisSegments: Array<{ start: number; end: number; speaker: string }>
): DERResult {
  // Calculate total speech time from reference
  const totalSpeechTime = referenceSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);

  let missedSpeech = 0;
  let falseAlarm = 0;
  let speakerError = 0;

  // Create time-aligned comparison
  const timeStep = 0.01; // 10ms resolution
  const maxTime = Math.max(
    ...referenceSegments.map((s) => s.end),
    ...hypothesisSegments.map((s) => s.end)
  );

  for (let t = 0; t < maxTime; t += timeStep) {
    const refSpeaker = getSpeakerAtTime(referenceSegments, t);
    const hypSpeaker = getSpeakerAtTime(hypothesisSegments, t);

    if (refSpeaker && !hypSpeaker) {
      // Missed speech
      missedSpeech += timeStep;
    } else if (!refSpeaker && hypSpeaker) {
      // False alarm
      falseAlarm += timeStep;
    } else if (refSpeaker && hypSpeaker && refSpeaker !== hypSpeaker) {
      // Speaker error
      speakerError += timeStep;
    }
  }

  const der =
    totalSpeechTime > 0 ? (missedSpeech + falseAlarm + speakerError) / totalSpeechTime : 0;

  return {
    der: Math.round(der * 10000) / 100, // Percentage
    missedSpeech: Math.round(missedSpeech * 100) / 100,
    falseAlarm: Math.round(falseAlarm * 100) / 100,
    speakerError: Math.round(speakerError * 100) / 100,
    totalSpeechTime: Math.round(totalSpeechTime * 100) / 100,
  };
}

/**
 * Calculate average confidence score
 */
export function calculateAverageConfidence(segments: Array<{ confidence?: number }>): number {
  const confidences = segments.map((s) => s.confidence).filter((c): c is number => c !== undefined);

  if (confidences.length === 0) return 0;

  const sum = confidences.reduce((acc, c) => acc + c, 0);
  return Math.round((sum / confidences.length) * 10000) / 10000;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Levenshtein distance with operation tracking
 */
function levenshteinWithOperations(
  ref: string[],
  hyp: string[]
): { distance: number; operations: string[] } {
  const m = ref.length;
  const n = hyp.length;

  // Create DP table
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  // Initialize
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  // Backtrack to find operations
  const operations: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      operations.push('substitute');
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      operations.push('delete');
      i--;
    } else {
      operations.push('insert');
      j--;
    }
  }

  return { distance: dp[m][n], operations: operations.reverse() };
}

/**
 * Get speaker at specific time
 */
function getSpeakerAtTime(
  segments: Array<{ start: number; end: number; speaker: string }>,
  time: number
): string | null {
  const segment = segments.find((s) => time >= s.start && time < s.end);
  return segment ? segment.speaker : null;
}
