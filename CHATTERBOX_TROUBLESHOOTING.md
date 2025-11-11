# Chatterbox Troubleshooting Guide

## Installation Issues

### Problem: pkuseg build error - "No module named 'numpy'"

**Error:**
```
ModuleNotFoundError: No module named 'numpy'
ERROR: Failed to build 'pkuseg' when getting requirements to build wheel
```

**Solution:**
Install numpy first, then chatterbox-tts:

```bash
cd packages/workers/python
source venv_chatterbox/bin/activate
pip install numpy
pip install chatterbox-tts
```

Or run the updated setup script:
```bash
./SETUP_CHATTERBOX.sh
```

### Problem: Flask not found

**Error:**
```
ModuleNotFoundError: No module named 'flask'
```

**Solution:**
```bash
cd packages/workers/python
source venv_chatterbox/bin/activate
pip install flask
```

### Problem: Service won't start

**Error:**
```
curl: (7) Failed to connect to localhost port 5003
```

**Solution:**
1. Check if service is running:
```bash
ps aux | grep chatterbox_service
```

2. Start the service:
```bash
./START_CHATTERBOX.sh
```

3. Check for errors in the output

## Runtime Issues

### Problem: Models won't download

**Symptoms:**
- Service starts but synthesis fails
- "Failed to load models" error

**Solution:**
1. Check internet connection
2. Models download from Hugging Face (~500MB)
3. Wait for first download to complete
4. Check disk space (need ~2GB free)

### Problem: Out of memory

**Error:**
```
RuntimeError: [enforce fail at alloc_cpu.cpp:114] data. DefaultCPUAllocator: not enough memory
```

**Solution:**
1. Close other applications
2. Use CPU instead of GPU (automatic fallback)
3. Reduce batch size (handled automatically)
4. Restart the service

### Problem: Slow synthesis

**Symptoms:**
- Takes >30 seconds per sentence
- High CPU usage

**Solution:**
1. First run is slow (model loading)
2. Subsequent runs are faster
3. Use GPU if available (CUDA/MPS)
4. Check system resources

## API Issues

### Problem: 400 Bad Request

**Error:**
```json
{"error": "Missing text parameter"}
```

**Solution:**
Ensure you're sending the required parameters:
```bash
curl -X POST http://localhost:5003/synthesize \
  -F "text=Your text here" \
  -F "language=en"
```

### Problem: 500 Internal Server Error

**Symptoms:**
- Service crashes
- Synthesis fails

**Solution:**
1. Check service logs
2. Verify audio_prompt file exists (if using voice cloning)
3. Check text length (max ~5000 characters)
4. Restart the service

## Voice Cloning Issues

### Problem: Poor voice quality

**Symptoms:**
- Cloned voice doesn't sound like reference
- Robotic or distorted output

**Solution:**
1. Use clean reference audio (no background noise)
2. Use 10+ seconds of reference audio
3. Match reference language to target language
4. Adjust cfg_weight (try 0.3-0.7)
5. Adjust exaggeration (try 0.3-0.7)

### Problem: Wrong accent

**Symptoms:**
- Output has accent from reference audio language

**Solution:**
1. Set cfg_weight to 0.0 for language transfer
2. Use reference audio in target language
3. Adjust exaggeration parameter

## Language Issues

### Problem: Language not supported

**Error:**
```json
{"error": "Language 'xx' not supported"}
```

**Solution:**
Check supported languages:
```bash
curl http://localhost:5003/languages
```

Supported: ar, da, de, el, en, es, fi, fr, he, hi, it, ja, ko, ms, nl, no, pl, pt, ru, sv, sw, tr, zh

### Problem: Poor quality for specific language

**Solution:**
1. Use multilingual model (automatic for non-English)
2. Adjust cfg_weight for that language
3. Use reference audio in that language

## Performance Optimization

### Slow First Run

**Normal behavior:**
- First synthesis: 30-60 seconds (model loading)
- Subsequent: 2-3 seconds per sentence

**To improve:**
1. Models are cached after first load
2. Keep service running
3. Use GPU if available

### Memory Usage

**High memory usage:**
- English model: ~1GB RAM
- Multilingual model: ~1GB RAM
- Total: ~2GB RAM

**To reduce:**
1. Close other applications
2. Use CPU mode
3. Restart service periodically

## Common Fixes

### Quick Reset

```bash
# Stop service
pkill -f chatterbox_service

# Clear cache (optional)
rm -rf ~/.cache/huggingface

# Restart
./START_CHATTERBOX.sh
```

### Reinstall

```bash
# Remove virtual environment
rm -rf packages/workers/python/venv_chatterbox

# Reinstall
./SETUP_CHATTERBOX.sh
```

### Check Installation

```bash
cd packages/workers/python
source venv_chatterbox/bin/activate

# Check packages
pip list | grep chatterbox
pip list | grep flask
pip list | grep torch

# Test import
python -c "from chatterbox.tts import ChatterboxTTS; print('OK')"
```

## Getting Help

### Check Logs

```bash
# Service logs
tail -f packages/workers/python/chatterbox.log

# System logs
dmesg | tail
```

### Debug Mode

Edit `chatterbox_service.py`:
```python
# Change this line:
app.run(host='0.0.0.0', port=5003, debug=False)

# To:
app.run(host='0.0.0.0', port=5003, debug=True)
```

### Test Manually

```python
cd packages/workers/python
source venv_chatterbox/bin/activate
python

>>> from chatterbox.tts import ChatterboxTTS
>>> model = ChatterboxTTS.from_pretrained(device="cpu")
>>> wav = model.generate("Hello world")
>>> print(wav.shape)
```

## Resources

- **GitHub Issues**: https://github.com/resemble-ai/chatterbox/issues
- **Documentation**: `CHATTERBOX_OPENSOURCE.md`
- **Setup Guide**: `SETUP_CHATTERBOX.sh`

## Still Having Issues?

1. Check GitHub issues for similar problems
2. Verify system requirements:
   - Python 3.8+
   - 2GB RAM minimum
   - 2GB disk space
   - Internet connection (first run)

3. Try the fallback (OpenAI TTS):
   - Set `OPENAI_API_KEY` in `.env`
   - System will automatically fallback

4. Report the issue with:
   - Error message
   - System info (OS, Python version)
   - Steps to reproduce
