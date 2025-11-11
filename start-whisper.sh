#!/bin/bash
echo "Starting Whisper STT Service on port 5001..."
cd packages/workers/docker/whisper
python3 whisper_service.py
