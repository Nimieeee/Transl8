#!/bin/bash

echo "🎙️  Setting up Chatterbox Open Source by Resemble AI..."
echo "========================================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Create virtual environment for Chatterbox
echo "📦 Creating Python virtual environment..."
cd packages/workers/python
python3 -m venv venv_chatterbox
source venv_chatterbox/bin/activate

# Install dependencies in correct order
echo "📥 Installing dependencies..."
pip install --upgrade pip

echo "📦 Installing numpy and Flask..."
pip install numpy flask

echo "📦 Installing Chatterbox TTS (skipping problematic pkuseg)..."
pip install --no-deps chatterbox-tts

echo "📦 Installing remaining dependencies (this may take a few minutes)..."
pip install librosa transformers diffusers resemble-perth conformer safetensors torch torchaudio s3tokenizer

echo ""
echo "✅ Chatterbox Open Source setup complete!"
echo ""
echo "📋 What you get:"
echo "  ✓ MIT Licensed (completely free!)"
echo "  ✓ 23 languages supported"
echo "  ✓ Zero-shot voice cloning"
echo "  ✓ Emotion control"
echo "  ✓ Self-hosted (no API costs)"
echo "  ✓ Outperforms ElevenLabs"
echo ""
echo "🚀 Start the service:"
echo "   ./START_CHATTERBOX.sh"
echo ""
echo "⚠️  Note: First run will download models (~500MB)"
echo "🎯 Service will run on http://localhost:5003"
echo "💰 Cost: FREE (no API keys needed!)"
