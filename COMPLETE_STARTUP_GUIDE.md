# Complete Startup Guide - Get Everything Working Now

## Current Situation

✅ **Working**: Backend API, Demucs  
❌ **Not Working**: Whisper, Pyannote, Noisereduce, Emotion, OpenVoice

## Solution: Start Services in Separate Terminals

### Step 1: Install All Dependencies (One Time)

Open a terminal and run:

```bash
pip3 install fastapi uvicorn torch transformers librosa soundfile pydub noisereduce flask requests numpy scipy openai-whisper pyannote.audio
```

This will take a few minutes. Wait for it to complete.

### Step 2: Open 5 Terminal Windows

You need 5 separate terminal windows/tabs. In each one, run one of these commands:

**Terminal 1 - Whisper STT:**
```bash
./start-whisper.sh
```

**Terminal 2 - Pyannote Diarization:**
```bash
./start-pyannote.sh
```

**Terminal 3 - Noisereduce:**
```bash
./start-noisereduce.sh
```

**Terminal 4 - Emotion Analysis:**
```bash
./start-emotion.sh
```

**Terminal 5 - OpenVoice TTS:**
```bash
./start-openvoice.sh
```

### Step 3: Verify All Services Are Running

In a new terminal, run:

```bash
./check-services-status.sh
```

You should see all services with green checkmarks ✓

### Step 4: Run the Complete System Test

```bash
python3 test-robust-pipeline.py
```

## Alternative: Use Screen/Tmux (Advanced)

If you're comfortable with screen or tmux, you can run all services in the background:

```bash
# Using screen
screen -dmS whisper bash -c './start-whisper.sh'
screen -dmS pyannote bash -c './start-pyannote.sh'
screen -dmS noisereduce bash -c './start-noisereduce.sh'
screen -dmS emotion bash -c './start-emotion.sh'
screen -dmS openvoice bash -c './start-openvoice.sh'

# Check status
./check-services-status.sh

# View logs
screen -r whisper  # Ctrl+A, D to detach
```

## Troubleshooting

### "Module not found" errors

Install the specific module:
```bash
pip3 install <module-name>
```

### Port already in use

Kill the process:
```bash
lsof -ti :5001 | xargs kill  # Replace 5001 with the port number
```

### Service crashes immediately

Check the error message in the terminal. Common issues:
- Missing model files (will download on first run)
- Insufficient memory (close other applications)
- Missing dependencies (install with pip3)

## What Each Service Does

- **Whisper (5001)**: Speech-to-text transcription
- **Pyannote (5002)**: Speaker diarization (who spoke when)
- **Demucs (5003)**: Vocal isolation (remove music)
- **Noisereduce (5004)**: Noise reduction
- **Emotion (5007)**: Emotion detection in speech
- **OpenVoice (5008)**: Voice cloning and TTS

## Expected Startup Time

- First time: 5-10 minutes (downloading models)
- Subsequent times: 1-2 minutes

## Memory Requirements

- Minimum: 8GB RAM
- Recommended: 16GB RAM
- With GPU: Much faster processing

## Once Everything is Running

You'll have a complete AI video dubbing pipeline that can:
1. Transcribe speech with speaker identification
2. Remove background music
3. Detect emotions
4. Translate with timing constraints
5. Generate dubbed audio with voice cloning
6. Maintain perfect synchronization

Run the test to see it in action:
```bash
python3 test-robust-pipeline.py
```

## Need Help?

Check the logs in each terminal window to see what's happening. Most issues are related to missing Python packages or model downloads.

Good luck! 🚀
