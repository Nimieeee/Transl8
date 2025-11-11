"""
Absolute Synchronization Assembly Service

Flask service that provides HTTP API for the absolute synchronization assembler.
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from absolute_sync_assembler import absolute_sync_assembler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'absolute-sync-assembler'
    })


@app.route('/assemble', methods=['POST'])
def assemble_audio():
    """
    Assemble final audio with absolute synchronization.
    
    Request body:
    {
        "project_id": "uuid",
        "context_map": { ... },
        "output_path": "/path/to/output.wav"
    }
    
    Response:
    {
        "success": true,
        "output_path": "/path/to/output.wav",
        "original_duration_ms": 125500,
        "final_duration_ms": 125498,
        "duration_difference_ms": 2,
        "total_segments": 45,
        "successful_segments": 43,
        "failed_segments": 1,
        "skipped_segments": 1,
        "completion_rate": 95.56
    }
    """
    try:
        data = request.get_json()
        
        # Validate request
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        project_id = data.get('project_id')
        context_map = data.get('context_map')
        output_path = data.get('output_path')
        
        if not project_id:
            return jsonify({
                'success': False,
                'error': 'project_id is required'
            }), 400
        
        if not context_map:
            return jsonify({
                'success': False,
                'error': 'context_map is required'
            }), 400
        
        if not output_path:
            return jsonify({
                'success': False,
                'error': 'output_path is required'
            }), 400
        
        logger.info(f"Received assembly request for project {project_id}")
        
        # Call assembler
        result = absolute_sync_assembler.assemble_final_audio(
            project_id=project_id,
            context_map=context_map,
            output_path=output_path
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
        
    except Exception as e:
        logger.error(f"Assembly request failed: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/validate', methods=['POST'])
def validate_audio():
    """
    Validate audio duration.
    
    Request body:
    {
        "audio_path": "/path/to/audio.wav",
        "expected_duration_ms": 125500,
        "tolerance_ms": 10
    }
    
    Response:
    {
        "valid": true,
        "actual_duration_ms": 125498,
        "expected_duration_ms": 125500,
        "difference_ms": 2
    }
    """
    try:
        data = request.get_json()
        
        audio_path = data.get('audio_path')
        expected_duration_ms = data.get('expected_duration_ms')
        tolerance_ms = data.get('tolerance_ms', 10)
        
        if not audio_path or expected_duration_ms is None:
            return jsonify({
                'valid': False,
                'error': 'audio_path and expected_duration_ms are required'
            }), 400
        
        # Load audio and check duration
        from pydub import AudioSegment
        audio = AudioSegment.from_file(audio_path)
        actual_duration_ms = len(audio)
        difference_ms = abs(actual_duration_ms - expected_duration_ms)
        
        is_valid = difference_ms <= tolerance_ms
        
        return jsonify({
            'valid': is_valid,
            'actual_duration_ms': actual_duration_ms,
            'expected_duration_ms': expected_duration_ms,
            'difference_ms': difference_ms,
            'tolerance_ms': tolerance_ms
        }), 200
        
    except Exception as e:
        logger.error(f"Validation request failed: {e}", exc_info=True)
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8012))
    logger.info(f"Starting Absolute Sync Assembly Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)

