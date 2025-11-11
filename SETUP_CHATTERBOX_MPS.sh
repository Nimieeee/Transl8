#!/bin/bash

echo "🍎 Setting up Chatterbox with Apple Silicon (MPS) Optimization"
echo "=============================================================="
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  Warning: This script is optimized for macOS with Apple Silicon"
    echo "   It will still work on other systems but without MPS acceleration"
    echo ""
fi

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found"
    echo "   Install Python 3.9+ and try again"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Create virtual environment
echo "📦 Creating virtual environment..."
if [ -d "venv_chatterbox" ]; then
    echo "   Virtual environment already exists, removing..."
    rm -rf venv_chatterbox
fi

python3 -m venv venv_chatterbox
source venv_chatterbox/bin/activate

echo "✅ Virtual environment created"
echo ""

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip setuptools wheel
echo ""

# Install PyTorch with MPS support (for Apple Silicon)
echo "🔥 Installing PyTorch with MPS support..."
pip install torch torchvision torchaudio
echo ""

# Check MPS availability
echo "🔍 Checking MPS (Metal Performance Shaders) support..."
python3 << EOF
import torch
print(f"   MPS Available: {torch.backends.mps.is_available()}")
print(f"   MPS Built: {torch.backends.mps.is_built()}")
if torch.backends.mps.is_available():
    print("   ✅ Apple Silicon GPU acceleration is ready!")
else:
    print("   ⚠️  MPS not available, will use CPU")
EOF
echo ""

# Install Apple Silicon optimized Chatterbox
echo "🍎 Installing Chatterbox with Apple Silicon optimization..."
echo "   Source: Jimmi42/chatterbox-tts-apple-silicon"
pip install git+https://huggingface.co/Jimmi42/chatterbox-tts-apple-silicon
echo ""

# Install Flask and other dependencies
echo "📦 Installing Flask and dependencies..."
pip install flask requests
echo ""

# Test installation
echo "🧪 Testing Chatterbox installation..."
python3 << EOF
try:
    from chatterbox_tts_apple_silicon.tts import ChatterboxTTS
    print("   ✅ Apple Silicon version imported successfully!")
    
    import torch
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"   📱 Will use device: {device}")
    
except ImportError as e:
    print(f"   ⚠️  Apple Silicon version not available: {e}")
    print("   Trying standard version...")
    try:
        from chatterbox.tts import ChatterboxTTS
        print("   ✅ Standard version imported successfully!")
    except ImportError as e2:
        print(f"   ❌ Failed to import Chatterbox: {e2}")
        exit(1)
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================================="
    echo "✅ Chatterbox with Apple Silicon optimization is ready!"
    echo "=============================================================="
    echo ""
    echo "Next steps:"
    echo "1. Start the service: ./START_CHATTERBOX.sh"
    echo "2. Test it: ./test-chatterbox.sh"
    echo "3. Integrate into pipeline (see CHATTERBOX_MPS_INTEGRATION.md)"
    echo ""
    echo "Features:"
    echo "  🚀 Apple Silicon GPU acceleration (MPS)"
    echo "  🎤 Zero-shot voice cloning"
    echo "  🌍 23 languages supported"
    echo "  😊 Emotion control"
    echo "  💰 Free (self-hosted)"
    echo ""
else
    echo ""
    echo "❌ Setup failed. Check the errors above."
    exit 1
fi
