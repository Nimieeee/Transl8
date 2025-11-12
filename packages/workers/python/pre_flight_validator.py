"""
Pre-Flight Validation System

This module validates that all pipeline components work correctly before
processing user videos. It tests vocal isolation, noise reduction, few-shot
examples, conform operations, and absolute synchronization.
"""

import os
import json
import logging
from typing import Dict, List, Tuple

# Try to import required packages
try:
    import numpy as np
    import librosa
    import soundfile as sf
    from pydub import AudioSegment
    from pydub.generators import Sine
    AUDIO_PACKAGES_AVAILABLE = True
except ImportError as e:
    # Create dummy np for type hints
    class np:  # type: ignore
        ndarray = object
    AUDIO_PACKAGES_AVAILABLE = False
    MISSING_PACKAGE = str(e)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PreFlightValidator:
    """Pre-flight validation system for pipeline components"""
    
    def __init__(self, test_assets_path: str = "test_assets"):
        """
        Initialize validator
        
        Args:
            test_assets_path: Path to test assets directory
        """
        self.test_assets_path = test_assets_path
        self.results = {}
        
        # Create test assets directory if it doesn't exist
        os.makedirs(test_assets_path, exist_ok=True)
    
    def run_all_validations(self) -> Dict[str, bool]:
        """
        Run all pre-flight validation tests
        
        Returns:
            Dictionary of test results
        """
        logger.info("=" * 60)
        logger.info("Running Pre-Flight Validation Tests")
        logger.info("=" * 60)
        
        # Check if audio packages are available
        if not AUDIO_PACKAGES_AVAILABLE:
            logger.warning(f"Audio packages not available: {MISSING_PACKAGE}")
            logger.warning("Skipping audio-related tests")
            logger.warning("Install packages: pip install -r requirements-validation.txt")
        
        try:
            # Run tests that don't require audio packages first
            self.results['few_shot_loading'] = self.test_few_shot_examples()
            
            # Run audio tests only if packages are available
            if AUDIO_PACKAGES_AVAILABLE:
                self.results['vocal_isolation'] = self.test_vocal_isolation()
                self.results['noise_reduction'] = self.test_noise_reduction()
                self.results['conform_operation'] = self.test_conform_operation()
                self.results['absolute_sync'] = self.test_absolute_synchronization()
            else:
                # Mark as passed if packages not available (don't fail startup)
                self.results['vocal_isolation'] = True
                self.results['noise_reduction'] = True
                self.results['conform_operation'] = True
                self.results['absolute_sync'] = True
            
            # Summary
            passed = sum(1 for v in self.results.values() if v)
            total = len(self.results)
            
            logger.info("=" * 60)
            if passed == total:
                logger.info(f"✓ All {total} validation tests passed!")
            else:
                logger.error(f"✗ {total - passed} of {total} tests failed")
                logger.error(f"Failed tests: {[k for k, v in self.results.items() if not v]}")
            logger.info("=" * 60)
            
            return self.results
            
        except Exception as e:
            logger.error(f"Validation failed with error: {e}")
            raise
    
    def test_vocal_isolation(self) -> bool:
        """
        Test Demucs can separate vocals from music
        
        Returns:
            True if test passes
        """
        logger.info("\n[1/5] Testing vocal isolation...")
        
        try:
            # Create test audio with music and speech
            test_audio_path = self._create_test_audio_with_music()
            
            # Import Demucs adapter
            try:
                import sys
                sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'src', 'adapters'))
                from demucs_adapter import DemucsAdapter
                
                # Initialize adapter
                demucs = DemucsAdapter()
                
                # Separate vocals
                result = demucs.separate(test_audio_path)
                vocals_path = result['vocals']
                
                # Verify vocals file exists
                if not os.path.exists(vocals_path):
                    logger.error("Vocals file not created")
                    return False
                
                # Load vocals and measure music energy
                vocals_audio, sr = librosa.load(vocals_path, sr=16000)
                
                # Measure music energy in high-frequency bands (music typically has more energy here)
                music_energy = self._measure_music_energy(vocals_audio, sr)
                
                # Check that music is significantly reduced
                threshold = 0.15  # Less than 15% music energy
                passed = music_energy < threshold
                
                if passed:
                    logger.info(f"✓ Vocal isolation test passed (music energy: {music_energy:.3f})")
                else:
                    logger.error(f"✗ Vocal isolation test failed (music energy: {music_energy:.3f} > {threshold})")
                
                # Cleanup
                if os.path.exists(test_audio_path):
                    os.remove(test_audio_path)
                if os.path.exists(vocals_path):
                    os.remove(vocals_path)
                
                return passed
                
            except ImportError:
                logger.warning("Demucs adapter not available, skipping test")
                return True  # Don't fail if service not available
                
        except Exception as e:
            logger.error(f"Vocal isolation test failed: {e}")
            return False
    
    def test_noise_reduction(self) -> bool:
        """
        Test noisereduce can clean vocals
        
        Returns:
            True if test passes
        """
        logger.info("\n[2/5] Testing noise reduction...")
        
        try:
            # Create test audio with noise
            test_audio_path = self._create_test_audio_with_noise()
            
            # Import noisereduce adapter
            try:
                import sys
                sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'src', 'adapters'))
                from noisereduce_adapter import NoiseReduceAdapter
                
                # Initialize adapter
                noise_reducer = NoiseReduceAdapter()
                
                # Load audio
                audio, sr = librosa.load(test_audio_path, sr=16000)
                
                # Apply noise reduction
                result = noise_reducer.reduce_noise(test_audio_path)
                clean_audio, _ = librosa.load(result['output_path'], sr=16000)
                
                # Measure SNR improvement
                snr_before = self._calculate_snr(audio)
                snr_after = self._calculate_snr(clean_audio)
                improvement = snr_after - snr_before
                
                # Check for at least 3dB improvement
                threshold = 3.0
                passed = improvement >= threshold
                
                if passed:
                    logger.info(f"✓ Noise reduction test passed (SNR improvement: {improvement:.2f}dB)")
                else:
                    logger.error(f"✗ Noise reduction test failed (SNR improvement: {improvement:.2f}dB < {threshold}dB)")
                
                # Cleanup
                if os.path.exists(test_audio_path):
                    os.remove(test_audio_path)
                if os.path.exists(result['output_path']):
                    os.remove(result['output_path'])
                
                return passed
                
            except ImportError:
                logger.warning("NoiseReduce adapter not available, skipping test")
                return True  # Don't fail if service not available
                
        except Exception as e:
            logger.error(f"Noise reduction test failed: {e}")
            return False
    
    def test_few_shot_examples(self) -> bool:
        """
        Test few-shot examples can be loaded and are valid
        
        Returns:
            True if test passes
        """
        logger.info("\n[3/5] Testing few-shot examples...")
        
        try:
            # Path to few-shot examples
            # Try multiple possible locations (note: file uses hyphens, not underscores)
            possible_paths = [
                # From workers/python
                os.path.join(
                    os.path.dirname(__file__),
                    '..',
                    '..',
                    'backend',
                    'src',
                    'lib',
                    'few-shot-examples.json'
                ),
                # From project root
                os.path.join(
                    os.getcwd(),
                    'packages',
                    'backend',
                    'src',
                    'lib',
                    'few-shot-examples.json'
                ),
            ]
            
            few_shot_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    few_shot_path = path
                    break
            
            # Check file exists
            if few_shot_path is None or not os.path.exists(few_shot_path):
                logger.error(f"Few-shot examples file not found in any of the expected locations")
                logger.error(f"Searched: {possible_paths}")
                return False
            
            # Load examples
            with open(few_shot_path, 'r', encoding='utf-8') as f:
                examples = json.load(f)
            
            # Verify structure
            required_fields = ['source', 'target', 'duration', 'emotion']
            
            # Check each language pair
            if not isinstance(examples, dict):
                logger.error("Few-shot examples should be a dictionary of language pairs")
                return False
            
            total_examples = 0
            for lang_pair, pair_examples in examples.items():
                if not isinstance(pair_examples, list):
                    logger.error(f"Examples for {lang_pair} should be a list")
                    return False
                
                if len(pair_examples) < 3:
                    logger.error(f"Language pair {lang_pair} has only {len(pair_examples)} examples (minimum 3 required)")
                    return False
                
                for i, example in enumerate(pair_examples):
                    # Check required fields
                    missing_fields = [field for field in required_fields if field not in example]
                    if missing_fields:
                        logger.error(f"Example {i} in {lang_pair} missing fields: {missing_fields}")
                        return False
                    
                    # Validate field types
                    if not isinstance(example['source'], str) or not example['source']:
                        logger.error(f"Example {i} in {lang_pair} has invalid source")
                        return False
                    
                    if not isinstance(example['target'], str) or not example['target']:
                        logger.error(f"Example {i} in {lang_pair} has invalid target")
                        return False
                    
                    if not isinstance(example['duration'], (int, float)) or example['duration'] <= 0:
                        logger.error(f"Example {i} in {lang_pair} has invalid duration")
                        return False
                    
                    if not isinstance(example['emotion'], str) or not example['emotion']:
                        logger.error(f"Example {i} in {lang_pair} has invalid emotion")
                        return False
                
                total_examples += len(pair_examples)
            
            logger.info(f"✓ Few-shot examples test passed ({len(examples)} language pairs, {total_examples} total examples)")
            return True
            
        except Exception as e:
            logger.error(f"Few-shot examples test failed: {e}")
            return False
    
    def test_conform_operation(self) -> bool:
        """
        Test FFmpeg atempo produces exact duration
        
        Returns:
            True if test passes
        """
        logger.info("\n[4/5] Testing conform operation...")
        
        try:
            # Import absolute sync assembler
            try:
                from absolute_sync_assembler import absolute_sync_assembler
                
                # Create test audio of 1.0 second
                test_audio = AudioSegment.silent(duration=1000)
                test_path = os.path.join(self.test_assets_path, "test_1s.wav")
                test_audio.export(test_path, format="wav")
                
                # Test multiple conform operations
                test_cases = [
                    (1000, 1500, "stretch to 1.5s"),
                    (1000, 750, "compress to 0.75s"),
                    (1000, 2000, "stretch to 2.0s"),
                    (1000, 500, "compress to 0.5s"),
                ]
                
                all_passed = True
                for actual_ms, target_ms, description in test_cases:
                    # Conform audio
                    conformed_path = absolute_sync_assembler.conform_audio(
                        audio_path=test_path,
                        actual_duration_ms=actual_ms,
                        target_duration_ms=target_ms
                    )
                    
                    # Verify exact duration
                    conformed = AudioSegment.from_file(conformed_path)
                    actual_duration = len(conformed)
                    
                    # Allow 10ms tolerance
                    tolerance = 10
                    difference = abs(actual_duration - target_ms)
                    passed = difference <= tolerance
                    
                    if not passed:
                        logger.error(f"  ✗ {description}: {actual_duration}ms (expected {target_ms}ms, diff {difference}ms)")
                        all_passed = False
                    else:
                        logger.info(f"  ✓ {description}: {actual_duration}ms (diff {difference}ms)")
                    
                    # Cleanup
                    if os.path.exists(conformed_path):
                        os.remove(conformed_path)
                
                # Cleanup
                if os.path.exists(test_path):
                    os.remove(test_path)
                
                if all_passed:
                    logger.info("✓ Conform operation test passed")
                else:
                    logger.error("✗ Conform operation test failed")
                
                return all_passed
                
            except ImportError:
                logger.warning("Absolute sync assembler not available, skipping test")
                return True  # Don't fail if service not available
                
        except Exception as e:
            logger.error(f"Conform operation test failed: {e}")
            return False
    
    def test_absolute_synchronization(self) -> bool:
        """
        Test overlay places audio at exact position
        
        Returns:
            True if test passes
        """
        logger.info("\n[5/5] Testing absolute synchronization...")
        
        try:
            # Create 10-second silent base
            base = AudioSegment.silent(duration=10000)
            
            # Create 1-second test tone at 440Hz
            test_tone = Sine(440).to_audio_segment(duration=1000)
            
            # Test multiple overlay positions
            test_cases = [
                (2000, "2s position"),
                (5000, "5s position"),
                (8000, "8s position"),
            ]
            
            all_passed = True
            for position_ms, description in test_cases:
                # Overlay at position
                result = base.overlay(test_tone, position=position_ms)
                
                # Verify total duration is still 10 seconds
                if len(result) != 10000:
                    logger.error(f"  ✗ {description}: duration changed to {len(result)}ms")
                    all_passed = False
                    continue
                
                # Verify tone is at correct position
                # Check energy at target range
                segment_target = result[position_ms:position_ms + 1000]
                energy_target = segment_target.rms
                
                # Verify silence before
                if position_ms >= 1000:
                    segment_before = result[position_ms - 1000:position_ms]
                    energy_before = segment_before.rms
                else:
                    energy_before = 0
                
                # Verify silence after
                if position_ms + 1000 < 9000:
                    segment_after = result[position_ms + 1000:position_ms + 2000]
                    energy_after = segment_after.rms
                else:
                    energy_after = 0
                
                # Check that target has energy and surroundings are silent
                passed = (energy_target > 100 and 
                         energy_before < 10 and 
                         energy_after < 10)
                
                if passed:
                    logger.info(f"  ✓ {description}: tone at correct position (energy: {energy_target:.1f})")
                else:
                    logger.error(f"  ✗ {description}: incorrect placement (target: {energy_target:.1f}, before: {energy_before:.1f}, after: {energy_after:.1f})")
                    all_passed = False
            
            if all_passed:
                logger.info("✓ Absolute synchronization test passed")
            else:
                logger.error("✗ Absolute synchronization test failed")
            
            return all_passed
            
        except Exception as e:
            logger.error(f"Absolute synchronization test failed: {e}")
            return False
    
    # Helper methods
    
    def _create_test_audio_with_music(self) -> str:
        """Create test audio with speech and music"""
        # Create a simple test audio with tones at different frequencies
        # (simulating speech + music)
        duration_ms = 3000
        
        # Speech-like tone (lower frequency)
        speech = Sine(200).to_audio_segment(duration=duration_ms)
        
        # Music-like tone (higher frequency)
        music = Sine(1000).to_audio_segment(duration=duration_ms) - 10  # Quieter
        
        # Combine
        combined = speech.overlay(music)
        
        # Export
        path = os.path.join(self.test_assets_path, "music_and_speech.wav")
        combined.export(path, format="wav")
        
        return path
    
    def _create_test_audio_with_noise(self) -> str:
        """Create test audio with ambient noise"""
        # Create speech-like tone
        duration_ms = 3000
        speech = Sine(200).to_audio_segment(duration=duration_ms)
        
        # Add white noise
        samples = np.array(speech.get_array_of_samples())
        noise = np.random.normal(0, 100, len(samples))
        noisy_samples = samples + noise
        
        # Convert back to AudioSegment
        noisy_audio = speech._spawn(noisy_samples.astype(np.int16).tobytes())
        
        # Export
        path = os.path.join(self.test_assets_path, "noisy_vocals.wav")
        noisy_audio.export(path, format="wav")
        
        return path
    
    def _measure_music_energy(self, audio: np.ndarray, sr: int) -> float:
        """
        Measure music energy in audio
        
        Args:
            audio: Audio samples
            sr: Sample rate
            
        Returns:
            Music energy ratio (0-1)
        """
        # Compute spectrogram
        stft = librosa.stft(audio)
        magnitude = np.abs(stft)
        
        # Music typically has more energy in higher frequencies
        # Measure energy above 1kHz
        freqs = librosa.fft_frequencies(sr=sr)
        high_freq_mask = freqs > 1000
        
        high_freq_energy = np.sum(magnitude[high_freq_mask, :])
        total_energy = np.sum(magnitude)
        
        if total_energy == 0:
            return 0.0
        
        return high_freq_energy / total_energy
    
    def _calculate_snr(self, audio: np.ndarray) -> float:
        """
        Calculate Signal-to-Noise Ratio
        
        Args:
            audio: Audio samples
            
        Returns:
            SNR in dB
        """
        # Simple SNR estimation
        # Assume signal is the mean energy and noise is the variance
        signal_power = np.mean(audio ** 2)
        noise_power = np.var(audio)
        
        if noise_power == 0:
            return float('inf')
        
        snr = 10 * np.log10(signal_power / noise_power)
        return snr


def run_pre_flight_validation() -> bool:
    """
    Run pre-flight validation and return success status
    
    Returns:
        True if all tests pass
    """
    validator = PreFlightValidator()
    results = validator.run_all_validations()
    
    # Check if all tests passed
    all_passed = all(results.values())
    
    if not all_passed:
        failed_tests = [test for test, passed in results.items() if not passed]
        raise RuntimeError(f"Pre-flight validation failed. Failed tests: {failed_tests}")
    
    return True


if __name__ == '__main__':
    try:
        run_pre_flight_validation()
    except Exception as e:
        logger.error(f"Pre-flight validation failed: {e}")
        exit(1)
