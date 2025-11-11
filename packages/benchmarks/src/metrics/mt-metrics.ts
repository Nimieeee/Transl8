/**
 * MT Metrics Calculation
 * Implements BLEU score and glossary term accuracy
 */

export interface BLEUResult {
  bleu: number;
  precisions: number[];
  brevityPenalty: number;
  lengthRatio: number;
}

export interface GlossaryAccuracyResult {
  accuracy: number;
  correctTerms: number;
  totalTerms: number;
  incorrectTerms: string[];
}

/**
 * Calculate BLEU score
 * BLEU = BP * exp(sum(log(p_n)))
 * where p_n is n-gram precision and BP is brevity penalty
 */
export function calculateBLEU(reference: string, hypothesis: string, maxN: number = 4): BLEUResult {
  const refTokens = tokenize(reference);
  const hypTokens = tokenize(hypothesis);

  // Calculate n-gram precisions
  const precisions: number[] = [];
  for (let n = 1; n <= maxN; n++) {
    const precision = calculateNGramPrecision(refTokens, hypTokens, n);
    precisions.push(precision);
  }

  // Calculate brevity penalty
  const refLength = refTokens.length;
  const hypLength = hypTokens.length;
  const lengthRatio = hypLength / refLength;
  const brevityPenalty = lengthRatio >= 1 ? 1 : Math.exp(1 - 1 / lengthRatio);

  // Calculate BLEU score
  const logPrecisionSum = precisions.reduce((sum, p) => sum + Math.log(p > 0 ? p : 1e-10), 0);
  const geometricMean = Math.exp(logPrecisionSum / maxN);
  const bleu = brevityPenalty * geometricMean;

  return {
    bleu: Math.round(bleu * 10000) / 100, // Convert to percentage
    precisions: precisions.map((p) => Math.round(p * 10000) / 10000),
    brevityPenalty: Math.round(brevityPenalty * 10000) / 10000,
    lengthRatio: Math.round(lengthRatio * 10000) / 10000,
  };
}

/**
 * Calculate n-gram precision
 */
function calculateNGramPrecision(reference: string[], hypothesis: string[], n: number): number {
  if (hypothesis.length < n) return 0;

  const refNGrams = getNGrams(reference, n);
  const hypNGrams = getNGrams(hypothesis, n);

  let matchCount = 0;
  const refNGramCounts = countNGrams(refNGrams);

  for (const ngram of hypNGrams) {
    const ngramKey = ngram.join(' ');
    if (refNGramCounts[ngramKey] && refNGramCounts[ngramKey] > 0) {
      matchCount++;
      refNGramCounts[ngramKey]--;
    }
  }

  return hypNGrams.length > 0 ? matchCount / hypNGrams.length : 0;
}

/**
 * Get n-grams from token array
 */
function getNGrams(tokens: string[], n: number): string[][] {
  const ngrams: string[][] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Count n-grams
 */
function countNGrams(ngrams: string[][]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ngram of ngrams) {
    const key = ngram.join(' ');
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Calculate glossary term accuracy
 */
export function calculateGlossaryAccuracy(
  translation: string,
  glossary: Record<string, string>
): GlossaryAccuracyResult {
  const translationLower = translation.toLowerCase();
  let correctTerms = 0;
  const incorrectTerms: string[] = [];

  for (const [sourceTerm, targetTerm] of Object.entries(glossary)) {
    const targetTermLower = targetTerm.toLowerCase();

    if (translationLower.includes(targetTermLower)) {
      correctTerms++;
    } else {
      incorrectTerms.push(sourceTerm);
    }
  }

  const totalTerms = Object.keys(glossary).length;
  const accuracy = totalTerms > 0 ? correctTerms / totalTerms : 0;

  return {
    accuracy: Math.round(accuracy * 10000) / 100, // Percentage
    correctTerms,
    totalTerms,
    incorrectTerms,
  };
}

/**
 * Calculate fluency score (simplified heuristic)
 * In production, this would use a trained model
 */
export function calculateFluencyScore(text: string): number {
  // Simple heuristics for fluency
  let score = 5.0; // Start with perfect score

  // Penalize very short or very long sentences
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const avgSentenceLength =
    sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;

  if (avgSentenceLength < 5 || avgSentenceLength > 30) {
    score -= 0.5;
  }

  // Penalize repeated words
  const words = tokenize(text);
  const uniqueWords = new Set(words);
  const repetitionRatio = words.length / uniqueWords.size;

  if (repetitionRatio > 1.5) {
    score -= 0.5;
  }

  // Penalize excessive punctuation
  const punctuationCount = (text.match(/[,;:]/g) || []).length;
  const punctuationRatio = punctuationCount / words.length;

  if (punctuationRatio > 0.1) {
    score -= 0.3;
  }

  return Math.max(1.0, Math.min(5.0, score));
}

/**
 * Tokenize text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
