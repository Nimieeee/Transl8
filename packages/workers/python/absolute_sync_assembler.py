"""
Absolute Synchronization Assembler

Implements the absolute synchronization assembly system that prevents cumulative
audio drift by using a silent base track and overlaying conformed audio segments
at exact millisecond positions.
"""

import os
import json
import logging
import subprocess
from typing import Dict, List, Optional, Any
from pydub import AudioSegment
from pydub.silence import detect_silence

logger = logging.getLogger(__name__)


class AbsoluteSynchronizationAssembler:
    """
    Assembles final dubbed audio with absolute synchronization to prevent drift.
    
    Uses a three-step process:
    1. Create silent base track of exact original duration
    2. Conform each generated audio segment to exact target duration using FFmpeg atempo
    3. Overlay conformed segments at exact millisecond positions using Pydub
    """
    
    def __init__(self, temp_dir: str = 'temp'):
        self.temp_dir = temp_dir
        self.sample_rate = 16000  # 16kHz standard
        self.channels = 1  # Mono
    
    def create_silent_base_track(self, duration_ms: int) -> AudioSegment:
        """
        Create a silent audio track of exact duration.
        
        Args:
            duration_ms: Duration in milliseconds
            
        Returns:
            AudioSegment containing silence of exact duration
            
        Requirements: 20.1
        """
        try:
            logger.info(f"Creating silent base track of {duration_ms}ms")
            
            # Create silent audio segment
            silent_track = AudioSegment.silent(
                duration=duration_ms,
                frame_rate=self.sample_rate
            )
            
            # Validate duration
            actual_duration = len(silent_track)
            if actual_duration != duration_ms:
                logger.warning(
                    f"Silent track duration mismatch: expected {duration_ms}ms, "
                    f"got {actual_duration}ms"
                )
            
            logger.info(f"Silent base track created: {actual_duration}ms")
            return silent_track
            
        except Exception as e:
            logger.error(f"Failed to create silent base track: {e}")
            raise
    
    def validate_base_track_duration(
        self,
        base_track: AudioSegment,
        expected_duration_ms: int,
        tolerance_ms: int = 10
    ) -> bool:
        """
        Validate that base track duration matches expected duration.
        
        Args:
            base_track: The silent base track
            expected_duration_ms: Expected duration in milliseconds
            tolerance_ms: Acceptable tolerance in milliseconds (default 10ms)
            
        Returns:
            True if duration is within tolerance, False otherwise
            
        Requirements: 20.1
        """
        actual_duration = len(base_track)
        difference = abs(actual_duration - expected_duration_ms)
        
        is_valid = difference <= tolerance_ms
        
        if not is_valid:
            logger.error(
                f"Base track duration validation failed: "
                f"expected {expected_duration_ms}ms, got {actual_duration}ms "
                f"(difference: {difference}ms, tolerance: {tolerance_ms}ms)"
            )
        else:
            logger.debug(
                f"Base track duration validated: {actual_duration}ms "
                f"(difference: {difference}ms)"
            )
        
        return is_valid


    def conform_audio(
        self,
        audio_path: str,
        actual_duration_ms: int,
        target_duration_ms: int,
        output_path: Optional[str] = None
    ) -> str:
        """
        Conform audio to exact target duration using FFmpeg atempo filter.
        
        The atempo filter supports tempo factors between 0.5 and 2.0.
        For extreme ratios, multiple atempo filters are chained.
        
        Args:
            audio_path: Path to input audio file
            actual_duration_ms: Actual duration of input audio in milliseconds
            target_duration_ms: Target duration in milliseconds
            output_path: Optional output path (auto-generated if not provided)
            
        Returns:
            Path to conformed audio file
            
        Requirements: 20.3
        """
        try:
            # Calculate tempo factor (speed multiplier)
            # tempo > 1.0 speeds up (shortens), tempo < 1.0 slows down (lengthens)
            tempo_factor = actual_duration_ms / target_duration_ms
            
            logger.info(
                f"Conforming audio: {actual_duration_ms}ms -> {target_duration_ms}ms "
                f"(tempo factor: {tempo_factor:.3f})"
            )
            
            # Generate output path if not provided
            if output_path is None:
                base_name = os.path.splitext(os.path.basename(audio_path))[0]
                output_path = os.path.join(
                    os.path.dirname(audio_path),
                    f"{base_name}_conformed.wav"
                )
            
            # Build FFmpeg command with atempo filter(s)
            if 0.5 <= tempo_factor <= 2.0:
                # Single atempo filter
                filter_complex = f"atempo={tempo_factor}"
            else:
                # Chain multiple atempo filters for extreme ratios
                filter_complex = self._build_chained_atempo(tempo_factor)
            
            # Execute FFmpeg command
            cmd = [
                'ffmpeg',
                '-i', audio_path,
                '-af', filter_complex,
                '-y',  # Overwrite output file
                output_path
            ]
            
            logger.debug(f"FFmpeg command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Validate conformed audio duration
            conformed_audio = AudioSegment.from_file(output_path)
            conformed_duration = len(conformed_audio)
            
            # Allow 10ms tolerance
            tolerance_ms = 10
            difference = abs(conformed_duration - target_duration_ms)
            
            if difference > tolerance_ms:
                logger.warning(
                    f"Conformed audio duration mismatch: "
                    f"target {target_duration_ms}ms, got {conformed_duration}ms "
                    f"(difference: {difference}ms)"
                )
            else:
                logger.debug(
                    f"Conformed audio validated: {conformed_duration}ms "
                    f"(difference: {difference}ms)"
                )
            
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg conform operation failed: {e.stderr}")
            raise RuntimeError(f"Audio conform failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Failed to conform audio: {e}")
            raise
    
    def _build_chained_atempo(self, tempo_factor: float) -> str:
        """
        Build chained atempo filters for extreme tempo factors.
        
        FFmpeg's atempo filter only supports factors between 0.5 and 2.0.
        For factors outside this range, we chain multiple atempo filters.
        
        Args:
            tempo_factor: Desired tempo factor
            
        Returns:
            FFmpeg filter complex string with chained atempo filters
            
        Requirements: 20.3
        """
        filters = []
        remaining_factor = tempo_factor
        
        # Break down the tempo factor into chainable components
        while remaining_factor > 2.0:
            filters.append("atempo=2.0")
            remaining_factor /= 2.0
        
        while remaining_factor < 0.5:
            filters.append("atempo=0.5")
            remaining_factor /= 0.5
        
        # Add final filter for remaining factor
        if remaining_factor != 1.0:
            filters.append(f"atempo={remaining_factor:.6f}")
        
        filter_complex = ",".join(filters)
        logger.debug(f"Chained atempo filters: {filter_complex}")
        
        return filter_complex
    
    def validate_conformed_duration(
        self,
        audio_path: str,
        target_duration_ms: int,
        tolerance_ms: int = 10
    ) -> bool:
        """
        Validate that conformed audio has exact target duration.
        
        Args:
            audio_path: Path to conformed audio file
            target_duration_ms: Expected duration in milliseconds
            tolerance_ms: Acceptable tolerance in milliseconds (default 10ms)
            
        Returns:
            True if duration is within tolerance, False otherwise
            
        Requirements: 20.3
        """
        try:
            audio = AudioSegment.from_file(audio_path)
            actual_duration = len(audio)
            difference = abs(actual_duration - target_duration_ms)
            
            is_valid = difference <= tolerance_ms
            
            if not is_valid:
                logger.error(
                    f"Conformed audio duration validation failed: "
                    f"expected {target_duration_ms}ms, got {actual_duration}ms "
                    f"(difference: {difference}ms, tolerance: {tolerance_ms}ms)"
                )
            else:
                logger.debug(
                    f"Conformed audio duration validated: {actual_duration}ms "
                    f"(difference: {difference}ms)"
                )
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Failed to validate conformed audio duration: {e}")
            return False
    
    def assemble_with_overlay(
        self,
        base_track: AudioSegment,
        segments: List[Dict[str, Any]],
        project_id: str
    ) -> AudioSegment:
        """
        Assemble final audio by overlaying conformed segments at exact positions.
        
        This method:
        1. Iterates through segments from Context Map
        2. Loads and conforms each generated audio segment
        3. Overlays at exact millisecond positions
        4. Verifies no cumulative drift occurs
        
        Args:
            base_track: Silent base track of exact original duration
            segments: List of segment dictionaries from Context Map
            project_id: Project ID for logging and temp file management
            
        Returns:
            Final assembled AudioSegment with perfect synchronization
            
        Requirements: 20.4
        """
        try:
            logger.info(f"Starting overlay assembly for project {project_id}")
            logger.info(f"Base track duration: {len(base_track)}ms")
            logger.info(f"Total segments to process: {len(segments)}")
            
            final_track = base_track
            successful_overlays = 0
            skipped_segments = 0
            
            for segment in segments:
                segment_id = segment['id']
                
                # Skip segments without generated audio or failed segments
                if not segment.get('generated_audio_path'):
                    logger.warning(
                        f"Segment {segment_id}: No generated audio path, skipping"
                    )
                    skipped_segments += 1
                    continue
                
                if segment.get('status') and segment['status'].startswith('failed_'):
                    logger.warning(
                        f"Segment {segment_id}: Failed status '{segment['status']}', skipping"
                    )
                    skipped_segments += 1
                    continue
                
                try:
                    # Extract segment timing information
                    start_ms = segment['start_ms']
                    end_ms = segment['end_ms']
                    target_duration_ms = end_ms - start_ms
                    audio_path = segment['generated_audio_path']
                    
                    logger.debug(
                        f"Segment {segment_id}: Processing [{start_ms}ms - {end_ms}ms] "
                        f"(duration: {target_duration_ms}ms)"
                    )
                    
                    # Load generated audio
                    if not os.path.exists(audio_path):
                        logger.error(
                            f"Segment {segment_id}: Audio file not found: {audio_path}"
                        )
                        skipped_segments += 1
                        continue
                    
                    generated_audio = AudioSegment.from_file(audio_path)
                    actual_duration_ms = len(generated_audio)
                    
                    logger.debug(
                        f"Segment {segment_id}: Loaded audio {actual_duration_ms}ms"
                    )
                    
                    # Conform audio to exact target duration if needed
                    if abs(actual_duration_ms - target_duration_ms) > 10:  # 10ms tolerance
                        logger.debug(
                            f"Segment {segment_id}: Conforming {actual_duration_ms}ms "
                            f"-> {target_duration_ms}ms"
                        )
                        
                        conformed_path = self.conform_audio(
                            audio_path,
                            actual_duration_ms,
                            target_duration_ms,
                            output_path=os.path.join(
                                self.temp_dir,
                                project_id,
                                f"conformed_{segment_id}.wav"
                            )
                        )
                        
                        conformed_audio = AudioSegment.from_file(conformed_path)
                    else:
                        conformed_audio = generated_audio
                    
                    # Overlay at exact millisecond position
                    logger.debug(
                        f"Segment {segment_id}: Overlaying at position {start_ms}ms"
                    )
                    
                    final_track = final_track.overlay(
                        conformed_audio,
                        position=start_ms
                    )
                    
                    successful_overlays += 1
                    
                except Exception as e:
                    logger.error(
                        f"Segment {segment_id}: Failed to process: {e}",
                        exc_info=True
                    )
                    skipped_segments += 1
                    continue
            
            # Verify no cumulative drift
            final_duration = len(final_track)
            base_duration = len(base_track)
            
            if final_duration != base_duration:
                logger.error(
                    f"Cumulative drift detected! "
                    f"Base: {base_duration}ms, Final: {final_duration}ms "
                    f"(difference: {final_duration - base_duration}ms)"
                )
            else:
                logger.info(
                    f"No cumulative drift detected. Duration: {final_duration}ms"
                )
            
            logger.info(
                f"Overlay assembly complete: "
                f"{successful_overlays} successful, {skipped_segments} skipped"
            )
            
            return final_track
            
        except Exception as e:
            logger.error(f"Failed to assemble audio with overlay: {e}")
            raise
    
    def verify_no_drift(
        self,
        final_track: AudioSegment,
        expected_duration_ms: int,
        tolerance_ms: int = 10
    ) -> bool:
        """
        Verify that no cumulative drift occurred during assembly.
        
        Args:
            final_track: The assembled audio track
            expected_duration_ms: Expected duration in milliseconds
            tolerance_ms: Acceptable tolerance in milliseconds (default 10ms)
            
        Returns:
            True if no drift detected, False otherwise
            
        Requirements: 20.4
        """
        actual_duration = len(final_track)
        difference = abs(actual_duration - expected_duration_ms)
        
        no_drift = difference <= tolerance_ms
        
        if not no_drift:
            logger.error(
                f"Drift detected: expected {expected_duration_ms}ms, "
                f"got {actual_duration}ms (difference: {difference}ms)"
            )
        else:
            logger.info(
                f"No drift detected: {actual_duration}ms "
                f"(difference: {difference}ms)"
            )
        
        return no_drift
    
    def assemble_final_audio(
        self,
        project_id: str,
        context_map: Dict[str, Any],
        output_path: str
    ) -> Dict[str, Any]:
        """
        Orchestrate the complete absolute synchronization assembly process.
        
        This is the main entry point for the final assembly worker.
        
        Process:
        1. Create silent base track of exact original duration
        2. Process all successful segments from Context Map
        3. Conform and overlay each segment at exact position
        4. Export final synchronized audio track
        5. Validate final audio duration matches original
        
        Args:
            project_id: Project ID
            context_map: Complete Context Map dictionary
            output_path: Path for final assembled audio file
            
        Returns:
            Dictionary with assembly results and statistics
            
        Requirements: 20.5
        """
        try:
            logger.info(f"Starting final audio assembly for project {project_id}")
            
            # Extract metadata from Context Map
            original_duration_ms = context_map['original_duration_ms']
            segments = context_map['segments']
            
            logger.info(f"Original duration: {original_duration_ms}ms")
            logger.info(f"Total segments: {len(segments)}")
            
            # Step 1: Create silent base track
            logger.info("Step 1: Creating silent base track")
            base_track = self.create_silent_base_track(original_duration_ms)
            
            # Validate base track
            if not self.validate_base_track_duration(base_track, original_duration_ms):
                raise RuntimeError("Base track duration validation failed")
            
            # Step 2: Assemble with overlay
            logger.info("Step 2: Assembling segments with overlay")
            final_track = self.assemble_with_overlay(
                base_track,
                segments,
                project_id
            )
            
            # Step 3: Validate final duration
            logger.info("Step 3: Validating final audio duration")
            if not self.verify_no_drift(final_track, original_duration_ms):
                logger.warning("Drift detected in final audio, but continuing")
            
            # Step 4: Export final audio
            logger.info(f"Step 4: Exporting final audio to {output_path}")
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Export as WAV with standard settings
            final_track.export(
                output_path,
                format='wav',
                parameters=[
                    '-ar', str(self.sample_rate),  # Sample rate
                    '-ac', str(self.channels),      # Channels
                ]
            )
            
            # Validate exported file
            exported_audio = AudioSegment.from_file(output_path)
            exported_duration = len(exported_audio)
            
            logger.info(f"Final audio exported: {exported_duration}ms")
            
            # Calculate statistics
            successful_segments = sum(
                1 for seg in segments
                if seg.get('generated_audio_path') and
                seg.get('status') != 'failed_adaptation' and
                seg.get('status') != 'failed_tts'
            )
            
            failed_segments = sum(
                1 for seg in segments
                if seg.get('status') and seg['status'].startswith('failed_')
            )
            
            skipped_segments = len(segments) - successful_segments - failed_segments
            
            result = {
                'success': True,
                'output_path': output_path,
                'original_duration_ms': original_duration_ms,
                'final_duration_ms': exported_duration,
                'duration_difference_ms': abs(exported_duration - original_duration_ms),
                'total_segments': len(segments),
                'successful_segments': successful_segments,
                'failed_segments': failed_segments,
                'skipped_segments': skipped_segments,
                'completion_rate': (successful_segments / len(segments) * 100) if segments else 0,
            }
            
            logger.info(f"Final assembly complete: {result}")
            
            return result
            
        except Exception as e:
            logger.error(f"Final audio assembly failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'output_path': None,
            }


# Global instance
absolute_sync_assembler = AbsoluteSynchronizationAssembler()

