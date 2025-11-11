"""
Emotion Analysis Service - Speech Emotion Recognition using Wav2Vec2

This service provides emotion detection for audio segments using the
superb/wav2vec2-base-superb-er model from HuggingFace.

Emotion categories: neutral, happy, sad, angry

Requirements: 17.1, 17.2
"""

import os
import logging
import time
from typing import Dict, List, Any
from flask import Flask, request, jsonify
import torch
import torchaudio
import librosa
import numpy as np
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Emotion taxonomy mapping for superb/wav2vec2-base-superb-er
# This model outputs 4 emotions
EMOTION_LABELS = {
    0: 'neutral',
    1: 'happy',
    2: 'sad',
    3: 'angry'
}

# Global model and feature extractor
model = None
feature_extractor = None
device = None


def load_model():
    """Load the wav2vec2 emotion recognition model"""
    global model, feature_extractor, device
    
    try:
        model_name = os.getenv('MODEL_NAME', 'superb/wav2vec2-base-superb-er')
        device_type = os.getenv('DEVICE', 'cpu')
        
        logger.info(f"Loading emotion recognition model: {model_name}")
        
        # Set device
        device = torch.device(device_type if torch.cuda.is_available() and device_type == 'cuda' else 'cpu')
        logger.info(f"Using device: {device}")
        
        # Load feature extractor and model
        feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
        model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name)
        model.to(device)
        model.eval()
        
        logger.info(f"Emotion recognition model loaded successfully")
        logger.info(f"Model supports {model.config.num_labels} emotion classes")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


def preprocess_audio(audio_path: str, target_sr: int = 16000) -> np.ndarray:
    """
    Load and preprocess audio file
    
    Args:
        audio_path: Path to audio file
        target_sr: Target sample rate (default 16kHz for wav2vec2)
    
    Returns:
        Audio waveform as numpy array
    """
    try:
        # Load audio with librosa
        audio, sr = librosa.load(audio_path, sr=target_sr, mono=True)
        
        # Normalize audio
        audio = audio / np.max(np.abs(audio) + 1e-8)
        
        return audio
        
    except Exception as e:
        logger.error(f"Audio preprocessing error: {e}")
        raise


def analyze_emotion(audio_path: str) -> Dict[str, Any]:
    """
    Analyze emotion in audio segment
    
    Args:
        audio_path: Path to audio file
    
    Returns:
        Dictionary with emotion, confidence, and scores
    """
    try:
        start_time = time.time()
        
        # Preprocess audio
        audio = preprocess_audio(audio_path)
        
        # Process with feature extractor
        inputs = feature_extractor(
            audio,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True
        )
        
        # Move to device
        input_values = inputs.input_values.to(device)
        
        # Run inference
        with torch.no_grad():
            outputs = model(input_values)
            logits = outputs.logits
        
        # Get probabilities
        probs = torch.nn.functional.softmax(logits, dim=-1)
        probs_np = probs.cpu().numpy()[0]
        
        # Get predicted emotion
        predicted_idx = np.argmax(probs_np)
        predicted_emotion = EMOTION_LABELS.get(predicted_idx, 'neutral')
        confidence = float(probs_np[predicted_idx])
        
        # Build scores dictionary
        scores = {
            EMOTION_LABELS.get(i, f'emotion_{i}'): float(probs_np[i])
            for i in range(len(probs_np))
        }
        
        processing_time = (time.time() - start_time) * 1000  # milliseconds
        
        logger.info(f"Emotion detected: {predicted_emotion} (confidence: {confidence:.3f})")
        
        return {
            'emotion': predicted_emotion,
            'confidence': confidence,
            'scores': scores,
            'processing_time_ms': processing_time
        }
        
    except Exception as e:
        logger.error(f"Emotion analysis error: {e}")
        raise


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        if model is None or feature_extractor is None:
            return jsonify({
                'status': 'unhealthy',
                'error': 'Model not loaded'
            }), 503
        
        return jsonify({
            'status': 'healthy',
            'model': 'superb/wav2vec2-base-superb-er',
            'device': str(device),
            'emotions': list(EMOTION_LABELS.values())
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze emotion in audio file
    
    Request JSON:
    {
        "audio_path": "/path/to/audio.wav"
    }
    
    Response JSON:
    {
        "emotion": "happy",
        "confidence": 0.85,
        "scores": {
            "neutral": 0.05,
            "happy": 0.85,
            "sad": 0.02,
            ...
        },
        "processing_time_ms": 150
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'audio_path' not in data:
            return jsonify({
                'error': 'Missing audio_path in request'
            }), 400
        
        audio_path = data['audio_path']
        
        if not os.path.exists(audio_path):
            return jsonify({
                'error': f'Audio file not found: {audio_path}'
            }), 404
        
        # Analyze emotion
        result = analyze_emotion(audio_path)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Analysis request error: {e}")
        return jsonify({
            'error': str(e)
        }), 500


@app.route('/analyze_batch', methods=['POST'])
def analyze_batch():
    """
    Analyze emotions for multiple audio files
    
    Request JSON:
    {
        "audio_paths": ["/path/to/audio1.wav", "/path/to/audio2.wav"]
    }
    
    Response JSON:
    {
        "results": [
            {"emotion": "happy", "confidence": 0.85, ...},
            {"emotion": "sad", "confidence": 0.72, ...}
        ],
        "total_processing_time_ms": 300
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'audio_paths' not in data:
            return jsonify({
                'error': 'Missing audio_paths in request'
            }), 400
        
        audio_paths = data['audio_paths']
        
        if not isinstance(audio_paths, list):
            return jsonify({
                'error': 'audio_paths must be a list'
            }), 400
        
        start_time = time.time()
        results = []
        
        for audio_path in audio_paths:
            if not os.path.exists(audio_path):
                results.append({
                    'error': f'File not found: {audio_path}',
                    'emotion': 'neutral',
                    'confidence': 0.0
                })
                continue
            
            try:
                result = analyze_emotion(audio_path)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to analyze {audio_path}: {e}")
                results.append({
                    'error': str(e),
                    'emotion': 'neutral',
                    'confidence': 0.0
                })
        
        total_time = (time.time() - start_time) * 1000
        
        return jsonify({
            'results': results,
            'total_processing_time_ms': total_time,
            'processed_count': len(results)
        }), 200
        
    except Exception as e:
        logger.error(f"Batch analysis request error: {e}")
        return jsonify({
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # Load model on startup
    load_model()
    
    # Run Flask app
    port = int(os.getenv('PORT', 8010))
    app.run(host='0.0.0.0', port=port, debug=False)
