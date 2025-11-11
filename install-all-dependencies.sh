#!/bin/bash

# Install all required Python dependencies for all services

echo "=========================================="
echo "Installing All Python Dependencies"
echo "=========================================="
echo ""

# Core dependencies
echo "Installing core dependencies..."
pip3 install --upgrade pip

# FastAPI and web framework dependencies
echo "Installing FastAPI and web dependencies..."
pip3 install fastapi uvicorn python-multipart

# Audio processing
echo "Installing audio processing libraries..."
pip3 install librosa soundfile pydub noisereduce

# Machine learning and AI
echo "Installing ML/AI libraries..."
pip3 install torch transformers

# Whisper and speech processing
echo "Installing speech processing libraries..."
pip3 install openai-whisper pyannote.audio

# Additional utilities
echo "Installing additional utilities..."
pip3 install flask requests numpy scipy

# Demucs for vocal isolation
echo "Installing Demucs..."
pip3 install demucs

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Now you can start the services:"
echo "  ./start-whisper.sh"
echo "  ./start-pyannote.sh"
echo "  ./start-noisereduce.sh"
echo "  ./start-emotion.sh"
echo "  ./start-openvoice.sh"
