"""
Audio Duration Validation & Retry Loop for AI Dubbing
Uses: Gemini LLM + Fish Audio TTS + MPS (Apple Silicon)
"""

import os
import time
import librosa
import google.generativeai as genai
from pathlib import Path
from typing import Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

class DubbingValidator:
    def __init__(self, tolerance: float = 0.15, max_retries: int = 3):
        """
        Initialize the dubbing validator.
        
        Args:
            tolerance: Acceptable duration variance (default 15% = 0.15)
            max_retries: Maximum retry attempts (default 3)
        """
        self.tolerance = tolerance
        self.max_retries = max_retries
        self.model = genai.GenerativeModel('gemini-pro')
        
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
        feedback: Optional[str] = None,
        attempt: int = 1
    ) -> str:
        """
        Use Gemini to adapt text to target duration.
        
        Args:
            text: Original text to translate
            target_duration: Target duration in seconds
            feedback: Feedback from previous attempt
            attempt: Current attempt number
            
        Returns:
            Adapted Spanish text
        """
        target_syllables = self.estimate_syllable_count(target_duration)
        
        # Build prompt
        base_prompt = f"""Translate the following text to Spanish for dubbing.

CRITICAL CONSTRAINTS:
- Target duration: {target_duration:.2f} seconds
- Target syllable count: approximately {target_syllables} syllables
- The audio must match the original timing for lip-sync
- Use natural, conversational Spanish

Original text: "{text}"
"""
        
        if feedback:
            base_prompt += f"\n\nFEEDBACK FROM PREVIOUS ATTEMPT #{attempt-1}:\n{feedback}\n"
            base_prompt += "\nPlease adjust your translation accordingly."
        
        base_prompt += "\n\nProvide ONLY the Spanish translation, no explanations."
        
        logger.info(f"Attempt {attempt}: Requesting LLM adaptation...")
        
        try:
            response = self.model.generate_content(base_prompt)
            adapted_text = response.text.strip()
            logger.info(f"LLM returned: {adapted_text}")
            return adapted_text
        except Exception as e:
            logger.error(f"LLM error: {e}")
            raise
    
    def generate_audio_fish(
        self, 
        text: str, 
        output_path: str,
        reference_audio: Optional[str] = None
    ) -> str:
        """
        Generate audio using Fish Audio with MPS acceleration.
        
        Args:
            text: Text to synthesize
            output_path: Path to save audio file
            reference_audio: Optional reference audio for voice cloning
            
        Returns:
            Path to generated audio file
        """
        logger.info("Generating audio with Fish Audio (MPS)...")
        
        try:
            # Import Fish Audio (assuming it's installed)
            from fish_audio_sdk import FishAudioTTS
            
            # Initialize with MPS device
            tts = FishAudioTTS(
                model_name='S1-Mini',
                device='mps',  # Apple Silicon GPU
                compile=False  # Disable torch.compile for M1 compatibility
            )
            
            # Generate audio
            audio = tts.synthesize(
                text=text,
                reference_audio=reference_audio,
                output_path=output_path
            )
            
            logger.info(f"Audio generated: {output_path}")
            return output_path
            
        except ImportError:
            logger.error("Fish Audio SDK not found. Install with: pip install fish-audio-sdk")
            raise
        except Exception as e:
            logger.error(f"TTS generation error: {e}")
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
        original_audio_path: str,
        output_dir: str = "./output"
    ) -> Tuple[str, float, int]:
        """
        Main function: Adapt text and validate audio duration with retry loop.
        
        Args:
            text: Original text to translate
            target_duration: Target duration in seconds
            original_audio_path: Path to original audio (for reference)
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
            
            # Step 1: Adapt text with LLM
            adapted_text = self.adapt_text_with_llm(
                text=text,
                target_duration=target_duration,
                feedback=feedback,
                attempt=attempt
            )
            
            # Step 2: Generate audio
            audio_path = os.path.join(
                output_dir, 
                f"attempt_{attempt}_{int(time.time())}.wav"
            )
            
            self.generate_audio_fish(
                text=adapted_text,
                output_path=audio_path,
                reference_audio=original_audio_path
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
    # Initialize validator
    validator = DubbingValidator(tolerance=0.15, max_retries=3)
    
    # Example line
    original_text = "Hello, how are you doing today?"
    target_duration = 2.5  # seconds
    original_audio = "./reference_audio.wav"
    
    # Run validation loop
    audio_path, duration, attempts = validator.adapt_and_validate_line(
        text=original_text,
        target_duration=target_duration,
        original_audio_path=original_audio,
        output_dir="./dubbed_output"
    )
    
    print(f"\n{'='*60}")
    print(f"FINAL RESULT:")
    print(f"Audio Path: {audio_path}")
    print(f"Duration: {duration:.2f}s (target: {target_duration:.2f}s)")
    print(f"Attempts: {attempts}")
    print(f"{'='*60}")
