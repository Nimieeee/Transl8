"""
OpenVoice TTS Service

Provides zero-shot voice cloning with style transfer from clean style prompts.
Supports emotion-aware synthesis for expressive dubbing.

Requirements: 4.1, 4.2, 4.3, 4.4
"""

import os
import time
import uuid
import logging
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import torch
import torchaudio
import numpy as np
from openvoice import se_extractor
from openvoice.api import ToneColorConverter, BaseSpeakerTTS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
MODELS_DIR = os.getenv('MODELS_DIR', '/app/models')
CLONES_DIR = os.getenv('CLONES_DIR', '/app/clones')
TEMP_DIR = os.getenv('TEMP_DIR', '/app/temp')
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'

# Ensure directories exist
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(CLONES_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Global model instances
base_speaker_tts = None
tone_color_converter = None
voice_clones = {}

def initialize_models():
    """Initialize OpenVoice models"""
    global base_speaker_tts, tone_color_converter
    
    try:
        logger.info(f"Initializing OpenVoice models on {DEVICE}...")
        
        # Initialize base speaker TTS
        base_speaker_tts = BaseSpeakerTTS(
            config_path=f'{MODELS_DIR}/config.json',
            device=DEVICE
        )
        
        # Initialize tone color converter
        tone_color_converter = ToneColorConverter(
            config_path=f'{MODELS_DIR}/converter_config.json',
            device=DEVICE
        )
        
        logger.info("OpenVoice models initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize models: {e}")
        return False

def extract_style_embedding(audio_path: str):
    """Extract style embedding from audio file"""
    try:
        # Load audio
        audio, sr = torchaudio.load(audio_path)
        
        # Resample if needed
        if sr != 16000:
            resampler = torchaudio.transforms.Resample(sr, 16000)
            audio = resampler(audio)
        
        # Extract speaker embedding
        embedding = se_extractor.get_se(
            audio_path,
            tone_color_converter,
            target_dir=TEMP_DIR
        )
        
        return embedding
    except Exception as e:
        logger.error(f"Failed to extract style embedding: {e}")
        raise

def apply_emotion_to_synthesis(text: str, emotion: str) -> str:
    """Apply emotion tags to text for expressive synthesis"""
    # OpenVoice supports emotion control through prosody tags
    emotion_map = {
        'neutral': '',
        'happy': '[happy]',
        'sad': '[sad]',
        'angry': '[angry]',
        'excited': '[excited]',
        'fearful': '[fearful]',
        'surprised': '[surprised]'
    }
    
    emotion_tag = emotion_map.get(emotion.lower(), '')
    if emotion_tag:
        return f"{emotion_tag} {text}"
    return text

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        if base_speaker_tts is None or tone_color_converter is None:
            return jsonify({
                'status': 'unhealthy',
                'error': 'Models not initialized'
            }), 503
        
        return jsonify({
            'status': 'healthy',
            'device': DEVICE,
            'models_loaded': True
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/synthesize', methods=['POST'])
def synthesize():
    """Synthesize speech with voice cloning"""
    try:
        data = request.json
        text = data.get('text')
        voice_id = data.get('voiceId')
        voice_type = data.get('voiceType', 'clone')
        parameters = data.get('parameters', {})
        
        if not text:
            return jsonify({'error': 'Missing text parameter'}), 400
        
        start_time = time.time()
        
        # Apply emotion if specified
        emotion = parameters.get('emotion')
        if emotion:
            text = apply_emotion_to_synthesis(text, emotion)
        
        # Generate base audio with base speaker
        temp_base_path = os.path.join(TEMP_DIR, f'base_{uuid.uuid4()}.wav')
        
        base_speaker_tts.tts(
            text,
            temp_base_path,
            speaker='default',
            language='English',
            speed=parameters.get('speed', 1.0)
        )
        
        # If voice cloning is requested, apply tone color conversion
        if voice_type == 'clone' and voice_id:
            if voice_id not in voice_clones:
                return jsonify({'error': f'Voice clone not found: {voice_id}'}), 404
            
            target_se = voice_clones[voice_id]['embedding']
            output_path = os.path.join(TEMP_DIR, f'output_{uuid.uuid4()}.wav')
            
            # Convert tone color
            tone_color_converter.convert(
                audio_src_path=temp_base_path,
                src_se=base_speaker_tts.get_se(),
                tgt_se=target_se,
                output_path=output_path
            )
            
            # Clean up base audio
            if os.path.exists(temp_base_path):
                os.remove(temp_base_path)
            
            final_path = output_path
        else:
            final_path = temp_base_path
        
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Synthesized {len(text)} chars in {processing_time}ms")
        
        # Send file and clean up
        response = send_file(final_path, mimetype='audio/wav')
        
        # Schedule cleanup after response is sent
        @response.call_on_close
        def cleanup():
            if os.path.exists(final_path):
                os.remove(final_path)
        
        return response
        
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/synthesize-with-prompt', methods=['POST'])
def synthesize_with_prompt():
    """Synthesize speech using clean style prompt for voice cloning"""
    try:
        text = request.form.get('text')
        target_language = request.form.get('target_language', 'English')
        emotion = request.form.get('emotion')
        
        if not text:
            return jsonify({'error': 'Missing text parameter'}), 400
        
        if 'style_prompt' not in request.files:
            return jsonify({'error': 'Missing style_prompt audio file'}), 400
        
        style_prompt_file = request.files['style_prompt']
        
        start_time = time.time()
        
        # Save style prompt temporarily
        style_prompt_path = os.path.join(TEMP_DIR, f'prompt_{uuid.uuid4()}.wav')
        style_prompt_file.save(style_prompt_path)
        
        # Extract style embedding from clean prompt
        target_se = extract_style_embedding(style_prompt_path)
        
        # Apply emotion if specified
        if emotion:
            text = apply_emotion_to_synthesis(text, emotion)
        
        # Generate base audio
        temp_base_path = os.path.join(TEMP_DIR, f'base_{uuid.uuid4()}.wav')
        
        base_speaker_tts.tts(
            text,
            temp_base_path,
            speaker='default',
            language=target_language,
            speed=1.0
        )
        
        # Apply tone color conversion
        output_path = os.path.join(TEMP_DIR, f'output_{uuid.uuid4()}.wav')
        
        tone_color_converter.convert(
            audio_src_path=temp_base_path,
            src_se=base_speaker_tts.get_se(),
            tgt_se=target_se,
            output_path=output_path
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Synthesized with clean prompt in {processing_time}ms")
        
        # Clean up temporary files
        if os.path.exists(style_prompt_path):
            os.remove(style_prompt_path)
        if os.path.exists(temp_base_path):
            os.remove(temp_base_path)
        
        # Send file and clean up
        response = send_file(output_path, mimetype='audio/wav')
        
        @response.call_on_close
        def cleanup():
            if os.path.exists(output_path):
                os.remove(output_path)
        
        return response
        
    except Exception as e:
        logger.error(f"Clean prompt synthesis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/clone', methods=['POST'])
def create_voice_clone():
    """Create a voice clone from audio sample"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'Missing audio file'}), 400
        
        audio_file = request.files['audio']
        voice_name = request.form.get('name', f'clone_{uuid.uuid4()}')
        language = request.form.get('language', 'English')
        
        start_time = time.time()
        
        # Save audio file
        voice_id = str(uuid.uuid4())
        audio_path = os.path.join(CLONES_DIR, f'{voice_id}.wav')
        audio_file.save(audio_path)
        
        # Extract style embedding
        embedding = extract_style_embedding(audio_path)
        
        # Store voice clone
        voice_clones[voice_id] = {
            'id': voice_id,
            'name': voice_name,
            'language': language,
            'audio_path': audio_path,
            'embedding': embedding,
            'created_at': time.time()
        }
        
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Created voice clone {voice_id} in {processing_time}ms")
        
        return jsonify({
            'voiceId': voice_id,
            'name': voice_name,
            'processingTime': processing_time
        }), 201
        
    except Exception as e:
        logger.error(f"Voice clone creation error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/clones', methods=['GET'])
def list_voice_clones():
    """List all voice clones"""
    try:
        clones = [
            {
                'id': clone['id'],
                'name': clone['name'],
                'language': clone['language'],
                'created_at': clone['created_at']
            }
            for clone in voice_clones.values()
        ]
        
        return jsonify({'clones': clones}), 200
        
    except Exception as e:
        logger.error(f"Error listing clones: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/clones/<voice_id>', methods=['DELETE'])
def delete_voice_clone(voice_id):
    """Delete a voice clone"""
    try:
        if voice_id not in voice_clones:
            return jsonify({'error': 'Voice clone not found'}), 404
        
        # Remove audio file
        audio_path = voice_clones[voice_id]['audio_path']
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        # Remove from memory
        del voice_clones[voice_id]
        
        logger.info(f"Deleted voice clone {voice_id}")
        
        return jsonify({'message': 'Voice clone deleted'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting clone: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting OpenVoice TTS service...")
    
    # Initialize models
    if not initialize_models():
        logger.error("Failed to initialize models. Exiting.")
        exit(1)
    
    # Start Flask server
    port = int(os.getenv('PORT', 8007))
    app.run(host='0.0.0.0', port=port, debug=False)
