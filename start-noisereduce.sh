#!/bin/bash
echo "Starting Noisereduce Service on port 5004..."
cd packages/workers/docker/noisereduce
python3 noisereduce_service.py
