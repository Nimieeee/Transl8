#!/usr/bin/env ts-node

/**
 * Comprehensive Report Generator
 * Combines all benchmark results into a single comprehensive report
 */

import * as fs from 'fs';
import * as path from 'path';
import { BenchmarkReport } from '../datasets/types';

const RESULTS_DIR = path.join(__dirname, '../../results');

interface ComprehensiveReport {
  generatedAt: string;
  platformVersion: string;
  benchmarks: {
    stt?: BenchmarkReport;
    mt?: BenchmarkReport;
    tts?: BenchmarkReport;
    lipsync?: BenchmarkReport;
  };
  overallSummary: string;
  recommendations: string[];
  competitorComparison: string;
}

/**
 * Find latest benchmark report for a stage
 */
function findLatestReport(stage: string): BenchmarkReport | null {
  try {
    const files = fs
      .readdirSync(RESULTS_DIR)
      .filter((f) => f.startsWith(`${stage}_benchmark_`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.warn(`No ${stage} benchmark reports found`);
      return null;
    }

    const latestFile = files[0];
    const data = fs.readFileSync(path.join(RESULTS_DIR, latestFile), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Error loading ${stage} report:`, error);
    return null;
  }
}

/**
 * Generate overall summary
 */
function generateOverallSummary(benchmarks: {
  stt?: BenchmarkReport;
  mt?: BenchmarkReport;
  tts?: BenchmarkReport;
  lipsync?: BenchmarkReport;
}): string {
  const sections: string[] = [];

  sections.push('# Overall Benchmark Summary\n');
  sections.push(
    'This report provides a comprehensive evaluation of all AI models used in the video dubbing platform.\n'
  );

  // STT Summary
  if (benchmarks.stt) {
    const avgWER = benchmarks.stt.aggregateMetrics.averageWER || 0;
    const avgDER = benchmarks.stt.aggregateMetrics.averageDER || 0;
    sections.push(`## Speech-to-Text (STT)`);
    sections.push(`- Model: ${benchmarks.stt.modelVersion}`);
    sections.push(`- Average WER: ${avgWER}%`);
    sections.push(`- Average DER: ${avgDER}%`);
    sections.push(
      `- Performance: ${avgWER < 10 ? 'Excellent' : avgWER < 20 ? 'Good' : 'Needs Improvement'}\n`
    );
  }

  // MT Summary
  if (benchmarks.mt) {
    const avgBLEU = benchmarks.mt.aggregateMetrics.averageBLEU || 0;
    sections.push(`## Machine Translation (MT)`);
    sections.push(`- Model: ${benchmarks.mt.modelVersion}`);
    sections.push(`- Average BLEU: ${avgBLEU}`);
    sections.push(
      `- Performance: ${avgBLEU > 40 ? 'Excellent' : avgBLEU > 30 ? 'Good' : 'Needs Improvement'}\n`
    );
  }

  // TTS Summary
  if (benchmarks.tts) {
    const avgMOS = benchmarks.tts.aggregateMetrics.averageMOS || 0;
    sections.push(`## Text-to-Speech (TTS)`);
    sections.push(`- Model: ${benchmarks.tts.modelVersion}`);
    sections.push(`- Average MOS: ${avgMOS}/5.0`);
    sections.push(
      `- Performance: ${avgMOS > 4.0 ? 'Excellent' : avgMOS > 3.5 ? 'Good' : 'Needs Improvement'}\n`
    );
  }

  // Lip-Sync Summary
  if (benchmarks.lipsync) {
    const avgSync = benchmarks.lipsync.aggregateMetrics.averageSyncConfidence || 0;
    sections.push(`## Lip Synchronization`);
    sections.push(`- Model: ${benchmarks.lipsync.modelVersion}`);
    sections.push(`- Average Sync Confidence: ${avgSync}`);
    sections.push(
      `- Performance: ${avgSync > 0.9 ? 'Excellent' : avgSync > 0.8 ? 'Good' : 'Needs Improvement'}\n`
    );
  }

  return sections.join('\n');
}

/**
 * Generate recommendations
 */
function generateRecommendations(benchmarks: {
  stt?: BenchmarkReport;
  mt?: BenchmarkReport;
  tts?: BenchmarkReport;
  lipsync?: BenchmarkReport;
}): string[] {
  const recommendations: string[] = [];

  // STT recommendations
  if (benchmarks.stt) {
    const avgWER = benchmarks.stt.aggregateMetrics.averageWER || 0;
    const avgWERNoisy = benchmarks.stt.aggregateMetrics.averageWERNoisy || 0;

    if (avgWER > 15) {
      recommendations.push(
        'STT: Consider upgrading to a larger Whisper model or fine-tuning on domain-specific data'
      );
    }

    if (avgWERNoisy > avgWER * 1.5) {
      recommendations.push(
        'STT: Implement audio preprocessing (noise reduction) to improve performance on noisy audio'
      );
    }
  }

  // MT recommendations
  if (benchmarks.mt) {
    const avgBLEU = benchmarks.mt.aggregateMetrics.averageBLEU || 0;
    const glossaryAccuracy = benchmarks.mt.aggregateMetrics.averageGlossaryAccuracy || 0;

    if (avgBLEU < 35) {
      recommendations.push(
        'MT: Consider switching to LLM-based translation (e.g., Llama 3.1) for better quality'
      );
    }

    if (glossaryAccuracy < 90) {
      recommendations.push(
        'MT: Improve glossary term matching algorithm or use constrained decoding'
      );
    }
  }

  // TTS recommendations
  if (benchmarks.tts) {
    const avgMOS = benchmarks.tts.aggregateMetrics.averageMOS || 0;
    const avgSimilarity = benchmarks.tts.aggregateMetrics.averageSimilarity || 0;

    if (avgMOS < 4.0) {
      recommendations.push(
        'TTS: Fine-tune models on target language data or explore alternative TTS architectures'
      );
    }

    if (avgSimilarity < 0.85) {
      recommendations.push(
        'TTS: Improve voice cloning by requiring longer reference samples or using better speaker encoders'
      );
    }
  }

  // Lip-Sync recommendations
  if (benchmarks.lipsync) {
    const avgSync = benchmarks.lipsync.aggregateMetrics.averageSyncConfidence || 0;
    const avgFPS = benchmarks.lipsync.aggregateMetrics.averageFPS || 0;

    if (avgSync < 0.85) {
      recommendations.push(
        'Lip-Sync: Explore alternative models (e.g., Wav2Lip-GAN) or improve face detection preprocessing'
      );
    }

    if (avgFPS < 10) {
      recommendations.push(
        'Lip-Sync: Optimize GPU utilization or implement batch processing for better throughput'
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'All models are performing well. Continue monitoring and consider A/B testing new model versions.'
    );
  }

  return recommendations;
}

/**
 * Generate competitor comparison
 */
function generateCompetitorComparison(benchmarks: {
  stt?: BenchmarkReport;
  mt?: BenchmarkReport;
  tts?: BenchmarkReport;
  lipsync?: BenchmarkReport;
}): string {
  const sections: string[] = [];

  sections.push('# Competitor Comparison\n');

  // TTS comparison (if available)
  if (benchmarks.tts) {
    const avgMOS = benchmarks.tts.aggregateMetrics.averageMOS || 0;

    sections.push('## Text-to-Speech Quality');
    sections.push('| Service | MOS Score | Difference |');
    sections.push('|---------|-----------|------------|');
    sections.push(`| Our Platform | ${avgMOS.toFixed(2)} | - |`);
    sections.push(`| Google Cloud TTS | 4.30 | ${(avgMOS - 4.3).toFixed(2)} |`);
    sections.push(`| Amazon Polly | 4.20 | ${(avgMOS - 4.2).toFixed(2)} |`);
    sections.push(`| Microsoft Azure | 4.25 | ${(avgMOS - 4.25).toFixed(2)} |`);
    sections.push(`| ElevenLabs | 4.50 | ${(avgMOS - 4.5).toFixed(2)} |\n`);
  }

  // MT comparison
  if (benchmarks.mt) {
    const avgBLEU = benchmarks.mt.aggregateMetrics.averageBLEU || 0;

    sections.push('## Translation Quality');
    sections.push('| Service | BLEU Score | Difference |');
    sections.push('|---------|------------|------------|');
    sections.push(`| Our Platform | ${avgBLEU.toFixed(2)} | - |`);
    sections.push(`| Google Translate | 42.0 | ${(avgBLEU - 42.0).toFixed(2)} |`);
    sections.push(`| DeepL | 45.0 | ${(avgBLEU - 45.0).toFixed(2)} |`);
    sections.push(`| Microsoft Translator | 40.0 | ${(avgBLEU - 40.0).toFixed(2)} |\n`);
  }

  sections.push('\n*Note: Competitor scores are approximate baselines from public benchmarks.*');

  return sections.join('\n');
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report: ComprehensiveReport): string {
  const sections: string[] = [];

  sections.push('# AI Video Dubbing Platform - Comprehensive Benchmark Report\n');
  sections.push(`**Generated:** ${report.generatedAt}`);
  sections.push(`**Platform Version:** ${report.platformVersion}\n`);
  sections.push('---\n');

  // Overall Summary
  sections.push(report.overallSummary);
  sections.push('\n---\n');

  // Detailed Results
  sections.push('# Detailed Benchmark Results\n');

  if (report.benchmarks.stt) {
    sections.push('## Speech-to-Text (STT)\n');
    sections.push('```');
    sections.push(report.benchmarks.stt.summary);
    sections.push('```\n');
  }

  if (report.benchmarks.mt) {
    sections.push('## Machine Translation (MT)\n');
    sections.push('```');
    sections.push(report.benchmarks.mt.summary);
    sections.push('```\n');
  }

  if (report.benchmarks.tts) {
    sections.push('## Text-to-Speech (TTS)\n');
    sections.push('```');
    sections.push(report.benchmarks.tts.summary);
    sections.push('```\n');
  }

  if (report.benchmarks.lipsync) {
    sections.push('## Lip Synchronization\n');
    sections.push('```');
    sections.push(report.benchmarks.lipsync.summary);
    sections.push('```\n');
  }

  sections.push('---\n');

  // Competitor Comparison
  sections.push(report.competitorComparison);
  sections.push('\n---\n');

  // Recommendations
  sections.push('# Recommendations for Improvement\n');
  report.recommendations.forEach((rec, i) => {
    sections.push(`${i + 1}. ${rec}`);
  });
  sections.push('\n---\n');

  // Areas for Improvement
  sections.push('# Areas for Improvement\n');
  sections.push(
    'Based on the benchmark results, the following areas have been identified for potential improvement:\n'
  );

  const improvements: string[] = [];

  if (report.benchmarks.stt) {
    const avgWER = report.benchmarks.stt.aggregateMetrics.averageWER || 0;
    if (avgWER > 10) {
      improvements.push(
        '- **STT Accuracy**: Word Error Rate could be improved through model fine-tuning or preprocessing'
      );
    }
  }

  if (report.benchmarks.mt) {
    const avgBLEU = report.benchmarks.mt.aggregateMetrics.averageBLEU || 0;
    if (avgBLEU < 40) {
      improvements.push(
        '- **Translation Quality**: BLEU scores indicate room for improvement in translation naturalness'
      );
    }
  }

  if (report.benchmarks.tts) {
    const avgMOS = report.benchmarks.tts.aggregateMetrics.averageMOS || 0;
    if (avgMOS < 4.2) {
      improvements.push(
        '- **Voice Quality**: MOS scores suggest potential for more natural-sounding synthesis'
      );
    }
  }

  if (report.benchmarks.lipsync) {
    const avgFPS = report.benchmarks.lipsync.aggregateMetrics.averageFPS || 0;
    if (avgFPS < 15) {
      improvements.push(
        '- **Processing Speed**: Lip-sync processing could benefit from optimization'
      );
    }
  }

  if (improvements.length === 0) {
    sections.push('All metrics are within acceptable ranges. Continue monitoring performance.\n');
  } else {
    sections.push(improvements.join('\n'));
    sections.push('');
  }

  sections.push('\n---\n');

  // Conclusion
  sections.push('# Conclusion\n');
  sections.push(
    'This comprehensive benchmark report provides insights into the performance of all AI models in the video dubbing pipeline. '
  );
  sections.push(
    'Regular benchmarking should be conducted to track improvements and identify regressions. '
  );
  sections.push(
    'Consider running these benchmarks before each major release and when evaluating new model versions.\n'
  );

  sections.push('## Next Steps\n');
  sections.push('1. Address high-priority recommendations');
  sections.push('2. Conduct A/B testing for model improvements');
  sections.push('3. Gather user feedback on production quality');
  sections.push('4. Schedule next benchmark run for [DATE]');
  sections.push('5. Publish results for transparency (if applicable)\n');

  return sections.join('\n');
}

/**
 * Main report generation
 */
async function main(): Promise<void> {
  console.log('=== Comprehensive Benchmark Report Generator ===\n');

  // Ensure results directory exists
  if (!fs.existsSync(RESULTS_DIR)) {
    console.error(`Results directory not found: ${RESULTS_DIR}`);
    console.error('Please run individual benchmarks first.');
    process.exit(1);
  }

  // Load all benchmark reports
  console.log('Loading benchmark reports...');
  const sttReport = findLatestReport('stt');
  const mtReport = findLatestReport('mt');
  const ttsReport = findLatestReport('tts');
  const lipsyncReport = findLatestReport('lipsync');

  const benchmarks = {
    stt: sttReport || undefined,
    mt: mtReport || undefined,
    tts: ttsReport || undefined,
    lipsync: lipsyncReport || undefined,
  };

  const foundReports = Object.values(benchmarks).filter(Boolean).length;
  console.log(`Found ${foundReports} benchmark report(s)\n`);

  if (foundReports === 0) {
    console.error('No benchmark reports found. Please run benchmarks first.');
    process.exit(1);
  }

  // Generate comprehensive report
  console.log('Generating comprehensive report...');

  const report: ComprehensiveReport = {
    generatedAt: new Date().toISOString(),
    platformVersion: '1.0.0',
    benchmarks,
    overallSummary: generateOverallSummary(benchmarks),
    recommendations: generateRecommendations(benchmarks),
    competitorComparison: generateCompetitorComparison(benchmarks),
  };

  // Save JSON report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(RESULTS_DIR, `comprehensive_report_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`JSON report saved to: ${jsonPath}`);

  // Save Markdown report
  const markdownContent = generateMarkdownReport(report);
  const mdPath = path.join(RESULTS_DIR, `comprehensive_report_${timestamp}.md`);
  fs.writeFileSync(mdPath, markdownContent);
  console.log(`Markdown report saved to: ${mdPath}`);

  // Display summary
  console.log('\n=== Report Summary ===\n');
  console.log(report.overallSummary);
  console.log('\n=== Recommendations ===\n');
  report.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });

  console.log('\n=== Report Generation Complete ===');
  console.log(`\nView the full report at: ${mdPath}`);
}

main().catch((error) => {
  console.error('Report generation failed:', error);
  process.exit(1);
});
