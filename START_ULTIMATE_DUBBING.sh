#!/bin/bash

echo "🚀 Starting Ultimate AI Dubbing Services"
echo "======================================="
echo ""

# Start XTTS v2 service
echo "🗣️  Starting XTTS v2 Voice Cloning Service..."
python3 packages/workers/python/xtts_service.py &
XTTS_PID=$!

# Start DTW alignment service
echo "⏱️  Starting DTW Alignment Service..."
python3 packages/workers/python/dtw_service.py &
DTW_PID=$!

# Start Wav2Lip service
echo "👄 Starting Wav2Lip Lip-Sync Service..."
cd Wav2Lip
python3 wav2lip_service.py &
WAV2LIP_PID=$!
cd ..

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check services
echo "🔍 Checking service health..."
curl -s http://localhost:8009/health || echo "❌ XTTS service not responding"
curl -s http://localhost:8010/health || echo "❌ DTW service not responding"
curl -s http://localhost:8008/health || echo "❌ Wav2Lip service not responding"

echo ""
echo "✅ Ultimate AI Dubbing Services Started!"
echo ""
echo "Services running:"
echo "🗣️  XTTS v2 Voice Cloning: http://localhost:8009"
echo "⏱️  DTW Alignment: http://localhost:8010"
echo "👄 Wav2Lip Lip-Sync: http://localhost:8008"
echo ""
echo "Test with: ./test-ultimate-dubbing.sh"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '\n🛑 Stopping services...'; kill $XTTS_PID $DTW_PID $WAV2LIP_PID; exit" INT
wait
