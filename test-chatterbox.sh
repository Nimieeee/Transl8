#!/bin/bash

echo "🧪 Testing Chatterbox Open Source Integration..."
echo "================================================="

# Test health endpoint
echo ""
echo "1️⃣  Testing health endpoint..."
curl -s http://localhost:5003/health | python3 -m json.tool

# Test list languages
echo ""
echo "2️⃣  Listing supported languages..."
curl -s http://localhost:5003/languages | python3 -m json.tool

# Test basic synthesis (English)
echo ""
echo "3️⃣  Testing basic synthesis (English)..."
curl -X POST http://localhost:5003/synthesize \
  -F "text=Hello, this is Chatterbox speaking! This is a test of the open source voice cloning system." \
  -F "language=en" \
  -s | python3 -m json.tool

# Test multilingual synthesis (Spanish)
echo ""
echo "4️⃣  Testing multilingual synthesis (Spanish)..."
curl -X POST http://localhost:5003/synthesize \
  -F "text=Hola, ¿cómo estás? Este es Chatterbox, el sistema de clonación de voz de código abierto." \
  -F "language=es" \
  -s | python3 -m json.tool

echo ""
echo "5️⃣  To test with voice cloning:"
echo 'curl -X POST http://localhost:5003/synthesize \\'
echo '  -F "text=Your text here" \\'
echo '  -F "language=en" \\'
echo '  -F "audio_prompt=@/path/to/reference_voice.wav"'

echo ""
echo "6️⃣  To test with emotion control:"
echo 'curl -X POST http://localhost:5003/synthesize \\'
echo '  -F "text=I am so excited!" \\'
echo '  -F "language=en" \\'
echo '  -F "exaggeration=0.8" \\'
echo '  -F "cfg_weight=0.3"'

echo ""
echo "✅ Basic tests complete!"
echo "💰 Cost: FREE - No API keys needed!"
echo "🌍 Languages: 23 supported"
