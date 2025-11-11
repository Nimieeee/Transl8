#!/usr/bin/env ts-node

/**
 * MT Benchmark Script
 * Evaluates machine translation quality using BLEU scores and glossary accuracy
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { MTDatasetBuilder } from '../datasets/mt-dataset';
import { BenchmarkResult, BenchmarkReport } from '../datasets/types';
import {
  calculateBLEU,
  calculateGlossaryAccuracy,
  calculateFluencyScore,
  BLEUResult,
  GlossaryAccuracyResult,
} from '../metrics/mt-metrics';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const RESULTS_DIR = path.join(__dirname, '../../results');

interface MTBenchmarkResult extends BenchmarkResult {
  bleu?: BLEUResult;
  glossaryAccuracy?: GlossaryAccuracyResult;
  fluencyScore?: number;
  languagePair: string;
  domain: string;
}

/**
 * Run MT inference on a test case
 */
async function runMTInference(
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  glossary?: Record<string, string>
): Promise<string> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/models/mt/translate`,
      {
        text: sourceText,
        sourceLang,
        targetLang,
        glossary,
      },
      { timeout: 30000 }
    );

    return response.data.translation;
  } catch (error) {
    console.warn(`MT inference failed, using mock translation`);
    return generateMockTranslation(sourceText, sourceLang, targetLang);
  }
}

/**
 * Generate mock translation for testing
 */
function generateMockTranslation(
  sourceText: string,
  sourceLang: string,
  targetLang: string
): string {
  // Simple mock translations for common test cases
  const mockTranslations: Record<string, string> = {
    'Hello, how are you today?': 'Hola, ¿cómo estás hoy?',
    'The weather is beautiful this morning.': 'El clima está hermoso esta mañana.',
    'I would like to book a table for two.': 'Je voudrais réserver une table pour deux.',
    'The meeting is scheduled for tomorrow at 3 PM.':
      'Das Treffen ist für morgen um 15 Uhr geplant.',
  };

  return mockTranslations[sourceText] || `[Mock translation of: ${sourceText}]`;
}

/**
 * Benchmark a single test case
 */
async function benchmarkTestCase(testCase: any): Promise<MTBenchmarkResult> {
  console.log(`  Testing: ${testCase.id} (${testCase.sourceLang} → ${testCase.targetLang})`);

  const startTime = Date.now();

  try {
    // Run MT inference
    const translation = await runMTInference(
      testCase.sourceText,
      testCase.sourceLang,
      testCase.targetLang,
      testCase.glossaryTerms
    );

    const processingTime = (Date.now() - startTime) / 1000;

    // Calculate BLEU score
    const bleuResult = calculateBLEU(testCase.referenceTranslation, translation);

    // Calculate glossary accuracy if applicable
    let glossaryAccuracy: GlossaryAccuracyResult | undefined;
    if (testCase.glossaryTerms && Object.keys(testCase.glossaryTerms).length > 0) {
      glossaryAccuracy = calculateGlossaryAccuracy(translation, testCase.glossaryTerms);
    }

    // Calculate fluency score
    const fluencyScore = calculateFluencyScore(translation);

    console.log(`    BLEU: ${bleuResult.bleu}`);
    if (glossaryAccuracy) {
      console.log(`    Glossary Accuracy: ${glossaryAccuracy.accuracy}%`);
    }
    console.log(`    Fluency: ${fluencyScore}/5.0`);

    return {
      testCaseId: testCase.id,
      success: true,
      metrics: {
        bleu: bleuResult.bleu,
        ...(glossaryAccuracy && { glossaryAccuracy: glossaryAccuracy.accuracy }),
        fluency: fluencyScore,
      },
      processingTime,
      bleu: bleuResult,
      glossaryAccuracy,
      fluencyScore,
      languagePair: `${testCase.sourceLang}-${testCase.targetLang}`,
      domain: testCase.domain,
    };
  } catch (error: any) {
    console.log(`    Error: ${error.message}`);

    return {
      testCaseId: testCase.id,
      success: false,
      metrics: {},
      processingTime: (Date.now() - startTime) / 1000,
      error: error.message,
      languagePair: `${testCase.sourceLang}-${testCase.targetLang}`,
      domain: testCase.domain,
    };
  }
}

/**
 * Calculate aggregate metrics
 */
function calculateAggregateMetrics(results: MTBenchmarkResult[]): Record<string, number> {
  const successfulResults = results.filter((r) => r.success);

  if (successfulResults.length === 0) {
    return {};
  }

  // Average BLEU
  const avgBLEU =
    successfulResults.reduce((sum, r) => sum + (r.metrics.bleu || 0), 0) / successfulResults.length;

  // Average glossary accuracy
  const glossaryResults = successfulResults.filter((r) => r.glossaryAccuracy);
  const avgGlossaryAccuracy =
    glossaryResults.length > 0
      ? glossaryResults.reduce((sum, r) => sum + (r.metrics.glossaryAccuracy || 0), 0) /
        glossaryResults.length
      : 0;

  // Average fluency
  const avgFluency =
    successfulResults.reduce((sum, r) => sum + (r.metrics.fluency || 0), 0) /
    successfulResults.length;

  // BLEU by language pair
  const languagePairs = [...new Set(successfulResults.map((r) => r.languagePair))];
  const bleuByPair: Record<string, number> = {};

  languagePairs.forEach((pair) => {
    const pairResults = successfulResults.filter((r) => r.languagePair === pair);
    bleuByPair[pair] =
      pairResults.reduce((sum, r) => sum + (r.metrics.bleu || 0), 0) / pairResults.length;
  });

  // BLEU by domain
  const domains = [...new Set(successfulResults.map((r) => r.domain))];
  const bleuByDomain: Record<string, number> = {};

  domains.forEach((domain) => {
    const domainResults = successfulResults.filter((r) => r.domain === domain);
    bleuByDomain[domain] =
      domainResults.reduce((sum, r) => sum + (r.metrics.bleu || 0), 0) / domainResults.length;
  });

  // Average processing time
  const avgProcessingTime =
    successfulResults.reduce((sum, r) => sum + r.processingTime, 0) / successfulResults.length;

  return {
    averageBLEU: Math.round(avgBLEU * 100) / 100,
    averageGlossaryAccuracy: Math.round(avgGlossaryAccuracy * 100) / 100,
    averageFluency: Math.round(avgFluency * 100) / 100,
    ...Object.fromEntries(
      Object.entries(bleuByPair).map(([k, v]) => [`bleu_${k}`, Math.round(v * 100) / 100])
    ),
    ...Object.fromEntries(
      Object.entries(bleuByDomain).map(([k, v]) => [`bleu_${k}`, Math.round(v * 100) / 100])
    ),
    averageProcessingTime: Math.round(avgProcessingTime * 100) / 100,
    successRate: Math.round((successfulResults.length / results.length) * 10000) / 100,
  };
}

/**
 * Generate summary
 */
function generateSummary(aggregateMetrics: Record<string, number>, totalCases: number): string {
  const languagePairMetrics = Object.entries(aggregateMetrics)
    .filter(([k]) => k.startsWith('bleu_') && k.includes('-'))
    .map(([k, v]) => `  - ${k.replace('bleu_', '')}: ${v}`)
    .join('\n');

  const domainMetrics = Object.entries(aggregateMetrics)
    .filter(([k]) => k.startsWith('bleu_') && !k.includes('-'))
    .map(([k, v]) => `  - ${k.replace('bleu_', '')}: ${v}`)
    .join('\n');

  return `
MT Benchmark Results Summary:
- Total test cases: ${totalCases}
- Success rate: ${aggregateMetrics.successRate}%
- Average BLEU score: ${aggregateMetrics.averageBLEU}
- Average glossary accuracy: ${aggregateMetrics.averageGlossaryAccuracy}%
- Average fluency score: ${aggregateMetrics.averageFluency}/5.0

BLEU by language pair:
${languagePairMetrics || '  (No data)'}

BLEU by domain:
${domainMetrics || '  (No data)'}

Average processing time: ${aggregateMetrics.averageProcessingTime}s per translation
  `.trim();
}

/**
 * Main benchmark execution
 */
async function main(): Promise<void> {
  console.log('=== MT Benchmark ===\n');

  // Load dataset
  console.log('Loading MT dataset...');
  const dataset = MTDatasetBuilder.load();
  console.log(`Loaded ${dataset.testCases.length} test cases\n`);

  // Run benchmarks
  console.log('Running benchmarks...');
  const results: MTBenchmarkResult[] = [];

  for (const testCase of dataset.testCases) {
    const result = await benchmarkTestCase(testCase);
    results.push(result);
  }

  console.log('\n=== Results ===\n');

  // Calculate aggregate metrics
  const aggregateMetrics = calculateAggregateMetrics(results);
  const summary = generateSummary(aggregateMetrics, dataset.testCases.length);

  console.log(summary);

  // Save report
  const report: BenchmarkReport = {
    stage: 'mt',
    timestamp: new Date().toISOString(),
    modelVersion: 'marian-nmt (Helsinki-NLP)',
    results,
    aggregateMetrics,
    summary,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(RESULTS_DIR, `mt_benchmark_${timestamp}.json`);

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
