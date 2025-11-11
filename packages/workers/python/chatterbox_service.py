#!/usr/bin/env python3
"""
Chatterbox by Resemble AI - Open Source Voice Cloning Service
MIT Licensed - Self-hosted TTS with zero-shot voice cloning
Supports 23 languages with emotion control

Apple Silicon Optimized - Based on Jimmi42/chatterbox-tts-apple-silicon-code
"""

from flask import Flask, request, jsonify, send_file
import os
import logging
from pathlib import Path
import tempfile
import torch
import torchaudio as ta
import sys

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Monkey patch torch.load to handle device mapping for Chatterbox-TTS
original_torch_load = torch.load

def patched_torch_load(f, map_location=None, **kwargs):
    """
    Patched torch.load that automatically maps CUDA tensors to CPU/MPS
    This is needed because Chatterbox models are trained on CUDA
    """
    if map_location is None:
        map_location = 'cpu'  # Safe default
    logger.debug(f"Loading with map_location={map_location}")
    return original_torch_load(f, map_location=map_location, **kwargs)

# Apply the patch
torch.load = patched_torch_load
if 'torch' in sys.modules:
    sys.modules['torch'].load = patched_torch_load

logger.info("✅ Applied torch.load device mapping patch for Apple Silicon")

# Device detection with MPS support
# Note: Chatterbox-TTS has some compatibility issues with MPS, so we use CPU for stability
if torch.cuda.is_available():
    device = "cuda"
    logger.info("🚀 Running on CUDA GPU")
elif torch.backends.mps.is_available():
    # MPS is available but Chatterbox has compatibility issues
    # We'll try MPS but fall back to CPU if needed
    device = "cpu"  # Start with CPU for stability
    logger.info("🍎 Apple Silicon detected - using CPU mode for Chatterbox-TTS compatibility")
    logger.info("💡 Note: MPS support is disabled due to chatterbox-tts library limitations")
else:
    device = "cpu"
    logger.info("🚀 Running on CPU")

logger.info(f"Using device: {device}")

class ChatterboxService:
    def __init__(self):
        """Initialize Chatterbox models (English and Multilingual) with Apple Silicon optimization"""
        logger.info("Loading Chatterbox models with Apple Silicon optimization...")
        
        try:
            # Try different import paths
            try:
                from chatterbox.tts import ChatterboxTTS
                from chatterbox.mtl_tts import ChatterboxMultilingualTTS
                logger.info("✅ Using standard chatterbox import")
            except ImportError:
                try:
                    from chatterbox.src.chatterbox.tts import ChatterboxTTS
                    from chatterbox.src.chatterbox.mtl_tts import ChatterboxMultilingualTTS
                    logger.info("✅ Using chatterbox.src import path")
                except ImportError as e:
                    logger.error(f"Failed to import chatterbox: {e}")
                    raise
            
            # Load models to CPU first (safest approach)
            logger.info("Loading English model to CPU...")
            self.english_model = ChatterboxTTS.from_pretrained(device="cpu")
            
            logger.info("Loading Multilingual model to CPU...")
            self.multilingual_model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
            
            # Try to move to MPS if available (experimental)
            if device == "mps" and torch.backends.mps.is_available():
                logger.info("🍎 Attempting to use MPS acceleration (experimental)...")
                try:
                    # Move model components to MPS
                    if hasattr(self.english_model, 't3') and self.english_model.t3 is not None:
                        self.english_model.t3 = self.english_model.t3.to(device)
                    if hasattr(self.english_model, 's3gen') and self.english_model.s3gen is not None:
                        self.english_model.s3gen = self.english_model.s3gen.to(device)
                    if hasattr(self.english_model, 've') and self.english_model.ve is not None:
                        self.english_model.ve = self.english_model.ve.to(device)
                    
                    # Same for multilingual
                    if hasattr(self.multilingual_model, 't3') and self.multilingual_model.t3 is not None:
                        self.multilingual_model.t3 = self.multilingual_model.t3.to(device)
                    if hasattr(self.multilingual_model, 's3gen') and self.multilingual_model.s3gen is not None:
                        self.multilingual_model.s3gen = self.multilingual_model.s3gen.to(device)
                    if hasattr(self.multilingual_model, 've') and self.multilingual_model.ve is not None:
                        self.multilingual_model.ve = self.multilingual_model.ve.to(device)
                    
                    self.english_model.device = device
                    self.multilingual_model.device = device
                    logger.info(f"✅ Models moved to {device}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to move to MPS: {e}")
                    logger.info("🔄 Falling back to CPU mode")
                    # Models are already on CPU, so we're good
            
            self.sr = self.english_model.sr
            self.device = device
            logger.info(f"✅ Models loaded successfully on {device}")
            logger.info(f"📊 Sample rate: {self.sr} Hz")
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise
    
    def synthesize(self, text: str, audio_prompt_path: str = None, 
                   language_id: str = "en", exaggeration: float = 0.5, 
                   cfg_weight: float = 0.5):
        """
        Synthesize speech with zero-shot voice cloning
        
        Args:
            text: Text to synthesize
            audio_prompt_path: Path to reference audio for voice cloning (optional)
            language_id: Language code (en, es, fr, de, it, pt, etc.)
            exaggeration: Emotion intensity (0.0 to 1.0+, default 0.5)
            cfg_weight: Classifier-free guidance weight (0.0 to 1.0, default 0.5)
        
        Returns:
            Audio waveform tensor
        """
        logger.info(f"Synthesizing: '{text[:50]}...' in {language_id}")
        
        try:
            # Use English model for English, multilingual for others
            if language_id == "en":
                wav = self.english_model.generate(
                    text,
                    audio_prompt_path=audio_prompt_path,
                    exaggeration=exaggeration,
                    cfg_weight=cfg_weight
                )
            else:
                wav = self.multilingual_model.generate(
                    text,
                    audio_prompt_path=audio_prompt_path,
                    language_id=language_id,
                    exaggeration=exaggeration,
                    cfg_weight=cfg_weight
                )
            
            logger.info(f"Synthesis complete: {wav.shape}")
            return wav
            
        except Exception as e:
            logger.error(f"Synthesis failed: {e}")
            raise

# Initialize service (lazy loading on first request)
chatterbox = None

def get_chatterbox():
    """Lazy load Chatterbox service"""
    global chatterbox
    if chatterbox is None:
        chatterbox = ChatterboxService()
    return chatterbox

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'chatterbox-opensource',
        'device': device,
        'languages': 23
    })

@app.route('/synthesize', methods=['POST'])
def synthesize():
    """
    Synthesize speech with zero-shot voice cloning
    
    Body (JSON or multipart):
        text: str - Text to synthesize
        language: str - Language code (en, es, fr, de, it, pt, etc.)
        audio_prompt: file (optional) - Reference audio for voice cloning
        exaggeration: float (optional) - Emotion intensity (0.0-1.0+, default 0.5)
        cfg_weight: float (optional) - CFG weight (0.0-1.0, default 0.5)
    """
    try:
        service = get_chatterbox()
        
        # Handle both JSON and multipart requests
        if request.is_json:
            data = request.json
            text = data.get('text')
            language = data.get('language', 'en')
            audio_prompt_path = data.get('audio_prompt_path')
            exaggeration = data.get('exaggeration', 0.5)
            cfg_weight = data.get('cfg_weight', 0.5)
        else:
            text = request.form.get('text')
            language = request.form.get('language', 'en')
            exaggeration = float(request.form.get('exaggeration', 0.5))
            cfg_weight = float(request.form.get('cfg_weight', 0.5))
            
            # Handle audio prompt file
            audio_prompt_path = None
            if 'audio_prompt' in request.files:
                audio_file = request.files['audio_prompt']
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
                    audio_file.save(tmp.name)
                    audio_prompt_path = tmp.name
        
        if not text:
            return jsonify({'error': 'Missing text parameter'}), 400
        
        # Generate audio
        wav = service.synthesize(
            text,
            audio_prompt_path=audio_prompt_path,
            language_id=language,
            exaggeration=exaggeration,
            cfg_weight=cfg_weight
        )
        
        # Save to temp file
        output_path = tempfile.mktemp(suffix='.wav')
        ta.save(output_path, wav, service.sr)
        
        # Clean up temp audio prompt if created
        if audio_prompt_path and os.path.exists(audio_prompt_path):
            os.unlink(audio_prompt_path)
        
        # Calculate duration
        duration = wav.shape[-1] / service.sr
        
        return jsonify({
            'audio_path': output_path,
            'duration': duration,
            'sample_rate': service.sr
        })
    
    except Exception as e:
        logger.error(f"Synthesis error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/synthesize/download', methods=['POST'])
def synthesize_download():
    """Synthesize and return audio file directly"""
    try:
        service = get_chatterbox()
        
        # Get parameters
        text = request.form.get('text')
        language = request.form.get('language', 'en')
        exaggeration = float(request.form.get('exaggeration', 0.5))
        cfg_weight = float(request.form.get('cfg_weight', 0.5))
        
        # Handle audio prompt
        audio_prompt_path = None
        if 'audio_prompt' in request.files:
            audio_file = request.files['audio_prompt']
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
                audio_file.save(tmp.name)
                audio_prompt_path = tmp.name
        
        if not text:
            return jsonify({'error': 'Missing text parameter'}), 400
        
        # Generate audio
        wav = service.synthesize(
            text,
            audio_prompt_path=audio_prompt_path,
            language_id=language,
            exaggeration=exaggeration,
            cfg_weight=cfg_weight
        )
        
        # Save to temp file
        output_path = tempfile.mktemp(suffix='.wav')
        ta.save(output_path, wav, service.sr)
        
        # Clean up
        if audio_prompt_path and os.path.exists(audio_prompt_path):
            os.unlink(audio_prompt_path)
        
        return send_file(output_path, mimetype='audio/wav', as_attachment=True)
    
    except Exception as e:
        logger.error(f"Synthesis error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/languages', methods=['GET'])
def list_languages():
    """List supported languages"""
    languages = {
        'ar': 'Arabic',
        'da': 'Danish',
        'de': 'German',
        'el': 'Greek',
        'en': 'English',
        'es': 'Spanish',
        'fi': 'Finnish',
        'fr': 'French',
        'he': 'Hebrew',
        'hi': 'Hindi',
        'it': 'Italian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ms': 'Malay',
        'nl': 'Dutch',
        'no': 'Norwegian',
        'pl': 'Polish',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'sv': 'Swedish',
        'sw': 'Swahili',
        'tr': 'Turkish',
        'zh': 'Chinese'
    }
    return jsonify({'languages': languages, 'count': len(languages)})

if __name__ == '__main__':
    logger.info("Starting Chatterbox Open Source service on port 5003...")
    logger.info(f"Device: {device}")
    logger.info("Supported languages: 23")
    app.run(host='0.0.0.0', port=5003, debug=False)
