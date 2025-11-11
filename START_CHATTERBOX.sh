#!/bin/bash

echo "🎙️  Starting Chatterbox Open Source Service..."
echo "=============================================="

cd packages/workers/python

# Activate virtual environment
if [ -d "venv_chatterbox" ]; then
    source venv_chatterbox/bin/activate
else
    echo "❌ Virtual environment not found. Run SETUP_CHATTERBOX.sh first"
    exit 1
fi

echo "📦 Loading models (this may take a moment on first run)..."
echo "✅ Starting Chatterbox on port 5003..."
echo "💰 Cost: FREE - No API keys needed!"
echo "🌍 Languages: 23 supported"
echo ""
python chatterbox_service.py
