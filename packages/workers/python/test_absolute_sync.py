"""
Test script for Absolute Synchronization Assembly

This script tests the core functionality of the absolute sync assembler.
"""

import os
import json
import logging
from pydub import AudioSegment
from absolute_sync_assembler import absolute_sync_assembler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_silent_base_track():
    """Test silent base track creation"""
    logger.info("Testing silent base track creation...")
    
    # Create 10-second silent track
    duration_ms = 10000
    base_track = absolute_sync_assembler.create_silent_base_track(duration_ms)
    
    # Verify duration
    actual_duration = len(base_track)
    assert actual_duration == duration_ms, f"Expected {duration_ms}ms, got {actual_duration}ms"
    
    # Validate
    is_valid = absolute_sync_assembler.validate_base_track_duration(base_track, duration_ms)
    assert is_valid, "Base track validation failed"
    
    logger.info(f"✓ Silent base track test passed: {actual_duration}ms")


def test_conform_operation():
    """Test FFmpeg conform operation"""
    logger.info("Testing conform operation...")
    
    # Create test audio (1 second)
    test_audio = AudioSegment.silent(duration=1000)
    test_path = "test_1s.wav"
    test_audio.export(test_path, format="wav")
    
    try:
        # Conform to 1.5 seconds
        target_duration_ms = 1500
        conformed_path = absolute_sync_assembler.conform_audio(
            audio_path=test_path,
            actual_duration_ms=1000,
            target_duration_ms=target_duration_ms
        )
        
        # Verify conformed duration
        is_valid = absolute_sync_assembler.validate_conformed_duration(
            conformed_path,
            target_duration_ms
        )
        assert is_valid, "Conformed audio validation failed"
        
        # Load and check
        conformed_audio = AudioSegment.from_file(conformed_path)
        actual_duration = len(conformed_audio)
        difference = abs(actual_duration - target_duration_ms)
        
        logger.info(f"✓ Conform operation test passed: {actual_duration}ms (difference: {difference}ms)")
        
        # Cleanup
        os.remove(conformed_path)
    finally:
        # Cleanup
        if os.path.exists(test_path):
            os.remove(test_path)


def test_chained_atempo():
    """Test chained atempo for extreme ratios"""
    logger.info("Testing chained atempo...")
    
    # Test extreme tempo factor
    tempo_factor = 3.5
    filter_complex = absolute_sync_assembler._build_chained_atempo(tempo_factor)
    
    # Should contain multiple atempo filters
    assert "atempo" in filter_complex, "Filter complex should contain atempo"
    assert "," in filter_complex, "Should have chained filters for extreme ratio"
    
    logger.info(f"✓ Chained atempo test passed: {filter_complex}")


def test_overlay_assembly():
    """Test overlay assembly"""
    logger.info("Testing overlay assembly...")
    
    # Create 10-second silent base
    base_track = AudioSegment.silent(duration=10000)
    
    # Create test segment (1 second at 440Hz)
    from pydub.generators import Sine
    test_tone = Sine(440).to_audio_segment(duration=1000)
    test_path = "test_tone.wav"
    test_tone.export(test_path, format="wav")
    
    try:
        # Create test segments
        segments = [
            {
                'id': 0,
                'start_ms': 2000,
                'end_ms': 3000,
                'generated_audio_path': test_path,
                'status': 'success'
            },
            {
                'id': 1,
                'start_ms': 5000,
                'end_ms': 6000,
                'generated_audio_path': test_path,
                'status': 'success'
            }
        ]
        
        # Assemble
        final_track = absolute_sync_assembler.assemble_with_overlay(
            base_track,
            segments,
            'test'
        )
        
        # Verify no drift
        no_drift = absolute_sync_assembler.verify_no_drift(final_track, 10000)
        assert no_drift, "Drift detected in overlay assembly"
        
        logger.info(f"✓ Overlay assembly test passed: {len(final_track)}ms")
    finally:
        # Cleanup
        if os.path.exists(test_path):
            os.remove(test_path)


def test_complete_assembly():
    """Test complete assembly process"""
    logger.info("Testing complete assembly...")
    
    # Create test audio segments
    from pydub.generators import Sine
    
    os.makedirs('temp/test', exist_ok=True)
    
    segment_paths = []
    for i in range(3):
        tone = Sine(440 + i * 100).to_audio_segment(duration=1000)
        path = f'temp/test/segment_{i}.wav'
        tone.export(path, format="wav")
        segment_paths.append(path)
    
    try:
        # Create test Context Map
        context_map = {
            'project_id': 'test',
            'original_duration_ms': 10000,
            'source_language': 'en',
            'target_language': 'es',
            'created_at': '2025-01-01T00:00:00Z',
            'updated_at': '2025-01-01T00:00:00Z',
            'segments': [
                {
                    'id': 0,
                    'start_ms': 1000,
                    'end_ms': 2000,
                    'duration': 1.0,
                    'text': 'Hello',
                    'speaker': 'SPEAKER_00',
                    'confidence': 0.95,
                    'generated_audio_path': segment_paths[0],
                    'status': 'success'
                },
                {
                    'id': 1,
                    'start_ms': 3000,
                    'end_ms': 4000,
                    'duration': 1.0,
                    'text': 'World',
                    'speaker': 'SPEAKER_00',
                    'confidence': 0.95,
                    'generated_audio_path': segment_paths[1],
                    'status': 'success'
                },
                {
                    'id': 2,
                    'start_ms': 6000,
                    'end_ms': 7000,
                    'duration': 1.0,
                    'text': 'Test',
                    'speaker': 'SPEAKER_00',
                    'confidence': 0.95,
                    'generated_audio_path': segment_paths[2],
                    'status': 'success'
                }
            ]
        }
        
        # Assemble
        output_path = 'temp/test/final_output.wav'
        result = absolute_sync_assembler.assemble_final_audio(
            project_id='test',
            context_map=context_map,
            output_path=output_path
        )
        
        # Verify result
        assert result['success'], f"Assembly failed: {result.get('error')}"
        assert result['successful_segments'] == 3, "Expected 3 successful segments"
        assert result['duration_difference_ms'] <= 10, "Duration difference too large"
        
        # Verify output file exists
        assert os.path.exists(output_path), "Output file not created"
        
        # Verify output duration
        output_audio = AudioSegment.from_file(output_path)
        assert abs(len(output_audio) - 10000) <= 10, "Output duration mismatch"
        
        logger.info(f"✓ Complete assembly test passed")
        logger.info(f"  - Successful segments: {result['successful_segments']}")
        logger.info(f"  - Duration difference: {result['duration_difference_ms']}ms")
        logger.info(f"  - Completion rate: {result['completion_rate']:.2f}%")
        
    finally:
        # Cleanup
        for path in segment_paths:
            if os.path.exists(path):
                os.remove(path)
        if os.path.exists('temp/test/final_output.wav'):
            os.remove('temp/test/final_output.wav')


def run_all_tests():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("Running Absolute Synchronization Assembly Tests")
    logger.info("=" * 60)
    
    try:
        test_silent_base_track()
        test_conform_operation()
        test_chained_atempo()
        test_overlay_assembly()
        test_complete_assembly()
        
        logger.info("=" * 60)
        logger.info("✓ All tests passed!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"✗ Test failed: {e}")
        logger.error("=" * 60)
        raise


if __name__ == '__main__':
    run_all_tests()

