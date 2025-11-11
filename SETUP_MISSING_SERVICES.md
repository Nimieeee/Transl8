# Setup Missing Services

## Quick Fix Guide

### 1. Emotion Analysis Service (Port 8010)

The emotion service uses the **superb/wav2vec2-base-superb-er** model from HuggingFace.
This is a production-ready model that detects 4 emotions: neutral, happy, sad, angry.

**Quick Start:**
```bash
./start-emotion-service.sh
```

**Or use the pipeline script:**
```bash
./start-pipeline-services.sh
```

**Manual Start:**
```bash
cd packages/workers/docker/emotion
pip3 install torch torchaudio transformers librosa soundfile flask numpy
python3 emotion_service.py
```

**Test the service:**
```bash
python3 test-emotion-service.py
```

---

### 2. OpenVoice Service (Port 8007)

OpenVoice requires installation and model checkpoints. Follow these steps:

#### Option A: Quick Setup (Recommended)

Run the automated setup script:
```bash
./setup-openvoice.sh
```

#### Option B: Manual Setup

**Step 1: Install OpenVoice**
```bash
cd packages/workers/docker/openvoice

# Create conda environment
conda create -n openvoice python=3.9 -y
conda activate openvoice

# Clone OpenVoice repository
git clone https://github.com/myshell-ai/OpenVoice.git
cd OpenVoice
pip install -e .
cd ..
```

**Step 2: Download Model Checkpoints**

Choose V1 or V2 (V2 recommended for more languages):

**For V2 (Recommended):**
```bash
# Download checkpoints
wget https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_v2_0417.zip
unzip checkpoints_v2_0417.zip -d checkpoints_v2
rm checkpoints_v2_0417.zip

# Install MeloTTS
pip install git+https://github.com/myshell-ai/MeloTTS.git
python -m unidic download
```

**For V1:**
```bash
# Download checkpoints
wget https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_1226.zip
unzip checkpoints_1226.zip -d checkpoints
rm checkpoints_1226.zip
```

**Step 3: Update Service Configuration**

The service needs to be updated to use the installed OpenVoice. See `openvoice_service_fixed.py` for the corrected implementation.

**Step 4: Start the Service**
```bash
# From the openvoice directory
python openvoice_service.py
```

Or use the pipeline script:
```bash
# From project root
./start-pipeline-services.sh
```

---

## Verification

After setup, verify all services are running:

```bash
# Check service status
curl http://localhost:8010/health  # Emotion Analysis
curl http://localhost:8007/health  # OpenVoice
curl http://localhost:8008/health  # Demucs
curl http://localhost:8009/health  # Noisereduce
```

All should return `{"status": "healthy"}`.

---

## Troubleshooting

### Emotion Service Issues

**Port already in use:**
```bash
lsof -ti:8010 | xargs kill -9
```

**Model download fails:**
The model will auto-download on first run. Ensure you have internet access.

### OpenVoice Issues

**Import errors:**
```bash
# Ensure OpenVoice is installed
pip install -e OpenVoice/
```

**Missing checkpoints:**
```bash
# Verify checkpoints exist
ls -la checkpoints_v2/
# Should show: base_speakers/, converter/
```

**CUDA out of memory:**
```bash
# Use CPU instead
export DEVICE=cpu
python openvoice_service.py
```

---

## Next Steps

Once both services are running:

1. Test the full pipeline:
   ```bash
   ./run-pipeline-cli.sh test-video.mov
   ```

2. Check logs if issues occur:
   ```bash
   tail -f /tmp/emotion.log
   tail -f /tmp/openvoice.log
   ```

3. Stop services when done:
   ```bash
   ./stop-pipeline-services.sh
   ```
