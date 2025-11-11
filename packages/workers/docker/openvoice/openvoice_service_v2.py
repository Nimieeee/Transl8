"""
OpenVoice V2 TTS Service

Simplified service using OpenVoice V2 with MeloTTS for multi-language support.
Supports: English, Spanish, French, Chinese, Japanese, Korean
"""

import os
import sys
import time
import uuid
import logging
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import torch

# Add OpenVoice to path
OPENVOICE_DIR = os.path.join(os.path.dirname(__file__), 'OpenVoice')
sys.path.insert(0, OPENVOICE_DIR)

from openvoice import se_extractor
from openvoice.api import ToneColorConverter
from melo.api import TTS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
CHECKPOINTS_DIR = os.path.join(os.path.dirname(__file__), 'checkpoints_v2')
TEMP_DIR = os.path.join(os.path.dirname(__file__), 'temp')
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'

# Ensure temp directory exists
os.makedirs(TEMP_DIR, exist_ok=True)

# Global model instances
tone_color_converter = None
tts_models = {}

# Language mapping
LANGUAGE_MAP = {
    'en': 'EN',
    'english': 'EN',
    'es': 'ES',
    'spanish': 'ES',
    'fr': 'FR',
    'french': 'FR',
    'zh': 'ZH',
    'chinese': 'ZH',
    'ja': 'JP',
    'japanese': 'JP',
    'ko': 'KR',
    'korean': 'KR'
}

def initialize_models():
    """Initialize OpenVoice V2 models"""
    global tone_color_converter, tts_models
    
    try:
        logger.info(f"Initializing OpenVoice V2 on {DEVICE}...")
        
        # Initialize tone color converter
        ckpt_converter = os.path.join(CHECKPOINTS_DIR, 'converter')
        tone_color_converter = ToneColorConverter(f'{ckpt_converter}/config.json', device=DEVICE)
        tone_color_converter.load_ckpt(f'{ckpt_converter}/checkpoint.pth')
        
        # Initialize TTS models for each language
        logger.info("Loading MeloTTS models...")
        for lang_code in ['EN', 'ES', 'FR', 'ZH', 'JP', 'KR']:
            try:
                tts_models[lang_code] = TTS(language=lang_code, device=DEVICE)
                logger.info(f"  ✓ {lang_code} model loaded")
            except Exception as e:
                logger.warning(f"  ✗ Failed to load {lang_code} model: {e}")
        
        logger.info("OpenVoice V2 initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize models: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        if tone_color_converter is None or not tts_models:
            return jsonify({
                'status': 'unhealthy',
                'error': 'Models not initialized'
            }), 503
        
        return jsonify({
            'status': 'healthy',
            'device': DEVICE,
            'version': 'v2',
            'languages': list(tts_models.keys()),
            'models_loaded': True
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/synthesize', methods=['POST'])
def synthesize():
    """
    Synthesize speech with voice cloning
    
    JSON body:
    {
        "text": "Hello world",
        "language": "en",  # en, es, fr, zh, ja, ko
        "reference_audio": "base64_or_path",  # optional
        "speed": 1.0  # optional
    }
    """
    try:
        data = request.json
        text = data.get('text')
        language = data.get('language', 'en').lower()
        speed = data.get('speed', 1.0)
        
        if not text:
            return jsonify({'error': 'Missing text parameter'}), 400
        
        # Map language code
        lang_code = LANGUAGE_MAP.get(language, 'EN')
        
        if lang_code not in tts_models:
            return jsonify({'error': f'Language not supported: {language}'}), 400
        
        start_time = time.time()
        
        # Generate base audio with MeloTTS
        # Get first available speaker ID
        speaker_ids = tts_models[lang_code].hps.data.spk2id
        speaker_id = list(speaker_ids.values())[0] if speaker_ids else 0
        
        output_path = os.path.join(TEMP_DIR, f'output_{uuid.uuid4()}.wav')
        
        tts_models[lang_code].tts_to_file(
            text,
            speaker_id,
            output_path,
            speed=speed
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Synthesized {len(text)} chars in {processing_time}ms")
        
        # Send file and clean up
        response = send_file(output_path, mimetype='audio/wav')
        
        @response.call_on_close
        def cleanup():
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except:
                    pass
        
        return response
        
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/synthesize-with-voice', methods=['POST'])
def synthesize_with_voice():
    """
    Synthesize speech with voice cloning from reference audio
    
    Form data:
    - text: Text to synthesize
    - language: Target language (en, es, fr, zh, ja, ko)
    - reference_audio: Audio file for voice cloning
    - speed: Speech speed (optional, default 1.0)
    """
    try:
        text = request.form.get('text')
        language = request.form.get('language', 'en').lower()
        speed = float(request.form.get('speed', 1.0))
        
        if not text:
            return jsonify({'error': 'Missing text parameter'}), 400
        
        if 'reference_audio' not in request.files:
            return jsonify({'error': 'Missing reference_audio file'}), 400
        
        reference_file = request.files['reference_audio']
        
        # Map language code
        lang_code = LANGUAGE_MAP.get(language, 'EN')
        
        if lang_code not in tts_models:
            return jsonify({'error': f'Language not supported: {language}'}), 400
        
        start_time = time.time()
        
        # Save reference audio
        reference_path = os.path.join(TEMP_DIR, f'ref_{uuid.uuid4()}.wav')
        reference_file.save(reference_path)
        
        # Extract speaker embedding from reference
        target_se, audio_name = se_extractor.get_se(reference_path, tone_color_converter, vad=False)
        
        # Generate base audio
        src_path = os.path.join(TEMP_DIR, f'tmp_{uuid.uuid4()}.wav')
        speaker_id = tts_models[lang_code].hps.data.spk2id.get('EN-US', 0)
        
        tts_models[lang_code].tts_to_file(
            text,
            speaker_id,
            src_path,
            speed=speed
        )
        
        # Get source speaker embedding
        source_se = torch.load(f'{CHECKPOINTS_DIR}/base_speakers/ses/{lang_code}.pth', map_location=DEVICE)
        
        # Apply voice conversion
        output_path = os.path.join(TEMP_DIR, f'output_{uuid.uuid4()}.wav')
        
        # Encode with target voice
        tone_color_converter.convert(
            audio_src_path=src_path,
            src_se=source_se,
            tgt_se=target_se,
            output_path=output_path,
            message="@MyShell"
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Voice cloned synthesis in {processing_time}ms")
        
        # Clean up temp files
        for path in [reference_path, src_path]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
        
        # Send file and clean up
        response = send_file(output_path, mimetype='audio/wav')
        
        @response.call_on_close
        def cleanup():
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except:
                    pass
        
        return response
        
    except Exception as e:
        logger.error(f"Voice cloning error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/languages', methods=['GET'])
def list_languages():
    """List supported languages"""
    return jsonify({
        'languages': [
            {'code': 'en', 'name': 'English', 'available': 'EN' in tts_models},
            {'code': 'es', 'name': 'Spanish', 'available': 'ES' in tts_models},
            {'code': 'fr', 'name': 'French', 'available': 'FR' in tts_models},
            {'code': 'zh', 'name': 'Chinese', 'available': 'ZH' in tts_models},
            {'code': 'ja', 'name': 'Japanese', 'available': 'JP' in tts_models},
            {'code': 'ko', 'name': 'Korean', 'available': 'KR' in tts_models}
        ]
    }), 200

if __name__ == '__main__':
    logger.info("Starting OpenVoice V2 TTS service...")
    
    # Initialize models
    if not initialize_models():
        logger.error("Failed to initialize models. Exiting.")
        exit(1)
    
    # Start Flask server
    port = int(os.getenv('PORT', 8007))
    logger.info(f"Server starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
