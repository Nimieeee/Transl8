#!/bin/bash

# Start OpenVoice V2 Service

echo "🎤 Starting OpenVoice V2 Service..."
echo ""

# Activate conda environment
eval "$(conda shell.bash hook)"
conda activate openvoice

# Set environment variables
export PORT=8007
export DEVICE=cpu  # Change to 'cuda' if you have GPU

# Start service
python openvoice_service_v2.py
