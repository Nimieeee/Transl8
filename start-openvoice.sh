#!/bin/bash
echo "Starting OpenVoice TTS Service on port 5008..."
cd packages/workers/docker/openvoice
python3 openvoice_service.py
