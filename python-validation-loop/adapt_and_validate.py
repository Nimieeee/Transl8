"""
Audio Duration Validation & Retry Loop for AI Dubbing
Uses: Mistral AI LLM + OpenAI TTS
"""

import os
import time
import librosa
from mistralai import Mistral
from openai import OpenAI
from pathlib import Path
from typing import Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Mistral AI
mistral_client = Mistral(api_key=os.getenv('MISTRAL_API_KEY'))

# Configure OpenAI
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

class DubbingValidator:
    def __init__(
        self, 
        tolerance: float = 0.15, 
        max_retries: int = 3,
        tts_voice: str = 'alloy',
        mistral_model: str = 'mistral-small-latest'
    ):
        """
        Initialize the dubbing validator.
        
        Args:
            tolerance: Acceptable duration variance (default 15% = 0.15)
            max_retries: Maximum retry attempts (default 3)
            tts_voice: OpenAI TTS voice (alloy, echo, fable, onyx, nova, shimmer)
            mistral_model: Mistral model to use (mistral-small-latest, mistral-medium-latest)
        """
        self.tolerance = tolerance
        self.max_retries = max_retries
        self.tts_voice = tts_voice
        self.mistral_model = mistral_model
        
    def estimate_syllable_count(self, duration: float) -> int:
        """
        Estimate target syllable count based on duration.
        Assumes 3-4 syllables per second (average for Spanish).
        
        Args:
            duration: Target duration in seconds
            
        Returns:
            Estimated syllable count
        """
        syllables_per_second = 3.5  # Average for natural speech
        return int(duration * syllables_per_second)
    
    def adapt_text_with_llm(
        self, 
        text: str, 
        target_duration: float,
        target_language: str = 'Spanish',
        feedback: Optional[str] = None,
        attempt: int = 1
    ) -> str:
        """
        Use Mistral AI to adapt text to target duration.
        
        Args:
            text: Original text to translate
            target_duration: Target duration in seconds
            target_language: Target language for translation
            feedback: Feedback from previous attempt
            attempt: Current attempt number
            
        Returns:
            Adapted translated text
        """
        target_syllables = self.estimate_syllable_count(target_duration)
        
        # Build system prompt
        system_prompt = """You are an expert translator and dubbing adapter. Your task is to translate content while matching specific duration constraints for lip-sync dubbing. Always provide ONLY the translation, no explanations."""
        
        # Build user prompt
        user_prompt = f"""Translate the following text to {target_language} for dubbing.

CRITICAL CONSTRAINTS:
- Target duration: {target_duration:.2f} seconds
- Target syllable count: approximately {target_syllables} syllables
- The audio must match the original timing for lip-sync
- Use natural, conversational {target_language}

Original text: "{text}"
"""
        
        if feedback:
            user_prompt += f"\n\nFEEDBACK FROM PREVIOUS ATTEMPT #{attempt-1}:\n{feedback}\n"
            user_prompt += "\nPlease adjust your translation accordingly."
        
        user_prompt += f"\n\nProvide ONLY the {target_language} translation, no explanations."
        
        logger.info(f"Attempt {attempt}: Requesting Mistral AI adaptation...")
        
        try:
            response = mistral_client.chat.complete(
                model=self.mistral_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            adapted_text = response.choices[0].message.content.strip()
            logger.info(f"Mistral AI returned: {adapted_text}")
            return adapted_text
        except Exception as e:
            logger.error(f"Mistral AI error: {e}")
            raise
    
    def generate_audio_openai(
        self, 
        text: str, 
        output_path: str
    ) -> str:
        """
        Generate audio using OpenAI TTS.
        
        Args:
            text: Text to synthesize
            output_path: Path to save audio file
            
        Returns:
            Path to generated audio file
        """
        logger.info(f"Generating audio with OpenAI TTS (voice: {self.tts_voice})...")
        
        try:
            # Generate audio with OpenAI TTS
            response = openai_client.audio.speech.create(
                model="tts-1",  # or "tts-1-hd" for higher quality
                voice=self.tts_voice,
                input=text,
                response_format="mp3"
            )
            
            # Save to file
            response.stream_to_file(output_path)
            
            logger.info(f"Audio generated: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"OpenAI TTS error: {e}")
            raise
    
    def measure_duration(self, audio_path: str) -> float:
        """
        Measure audio duration using librosa.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Duration in seconds
        """
        try:
            duration = librosa.get_duration(path=audio_path)
            logger.info(f"Measured duration: {duration:.2f}s")
            return duration
        except Exception as e:
            logger.error(f"Duration measurement error: {e}")
            raise
    
    def is_within_tolerance(
        self, 
        actual: float, 
        target: float
    ) -> Tuple[bool, float]:
        """
        Check if duration is within tolerance.
        
        Args:
            actual: Actual duration
            target: Target duration
            
        Returns:
            Tuple of (is_valid, difference_in_seconds)
        """
        difference = actual - target
        tolerance_seconds = target * self.tolerance
        is_valid = abs(difference) <= tolerance_seconds
        
        logger.info(
            f"Validation: {actual:.2f}s vs {target:.2f}s "
            f"(tolerance: ±{tolerance_seconds:.2f}s) - "
            f"{'PASS' if is_valid else 'FAIL'}"
        )
        
        return is_valid, difference
    
    def generate_feedback(self, difference: float) -> str:
        """
        Generate feedback for LLM based on duration difference.
        
        Args:
            difference: Duration difference (actual - target)
            
        Returns:
            Feedback string
        """
        abs_diff = abs(difference)
        
        if difference > 0:
            # Too long
            return (
                f"Your translation was {abs_diff:.2f} seconds TOO LONG. "
                f"Please condense the text by:\n"
                f"- Using shorter synonyms\n"
                f"- Removing filler words\n"
                f"- Making sentences more concise\n"
                f"- Avoiding redundancy"
            )
        else:
            # Too short
            return (
                f"Your translation was {abs_diff:.2f} seconds TOO SHORT. "
                f"Please extend the text by:\n"
                f"- Adding natural filler words (bueno, pues, entonces)\n"
                f"- Using more descriptive phrases\n"
                f"- Adding brief pauses or interjections\n"
                f"- Being slightly more verbose"
            )
    
    def adapt_and_validate_line(
        self,
        text: str,
        target_duration: float,
        target_language: str = 'Spanish',
        output_dir: str = "./output"
    ) -> Tuple[str, float, int]:
        """
        Main function: Adapt text and validate audio duration with retry loop.
        
        Args:
            text: Original text to translate
            target_duration: Target duration in seconds
            target_language: Target language for translation
            output_dir: Directory to save generated audio
            
        Returns:
            Tuple of (audio_path, final_duration, attempts_used)
        """
        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        best_audio_path = None
        best_duration = None
        best_difference = float('inf')
        
        feedback = None
        
        for attempt in range(1, self.max_retries + 1):
            logger.info(f"\n{'='*60}")
            logger.info(f"ATTEMPT {attempt}/{self.max_retries}")
            logger.info(f"{'='*60}")
            
            # Step 1: Adapt text with Mistral AI
            adapted_text = self.adapt_text_with_llm(
                text=text,
                target_duration=target_duration,
                target_language=target_language,
                feedback=feedback,
                attempt=attempt
            )
            
            # Step 2: Generate audio with OpenAI TTS
            audio_path = os.path.join(
                output_dir, 
                f"attempt_{attempt}_{int(time.time())}.mp3"
            )
            
            self.generate_audio_openai(
                text=adapted_text,
                output_path=audio_path
            )
            
            # Step 3: Validate duration
            actual_duration = self.measure_duration(audio_path)
            is_valid, difference = self.is_within_tolerance(
                actual_duration, 
                target_duration
            )
            
            # Track best attempt
            if abs(difference) < abs(best_difference):
                best_audio_path = audio_path
                best_duration = actual_duration
                best_difference = difference
            
            # Step 4: Check if valid or retry
            if is_valid:
                logger.info(f"✅ SUCCESS on attempt {attempt}!")
                return audio_path, actual_duration, attempt
            
            # Generate feedback for next attempt
            if attempt < self.max_retries:
                feedback = self.generate_feedback(difference)
                logger.warning(f"❌ Failed validation. Retrying with feedback...")
            else:
                logger.warning(
                    f"❌ Max retries reached. Returning best attempt "
                    f"(diff: {best_difference:.2f}s)"
                )
        
        return best_audio_path, best_duration, self.max_retries


# Example usage
if __name__ == "__main__":
    # Initialize validator with OpenAI TTS voice
    validator = DubbingValidator(
        tolerance=0.15, 
        max_retries=3,
        tts_voice='alloy',  # Options: alloy, echo, fable, onyx, nova, shimmer
        mistral_model='mistral-small-latest'
    )
    
    # Example line
    original_text = "Hello, how are you doing today?"
    target_duration = 2.5  # seconds
    
    # Run validation loop
    audio_path, duration, attempts = validator.adapt_and_validate_line(
        text=original_text,
        target_duration=target_duration,
        target_language='Spanish',
        output_dir="./dubbed_output"
    )
    
    print(f"\n{'='*60}")
    print(f"FINAL RESULT:")
    print(f"Audio Path: {audio_path}")
    print(f"Duration: {duration:.2f}s (target: {target_duration:.2f}s)")
    print(f"Attempts: {attempts}")
    print(f"{'='*60}")
