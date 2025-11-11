#!/bin/bash
echo "Starting Emotion Analysis Service on port 5007..."
cd packages/workers/docker/emotion
python3 emotion_service.py
