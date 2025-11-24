import { Mistral } from '@mistralai/mistralai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ValidationResult {
  text: string;
  audioPath: string;
  duration: number;
  attempts: number;
  isValid: boolean;
}

export class DurationValidator {
  private tolerance: number;
  private maxRetries: number;
  private ttsVoice: string;
  private mistralModel: string;

  constructor(
    tolerance: number = 0.05, // 5% tolerance (default)
    maxRetries: number = 15,  // default 15 retries
    ttsVoice: string = 'alloy',
    mistralModel: string = 'mistral-small-latest'
  ) {
    this.tolerance = tolerance;
    this.maxRetries = maxRetries;
    this.ttsVoice = ttsVoice;
    this.mistralModel = mistralModel;
  }

  private estimateSyllableCount(duration: number): number {
    const syllablesPerSecond = 3.5; // Average for natural speech
    return Math.round(duration * syllablesPerSecond);
  }

  private async adaptTextWithLLM(
    text: string,
    targetDuration: number,
    targetLanguage: string,
    feedback?: string,
    attempt: number = 1
  ): Promise<string> {
    const targetSyllables = this.estimateSyllableCount(targetDuration);

    const systemPrompt = `You are an expert translator and dubbing adapter. Your task is to translate content while matching specific duration constraints for lip-sync dubbing. Always provide ONLY the translation, no explanations.`;

    let userPrompt = `Translate the following text to ${targetLanguage} for dubbing.

CRITICAL CONSTRAINTS:
- Target duration: ${targetDuration.toFixed(2)} seconds
- Target syllable count: approximately ${targetSyllables} syllables
- The audio must match the original timing for lip-sync
- Use natural, conversational ${targetLanguage}

Original text: "${text}"
`;

    if (feedback) {
      userPrompt += `\n\nFEEDBACK FROM PREVIOUS ATTEMPT #${attempt - 1}:\n${feedback}\n`;
      userPrompt += `\nPlease adjust your translation accordingly.`;
    }

    userPrompt += `\n\nProvide ONLY the ${targetLanguage} translation, no explanations.`;

    console.log(`Attempt ${attempt}: Requesting Mistral AI adaptation...`);

    const response = await mistral.chat.complete({
      model: this.mistralModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const messageContent = response.choices?.[0]?.message?.content;
    if (!messageContent) {
      throw new Error('No content returned from Mistral AI');
    }

    // Handle both string and array responses
    const adaptedText = typeof messageContent === 'string' 
      ? messageContent.trim() 
      : JSON.stringify(messageContent);
    
    console.log(`Mistral AI returned: ${adaptedText.substring(0, 100)}...`);
    return adaptedText;
  }

  private async generateAudioOpenAI(text: string, outputPath: string): Promise<string> {
    console.log(`Generating audio with OpenAI TTS (voice: ${this.ttsVoice})...`);

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: this.ttsVoice as any,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`Audio generated: ${outputPath}`);
    return outputPath;
  }

  private async measureDuration(audioPath: string): Promise<number> {
    try {
      // Use ffprobe to get duration
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      );
      const duration = parseFloat(stdout.trim());
      console.log(`Measured duration: ${duration.toFixed(2)}s`);
      return duration;
    } catch (error) {
      console.error('Duration measurement error:', error);
      throw error;
    }
  }

  private isWithinTolerance(actual: number, target: number): { isValid: boolean; difference: number } {
    const difference = actual - target;
    const toleranceSeconds = target * this.tolerance;
    
    // Translation must be equal to or SHORTER than target, never longer
    // Allow up to tolerance% shorter, but 0% longer
    const isValid = difference <= 0 && Math.abs(difference) <= toleranceSeconds;

    console.log(
      `Validation: ${actual.toFixed(2)}s vs ${target.toFixed(2)}s ` +
      `(must be ≤ target, tolerance: -${toleranceSeconds.toFixed(2)}s) - ${isValid ? 'PASS' : 'FAIL'}`
    );

    return { isValid, difference };
  }

  private generateFeedback(difference: number): string {
    const absDiff = Math.abs(difference);

    if (difference > 0) {
      // Too long - CRITICAL, must fix
      return (
        `CRITICAL: Your translation was ${absDiff.toFixed(2)} seconds TOO LONG. ` +
        `The translation MUST NOT exceed the original duration. ` +
        `Please condense the text by:\n` +
        `- Using shorter synonyms\n` +
        `- Removing ALL filler words\n` +
        `- Making sentences very concise\n` +
        `- Eliminating redundancy\n` +
        `- Speaking faster/more efficiently`
      );
    } else {
      // Too short - acceptable if within tolerance, but try to get closer
      return (
        `Your translation was ${absDiff.toFixed(2)} seconds shorter than target. ` +
        `Try to get closer to the target duration by:\n` +
        `- Adding natural pauses\n` +
        `- Using slightly more descriptive phrases\n` +
        `- Speaking at a natural pace\n` +
        `Note: Being shorter is acceptable, but closer is better for lip-sync.`
      );
    }
  }

  async adaptAndValidate(
    text: string,
    targetDuration: number,
    targetLanguage: string,
    outputDir: string = '/tmp'
  ): Promise<ValidationResult> {
    let bestText = text;
    let bestAudioPath = '';
    let bestDuration = 0;
    let bestDifference = Infinity;
    let feedback: string | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`ATTEMPT ${attempt}/${this.maxRetries}`);
      console.log(`${'='.repeat(60)}`);

      // Step 1: Adapt text with Mistral AI
      const adaptedText = await this.adaptTextWithLLM(
        text,
        targetDuration,
        targetLanguage,
        feedback,
        attempt
      );

      // Step 2: Generate audio with OpenAI TTS
      const audioPath = path.join(outputDir, `attempt_${attempt}_${Date.now()}.mp3`);
      await this.generateAudioOpenAI(adaptedText, audioPath);

      // Step 3: Validate duration
      const actualDuration = await this.measureDuration(audioPath);
      const { isValid, difference } = this.isWithinTolerance(actualDuration, targetDuration);

      // Track best attempt
      if (Math.abs(difference) < Math.abs(bestDifference)) {
        bestText = adaptedText;
        bestAudioPath = audioPath;
        bestDuration = actualDuration;
        bestDifference = difference;
      }

      // Step 4: Check if valid or retry
      if (isValid) {
        console.log(`✅ SUCCESS on attempt ${attempt}!`);
        return {
          text: adaptedText,
          audioPath,
          duration: actualDuration,
          attempts: attempt,
          isValid: true
        };
      }

      // Generate feedback for next attempt
      if (attempt < this.maxRetries) {
        feedback = this.generateFeedback(difference);
        console.warn(`❌ Failed validation. Retrying with feedback...`);
        
        // Clean up failed attempt audio
        if (audioPath !== bestAudioPath && fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      } else {
        console.warn(
          `❌ Max retries reached. Returning best attempt (diff: ${bestDifference.toFixed(2)}s)`
        );
      }
    }

    return {
      text: bestText,
      audioPath: bestAudioPath,
      duration: bestDuration,
      attempts: this.maxRetries,
      isValid: false
    };
  }
}
