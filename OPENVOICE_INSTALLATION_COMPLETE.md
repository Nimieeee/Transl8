# OpenVoice Installation Complete ✅

## Installation Summary

OpenVoice V2 has been successfully installed with the following components:

### ✅ Installed Components

1. **Conda Environment**: `openvoice` (Python 3.9)
2. **OpenVoice Repository**: Cloned from GitHub
3. **Model Checkpoints**: V2 checkpoints downloaded (122MB)
4. **MeloTTS**: Installed for multi-language support
5. **UniDic Dictionary**: Downloaded for Japanese support
6. **Dependencies**: All required Python packages installed

### 🌍 Supported Languages

- English (EN)
- Spanish (ES)
- French (FR)
- Chinese (ZH)
- Japanese (JP)
- Korean (KR)

### 📁 Installation Location

```
packages/workers/docker/openvoice/
├── OpenVoice/              # OpenVoice source code
├── checkpoints_v2/         # Model checkpoints
│   ├── base_speakers/      # Base speaker embeddings
│   └── converter/          # Tone color converter
├── temp/                   # Temporary audio files
├── openvoice_service_v2.py # Service implementation
└── start-openvoice.sh      # Startup script
```

## 🚀 Starting the Service

### Option 1: Manual Start (Recommended for first time)

```bash
cd packages/workers/docker/openvoice
./start-openvoice.sh
```

### Option 2: Using Pipeline Script

```bash
# Start all services including OpenVoice
./start-pipeline-services.sh

# Then manually start OpenVoice in a separate terminal:
cd packages/workers/docker/openvoice && ./start-openvoice.sh
```

## 🧪 Testing the Service

Once the service is running on port 8007:

### Health Check
```bash
curl http://localhost:8007/health
```

Expected response:
```json
{
  "status": "healthy",
  "device": "cpu",
  "version": "v2",
  "languages": ["EN", "ES", "FR", "ZH", "JP", "KR"],
  "models_loaded": true
}
```

### List Supported Languages
```bash
curl http://localhost:8007/languages
```

### Simple Synthesis
```bash
curl -X POST http://localhost:8007/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of OpenVoice",
    "language": "en",
    "speed": 1.0
  }' \
  --output test_output.wav
```

### Voice Cloning Synthesis
```bash
curl -X POST http://localhost:8007/synthesize-with-voice \
  -F "text=Hello world" \
  -F "language=en" \
  -F "reference_audio=@path/to/reference.wav" \
  --output cloned_output.wav
```

## 🔧 Service Configuration

### Environment Variables

- `PORT`: Service port (default: 8007)
- `DEVICE`: Computation device ('cpu' or 'cuda')

### Changing Device to GPU

If you have a CUDA-compatible GPU:

```bash
# Edit start-openvoice.sh
export DEVICE=cuda
```

## 📊 Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/languages` | GET | List supported languages |
| `/synthesize` | POST | Basic text-to-speech |
| `/synthesize-with-voice` | POST | TTS with voice cloning |

## 🐛 Troubleshooting

### Service won't start

**Check conda environment:**
```bash
conda env list | grep openvoice
```

**Activate environment manually:**
```bash
eval "$(conda shell.bash hook)"
conda activate openvoice
python packages/workers/docker/openvoice/openvoice_service_v2.py
```

### Import errors

**Reinstall OpenVoice:**
```bash
conda activate openvoice
pip install --no-deps -e packages/workers/docker/openvoice/OpenVoice
```

### Missing checkpoints

**Verify checkpoints exist:**
```bash
ls -la packages/workers/docker/openvoice/checkpoints_v2/
```

Should show:
- `base_speakers/`
- `converter/`

### Port already in use

**Kill existing process:**
```bash
lsof -ti:8007 | xargs kill -9
```

### Memory issues

OpenVoice V2 requires approximately:
- **CPU**: 2-4GB RAM
- **GPU**: 2-4GB VRAM

If running out of memory, close other applications or use CPU mode.

## 🔄 Integration with Pipeline

The OpenVoice adapter is already configured in your backend:

```typescript
// packages/backend/src/adapters/openvoice-adapter.ts
const response = await axios.post('http://localhost:8007/synthesize', {
  text: segment.text,
  language: targetLanguage,
  speed: 1.0
});
```

## 📝 Next Steps

1. **Start the service** using one of the methods above
2. **Test the endpoints** to verify functionality
3. **Run the full pipeline** to test integration:
   ```bash
   ./run-pipeline-cli.sh test-video.mov
   ```

## 🎯 Emotion Analysis Service

The emotion analysis service has also been fixed:

- **Port**: 8010 (corrected from 5007)
- **Status**: Ready to use
- **Start**: Included in `./start-pipeline-services.sh`

## ✅ All Services Status

| Service | Port | Status |
|---------|------|--------|
| Demucs | 8008 | ✅ Ready |
| Noisereduce | 8009 | ✅ Ready |
| Emotion Analysis | 8010 | ✅ Ready (port fixed) |
| OpenVoice V2 | 8007 | ✅ Installed |

## 📚 Additional Resources

- [OpenVoice GitHub](https://github.com/myshell-ai/OpenVoice)
- [MeloTTS Documentation](https://github.com/myshell-ai/MeloTTS)
- [OpenVoice Paper](https://arxiv.org/abs/2312.01479)

---

**Installation completed successfully!** 🎉

Start the service and begin testing your AI video dubbing pipeline.
