"""
Context Map Service for Python Workers

Provides utilities for workers to update the Context Map at each pipeline stage.
"""

import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ContextMapSegment:
    """Represents a single segment in the Context Map"""
    
    def __init__(self, data: Dict[str, Any]):
        self.id = data['id']
        self.start_ms = data['start_ms']
        self.end_ms = data['end_ms']
        self.duration = data['duration']
        self.text = data['text']
        self.speaker = data['speaker']
        self.confidence = data['confidence']
        self.clean_prompt_path = data.get('clean_prompt_path')
        self.emotion = data.get('emotion')
        self.previous_line = data.get('previous_line')
        self.next_line = data.get('next_line')
        self.adapted_text = data.get('adapted_text')
        self.status = data.get('status', 'pending')
        self.attempts = data.get('attempts', 0)
        self.generated_audio_path = data.get('generated_audio_path')
        self.validation_feedback = data.get('validation_feedback')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert segment to dictionary"""
        return {
            'id': self.id,
            'start_ms': self.start_ms,
            'end_ms': self.end_ms,
            'duration': self.duration,
            'text': self.text,
            'speaker': self.speaker,
            'confidence': self.confidence,
            'clean_prompt_path': self.clean_prompt_path,
            'emotion': self.emotion,
            'previous_line': self.previous_line,
            'next_line': self.next_line,
            'adapted_text': self.adapted_text,
            'status': self.status,
            'attempts': self.attempts,
            'generated_audio_path': self.generated_audio_path,
            'validation_feedback': self.validation_feedback,
        }


class ContextMap:
    """Represents the complete Context Map for a project"""
    
    def __init__(self, data: Dict[str, Any]):
        self.project_id = data['project_id']
        self.original_duration_ms = data['original_duration_ms']
        self.source_language = data['source_language']
        self.target_language = data['target_language']
        self.created_at = data['created_at']
        self.updated_at = data['updated_at']
        self.segments = [ContextMapSegment(seg) for seg in data['segments']]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert Context Map to dictionary"""
        return {
            'project_id': self.project_id,
            'original_duration_ms': self.original_duration_ms,
            'source_language': self.source_language,
            'target_language': self.target_language,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'segments': [seg.to_dict() for seg in self.segments],
        }
    
    def get_segment(self, segment_id: int) -> Optional[ContextMapSegment]:
        """Get a specific segment by ID"""
        for segment in self.segments:
            if segment.id == segment_id:
                return segment
        return None
    
    def update_segment(self, segment_id: int, updates: Dict[str, Any]) -> None:
        """Update a specific segment"""
        segment = self.get_segment(segment_id)
        if segment:
            for key, value in updates.items():
                if hasattr(segment, key):
                    setattr(segment, key, value)
            self.updated_at = datetime.utcnow().isoformat()


class ContextMapService:
    """Service for managing Context Maps from Python workers"""
    
    def __init__(self, temp_dir: str = 'temp'):
        self.temp_dir = temp_dir
    
    def _get_context_map_path(self, project_id: str) -> str:
        """Get the file path for a Context Map"""
        return os.path.join(self.temp_dir, project_id, 'context_map.json')
    
    def load(self, project_id: str) -> Optional[ContextMap]:
        """Load Context Map from file system"""
        try:
            path = self._get_context_map_path(project_id)
            
            if not os.path.exists(path):
                logger.warning(f"Context Map not found at {path}")
                return None
            
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return ContextMap(data)
        except Exception as e:
            logger.error(f"Failed to load Context Map for project {project_id}: {e}")
            return None
    
    def save(self, context_map: ContextMap) -> bool:
        """Save Context Map to file system"""
        try:
            path = self._get_context_map_path(context_map.project_id)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(path), exist_ok=True)
            
            # Save to file
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(context_map.to_dict(), f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Context Map saved to {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save Context Map: {e}")
            return False
    
    def update_segment(
        self,
        project_id: str,
        segment_id: int,
        updates: Dict[str, Any]
    ) -> bool:
        """Update a specific segment in the Context Map"""
        try:
            context_map = self.load(project_id)
            if not context_map:
                logger.error(f"Context Map not found for project {project_id}")
                return False
            
            context_map.update_segment(segment_id, updates)
            return self.save(context_map)
        except Exception as e:
            logger.error(f"Failed to update segment {segment_id}: {e}")
            return False
    
    def add_clean_prompt_path(
        self,
        project_id: str,
        segment_id: int,
        clean_prompt_path: str
    ) -> bool:
        """Add clean prompt path to a segment (after vocal isolation)"""
        return self.update_segment(project_id, segment_id, {
            'clean_prompt_path': clean_prompt_path
        })
    
    def add_emotion_tag(
        self,
        project_id: str,
        segment_id: int,
        emotion: str
    ) -> bool:
        """Add emotion tag to a segment (after emotion analysis)"""
        return self.update_segment(project_id, segment_id, {
            'emotion': emotion
        })
    
    def add_adapted_text(
        self,
        project_id: str,
        segment_id: int,
        adapted_text: str,
        status: str,
        attempts: int,
        validation_feedback: Optional[str] = None
    ) -> bool:
        """Add adapted text and status to a segment (after translation)"""
        updates = {
            'adapted_text': adapted_text,
            'status': status,
            'attempts': attempts,
        }
        if validation_feedback:
            updates['validation_feedback'] = validation_feedback
        
        return self.update_segment(project_id, segment_id, updates)
    
    def add_generated_audio_path(
        self,
        project_id: str,
        segment_id: int,
        generated_audio_path: str
    ) -> bool:
        """Add generated audio path to a segment (after TTS)"""
        return self.update_segment(project_id, segment_id, {
            'generated_audio_path': generated_audio_path
        })
    
    def get_segments_for_processing(
        self,
        project_id: str,
        status_filter: Optional[str] = None
    ) -> List[ContextMapSegment]:
        """Get segments that need processing"""
        context_map = self.load(project_id)
        if not context_map:
            return []
        
        if status_filter:
            return [seg for seg in context_map.segments if seg.status == status_filter]
        
        return context_map.segments
    
    def get_summary(self, project_id: str) -> Dict[str, Any]:
        """Get summary statistics for a Context Map"""
        context_map = self.load(project_id)
        if not context_map:
            return {
                'error': 'Context Map not found',
                'total_segments': 0,
            }
        
        total_segments = len(context_map.segments)
        successful_segments = sum(1 for seg in context_map.segments if seg.status == 'success')
        failed_segments = sum(
            1 for seg in context_map.segments 
            if seg.status and seg.status.startswith('failed_')
        )
        pending_segments = sum(
            1 for seg in context_map.segments 
            if not seg.status or seg.status == 'pending'
        )
        
        total_attempts = sum(seg.attempts for seg in context_map.segments)
        average_attempts = total_attempts / total_segments if total_segments > 0 else 0
        completion_rate = (successful_segments / total_segments * 100) if total_segments > 0 else 0
        
        return {
            'total_segments': total_segments,
            'successful_segments': successful_segments,
            'failed_segments': failed_segments,
            'pending_segments': pending_segments,
            'average_attempts': average_attempts,
            'completion_rate': completion_rate,
        }


# Global instance
context_map_service = ContextMapService()
