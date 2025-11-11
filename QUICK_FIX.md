# Quick Fix - Install Missing Dependency

## The Error You're Seeing

```
RuntimeError: Form data requires "python-multipart" to be installed.
```

## Quick Fix (Run This Now)

```bash
pip3 install python-multipart
```

Then restart the Whisper service:
```bash
./start-whisper.sh
```

## Install ALL Dependencies at Once

To avoid future "module not found" errors, run:

```bash
./install-all-dependencies.sh
```

Or manually:
```bash
pip3 install fastapi uvicorn python-multipart torch transformers librosa soundfile pydub noisereduce flask requests numpy scipy openai-whisper pyannote.audio demucs
```

## After Installing

Start all services in separate terminals:

```bash
# Terminal 1
./start-whisper.sh

# Terminal 2
./start-pyannote.sh

# Terminal 3
./start-noisereduce.sh

# Terminal 4
./start-emotion.sh

# Terminal 5
./start-openvoice.sh
```

## Check Status

```bash
./check-services-status.sh
```

## Run Test

```bash
python3 test-robust-pipeline.py
```

That's it! 🚀
