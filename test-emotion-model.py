#!/usr/bin/env python3
"""
Test and download emotion recognition model
"""

import os
import sys

print("🧪 Testing Emotion Recognition Model")
print("=" * 50)
print()

# Set cache directory
cache_dir = os.path.expanduser("~/.cache/huggingface")
os.makedirs(cache_dir, exist_ok=True)

print(f"📁 Cache directory: {cache_dir}")
print()

model_name = "superb/wav2vec2-base-superb-er"  # Alternative emotion recognition model

print(f"📥 Downloading model: {model_name}")
print("   (This may take a few minutes on first run)")
print()

try:
    from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2Processor
    import torch
    
    print("✅ Imports successful")
    print()
    
    # Try to load processor
    print("Loading processor...")
    processor = Wav2Vec2Processor.from_pretrained(model_name)
    print("✅ Processor loaded")
    print()
    
    # Try to load model
    print("Loading model...")
    model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name)
    print("✅ Model loaded")
    print()
    
    # Test device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"🖥️  Device: {device}")
    print()
    
    model.to(device)
    model.eval()
    
    print("=" * 50)
    print("✅ SUCCESS! Model is ready to use")
    print()
    print("You can now start the emotion service:")
    print("  ./start-emotion-service.sh")
    print()
    
    sys.exit(0)
    
except Exception as e:
    print("=" * 50)
    print(f"❌ ERROR: {e}")
    print()
    print("Troubleshooting:")
    print("1. Check internet connection")
    print("2. Try: pip3 install --upgrade transformers torch")
    print("3. Clear cache: rm -rf ~/.cache/huggingface")
    print()
    sys.exit(1)
