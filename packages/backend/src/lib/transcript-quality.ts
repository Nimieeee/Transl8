/**
 * Transcript Quality Analysis
 * 
 * Utilities for analyzing transcript quality, calculating confidence scores,
 * and flagging segments that need user review.
 * 
 * Requirements: 15.2
 */

import type { TranscriptSegment, Transcript } from '../adapters/types';

export interface QualityMetrics {
  averageConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  lowConfidenceSegmentCount: number;
  lowConfidenceSegmentIds: number[];
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[];
  recommendations: string[];
}

export interface SegmentQualityFlag {
  segmentId: number;
  reason: 'low_confidence' | 'very_low_confidence' | 'no_speech_detected';
  confidence: number;
  needsReview: boolean;
}

/**
 * Confidence thresholds for quality assessment
 */
const CONFIDENCE_THRESHOLDS = {
  EXCELLENT: 0.9,
  GOOD: 0.8,
  FAIR: 0.7,
  POOR: 0.6,
  VERY_LOW: 0.5,
};

/**
 * Calculate comprehensive quality metrics for a transcript
 */
export function calculateQualityMetrics(transcript: Transcript): QualityMetrics {
  const segments = transcript.segments;
  
  if (segments.length === 0) {
    return {
      averageConfidence: 0,
      minConfidence: 0,
      maxConfidence: 0,
      lowConfidenceSegmentCount: 0,
      lowConfidenceSegmentIds: [],
      qualityLevel: 'poor',
      warnings: ['No segments found in transcript'],
      recommendations: ['Check audio quality and try again'],
    };
  }

  // Calculate confidence statistics
  const confidences = segments.map(s => s.confidence);
  const averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const minConfidence = Math.min(...confidences);
  const maxConfidence = Math.max(...confidences);

  // Identify low confidence segments
  const lowConfidenceSegments = segments.filter(
    s => s.confidence < CONFIDENCE_THRESHOLDS.FAIR
  );
  const lowConfidenceSegmentIds = lowConfidenceSegments.map(s => s.id);

  // Determine quality level
  const qualityLevel = determineQualityLevel(averageConfidence);

  // Generate warnings
  const warnings = generateQualityWarnings(
    averageConfidence,
    lowConfidenceSegments.length,
    segments.length,
    transcript.speakerCount
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    qualityLevel,
    lowConfidenceSegments.length,
    segments.length
  );

  return {
    averageConfidence,
    minConfidence,
    maxConfidence,
    lowConfidenceSegmentCount: lowConfidenceSegments.length,
    lowConfidenceSegmentIds,
    qualityLevel,
    warnings,
    recommendations,
  };
}

/**
 * Flag segments that need user review
 */
export function flagSegmentsForReview(segments: TranscriptSegment[]): SegmentQualityFlag[] {
  const flags: SegmentQualityFlag[] = [];

  for (const segment of segments) {
    if (segment.confidence < CONFIDENCE_THRESHOLDS.VERY_LOW) {
      flags.push({
        segmentId: segment.id,
        reason: 'very_low_confidence',
        confidence: segment.confidence,
        needsReview: true,
      });
    } else if (segment.confidence < CONFIDENCE_THRESHOLDS.FAIR) {
      flags.push({
        segmentId: segment.id,
        reason: 'low_confidence',
        confidence: segment.confidence,
        needsReview: true,
      });
    }

    // Check for potential no-speech segments (very short with low confidence)
    const duration = segment.end - segment.start;
    if (duration < 0.5 && segment.confidence < CONFIDENCE_THRESHOLDS.GOOD) {
      flags.push({
        segmentId: segment.id,
        reason: 'no_speech_detected',
        confidence: segment.confidence,
        needsReview: true,
      });
    }
  }

  return flags;
}

/**
 * Determine overall quality level based on average confidence
 */
function determineQualityLevel(averageConfidence: number): QualityMetrics['qualityLevel'] {
  if (averageConfidence >= CONFIDENCE_THRESHOLDS.EXCELLENT) {
    return 'excellent';
  } else if (averageConfidence >= CONFIDENCE_THRESHOLDS.GOOD) {
    return 'good';
  } else if (averageConfidence >= CONFIDENCE_THRESHOLDS.FAIR) {
    return 'fair';
  } else {
    return 'poor';
  }
}

/**
 * Generate quality warnings
 */
function generateQualityWarnings(
  averageConfidence: number,
  lowConfidenceCount: number,
  totalSegments: number,
  speakerCount: number
): string[] {
  const warnings: string[] = [];

  // Overall confidence warning
  if (averageConfidence < CONFIDENCE_THRESHOLDS.FAIR) {
    warnings.push(
      `Low average confidence (${(averageConfidence * 100).toFixed(1)}%). ` +
      `Audio quality may be poor or contain significant background noise.`
    );
  }

  // Low confidence segments warning
  const lowConfidencePercentage = (lowConfidenceCount / totalSegments) * 100;
  if (lowConfidencePercentage > 20) {
    warnings.push(
      `${lowConfidenceCount} of ${totalSegments} segments (${lowConfidencePercentage.toFixed(1)}%) ` +
      `have low confidence and should be reviewed.`
    );
  } else if (lowConfidenceCount > 0) {
    warnings.push(
      `${lowConfidenceCount} segment(s) have low confidence and may need review.`
    );
  }

  // Speaker detection warning
  if (speakerCount === 0) {
    warnings.push('No speakers detected in audio. Diarization may have failed.');
  } else if (speakerCount > 10) {
    warnings.push(
      `Detected ${speakerCount} speakers. This may indicate over-segmentation. ` +
      `Consider reviewing speaker labels.`
    );
  }

  return warnings;
}

/**
 * Generate recommendations for improving quality
 */
function generateRecommendations(
  qualityLevel: QualityMetrics['qualityLevel'],
  lowConfidenceCount: number,
  totalSegments: number
): string[] {
  const recommendations: string[] = [];

  if (qualityLevel === 'poor') {
    recommendations.push(
      'Consider re-recording with better audio quality',
      'Reduce background noise and ensure clear speech',
      'Use a higher quality microphone if possible'
    );
  } else if (qualityLevel === 'fair') {
    recommendations.push(
      'Review and edit low-confidence segments before proceeding',
      'Consider improving audio quality for future recordings'
    );
  }

  if (lowConfidenceCount > 0) {
    recommendations.push(
      'Review flagged segments in the transcript editor',
      'Correct any transcription errors before translation'
    );
  }

  const lowConfidencePercentage = (lowConfidenceCount / totalSegments) * 100;
  if (lowConfidencePercentage > 50) {
    recommendations.push(
      'More than half of the segments have low confidence. ' +
      'Consider re-uploading with better audio quality.'
    );
  }

  return recommendations;
}

/**
 * Calculate word-level confidence statistics
 */
export function calculateWordConfidenceStats(segment: TranscriptSegment): {
  averageWordConfidence: number;
  lowConfidenceWordCount: number;
  totalWords: number;
} {
  if (!segment.words || segment.words.length === 0) {
    return {
      averageWordConfidence: segment.confidence,
      lowConfidenceWordCount: 0,
      totalWords: 0,
    };
  }

  const wordConfidences = segment.words.map(w => w.confidence);
  const averageWordConfidence = 
    wordConfidences.reduce((a, b) => a + b, 0) / wordConfidences.length;
  
  const lowConfidenceWordCount = segment.words.filter(
    w => w.confidence < CONFIDENCE_THRESHOLDS.FAIR
  ).length;

  return {
    averageWordConfidence,
    lowConfidenceWordCount,
    totalWords: segment.words.length,
  };
}

/**
 * Check if transcript meets minimum quality threshold for proceeding
 */
export function meetsMinimumQuality(metrics: QualityMetrics): {
  passes: boolean;
  reason?: string;
} {
  // Minimum threshold: average confidence >= 0.6 (POOR threshold)
  if (metrics.averageConfidence < CONFIDENCE_THRESHOLDS.POOR) {
    return {
      passes: false,
      reason: `Average confidence (${(metrics.averageConfidence * 100).toFixed(1)}%) ` +
        `is below minimum threshold (${(CONFIDENCE_THRESHOLDS.POOR * 100).toFixed(1)}%). ` +
        `Please improve audio quality and try again.`,
    };
  }

  // Check if too many segments have low confidence
  const lowConfidencePercentage = 
    (metrics.lowConfidenceSegmentCount / (metrics.lowConfidenceSegmentIds.length || 1)) * 100;
  
  if (lowConfidencePercentage > 80) {
    return {
      passes: false,
      reason: `More than 80% of segments have low confidence. ` +
        `Please review audio quality and consider re-recording.`,
    };
  }

  return { passes: true };
}

/**
 * Format quality metrics for display
 */
export function formatQualityMetrics(metrics: QualityMetrics): string {
  const lines = [
    `Quality Level: ${metrics.qualityLevel.toUpperCase()}`,
    `Average Confidence: ${(metrics.averageConfidence * 100).toFixed(1)}%`,
    `Confidence Range: ${(metrics.minConfidence * 100).toFixed(1)}% - ${(metrics.maxConfidence * 100).toFixed(1)}%`,
  ];

  if (metrics.lowConfidenceSegmentCount > 0) {
    lines.push(
      `Low Confidence Segments: ${metrics.lowConfidenceSegmentCount}`
    );
  }

  if (metrics.warnings.length > 0) {
    lines.push('', 'Warnings:');
    metrics.warnings.forEach(w => lines.push(`  - ${w}`));
  }

  if (metrics.recommendations.length > 0) {
    lines.push('', 'Recommendations:');
    metrics.recommendations.forEach(r => lines.push(`  - ${r}`));
  }

  return lines.join('\n');
}
