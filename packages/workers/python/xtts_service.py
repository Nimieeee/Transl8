from flask import Flask, request, send_file
from TTS.api import TTS
import torch
import tempfile
import os

app = Flask(__name__)

# Initialize XTTS v2 with M1 GPU support
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"🎯 Using device: {device}")

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'healthy', 'model': 'XTTS v2', 'device': str(device)}

@app.route('/clone', methods=['POST'])
def clone_voice():
    text = request.form['text']
    language = request.form['language']
    speaker_wav = request.files['speaker_wav']
    
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        speaker_wav.save(f.name)
        speaker_path = f.name
    
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        output_path = f.name
    
    try:
        tts.tts_to_file(
            text=text,
            speaker_wav=speaker_path,
            language=language,
            file_path=output_path
        )
        
        os.unlink(speaker_path)
        return send_file(output_path, mimetype='audio/wav')
    except Exception as e:
        os.unlink(speaker_path)
        return {'error': str(e)}, 500

if __name__ == '__main__':
    print("🗣️  XTTS v2 Voice Cloning Service")
    print("==================================")
    print(f"Device: {device}")
    print("Listening on http://localhost:8009")
    app.run(host='0.0.0.0', port=8009, debug=False)
