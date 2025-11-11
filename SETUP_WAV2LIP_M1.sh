#!/bin/bash

echo "🎬 Setting up Wav2Lip for M1 Mac"
echo "================================"
echo ""

# Check if we're on M1
if [[ $(uname -m) != "arm64" ]]; then
    echo "⚠️  Warning: Not running on M1/ARM64 architecture"
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install torch torchvision torchaudio
pip3 install opencv-python librosa numpy scipy tqdm flask

# Clone Wav2Lip
if [ ! -d "Wav2Lip" ]; then
    echo "📥 Cloning Wav2Lip repository..."
    git clone https://github.com/Rudrabha/Wav2Lip.git
else
    echo "✅ Wav2Lip already cloned"
fi

cd Wav2Lip

# Create checkpoints directory
mkdir -p checkpoints

# Download pretrained model
if [ ! -f "checkpoints/wav2lip_gan.pth" ]; then
    echo "📥 Downloading Wav2Lip GAN model..."
    curl -L 'https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/Eb3LEzbfuKlJiR600lQWRxgBIY27JZg80f7V9jtMfbNDaQ?download=1' -o 'checkpoints/wav2lip_gan.pth'
else
    echo "✅ Model already downloaded"
fi

# Download face detection model
if [ ! -d "face_detection/detection/sfd" ]; then
    echo "📥 Downloading face detection model..."
    mkdir -p face_detection/detection/sfd
    curl -L 'https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth' -o 'face_detection/detection/sfd/s3fd.pth'
else
    echo "✅ Face detection model already downloaded"
fi

cd ..

echo ""
echo "✅ Wav2Lip setup complete!"
echo ""
echo "Next steps:"
echo "1. Start Wav2Lip service: python3 Wav2Lip/wav2lip_service.py"
echo "2. Test with your video: ./test-my-video.sh"
