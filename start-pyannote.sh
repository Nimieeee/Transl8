#!/bin/bash
echo "Starting Pyannote Diarization Service on port 5002..."
cd packages/workers/docker/pyannote
python3 pyannote_service.py
