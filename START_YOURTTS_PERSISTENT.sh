#!/bin/bash

echo "🎙️ Starting YourTTS with Persistent Model Cache"
echo "=============================================="
echo ""

# Create named volume for model cache (only once)
if ! docker volume ls | grep -q yourtts-models; then
    echo "📦 Creating persistent volume for models..."
    docker volume create yourtts-models
    echo "✅ Volume created"
else
    echo "✅ Using existing model cache volume"
fi

echo ""
echo "🛑 Stopping existing container (if any)..."
docker stop yourtts 2>/dev/null || true
docker rm yourtts 2>/dev/null || true

echo ""
echo "📦 Building YourTTS Docker image..."
docker build -t yourtts-service packages/workers/docker/yourtts

if [ $? -ne 0 ]; then
    echo "❌ Failed to build YourTTS image"
    exit 1
fi

echo ""
echo "✅ Image built successfully"
echo ""
echo "🚀 Starting YourTTS service with persistent cache..."

# Run with volume mount
docker run -d \
    --name yourtts \
    -p 8007:8007 \
    -v yourtts-models:/root/.local/share/tts \
    yourtts-service

if [ $? -ne 0 ]; then
    echo "❌ Failed to start YourTTS service"
    exit 1
fi

echo ""
echo "✅ YourTTS service started"
echo ""
echo "⏳ Waiting for service to be ready..."
echo "   (First time: ~2 minutes to download model)"
echo "   (Subsequent times: ~10 seconds to load from cache)"
echo ""

# Wait for service to be ready
MAX_WAIT=180
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8007/health > /dev/null 2>&1; then
        echo ""
        echo "✅ YourTTS is ready!"
        echo ""
        curl -s http://localhost:8007/health | python3 -m json.tool
        echo ""
        echo "🎉 Service is running with persistent model cache"
        echo ""
        echo "📊 Model cache info:"
        docker exec yourtts du -sh /root/.local/share/tts 2>/dev/null || echo "   Cache warming up..."
        echo ""
        echo "💡 Next rebuild will be instant (model already cached)!"
        exit 0
    fi
    
    echo -ne "\r   Waiting... ${ELAPSED}s"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo "⚠️  Service started but not responding yet"
echo "   Check logs: docker logs yourtts"
echo ""
echo "   Model may still be downloading..."
echo "   Run: docker logs yourtts -f"
