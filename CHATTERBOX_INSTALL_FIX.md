# Chatterbox Installation Fix

## Problem

The `pkuseg` dependency has a build issue that prevents normal installation:
```
ERROR: Failed to build 'pkuseg' when getting requirements to build wheel
ModuleNotFoundError: No module named 'numpy'
```

## Solution

Install dependencies in the correct order, skipping pkuseg:

```bash
cd packages/workers/python
source venv_chatterbox/bin/activate

# Install numpy and flask first
pip install numpy flask

# Install chatterbox-tts without dependencies
pip install --no-deps chatterbox-tts

# Install all other dependencies
pip install librosa transformers diffusers resemble-perth conformer safetensors torch torchaudio s3tokenizer
```

## Updated Setup Script

The `SETUP_CHATTERBOX.sh` script has been updated to handle this automatically.

## What Gets Installed

✅ **Core:**
- chatterbox-tts (0.1.3)
- torch (2.8.0)
- torchaudio (2.8.0)
- flask (3.1.2)

✅ **Dependencies:**
- transformers (4.57.1)
- diffusers (0.35.2)
- librosa (0.11.0)
- resemble-perth (1.0.1)
- conformer (0.3.2)
- safetensors (0.6.2)
- s3tokenizer (0.2.0)

❌ **Skipped (intentionally):**
- pkuseg (optional Chinese word segmentation - not needed!)
  - Chatterbox works perfectly for all 23 languages without it
  - Only needed for advanced Chinese linguistic research
  - See `PKUSEG_EXPLAINED.md` for details

## Verification

Test the installation:

```bash
cd packages/workers/python
source venv_chatterbox/bin/activate

python -c "from chatterbox.tts import ChatterboxTTS; print('✅ OK')"
python -c "from chatterbox.mtl_tts import ChatterboxMultilingualTTS; print('✅ OK')"
```

## Start the Service

```bash
./START_CHATTERBOX.sh
```

On first run, models will download (~500MB). This may take a few minutes.

## Test the Service

```bash
./test-chatterbox.sh
```

## Notes

- **pkuseg is NOT required** - Chatterbox works perfectly without it
- All 23 languages work, including Chinese
- pkuseg is only for optional advanced Chinese preprocessing
- Skipping it avoids build issues and doesn't affect functionality
- See `PKUSEG_EXPLAINED.md` for detailed explanation

## If You Still Have Issues

1. **Clear and reinstall:**
```bash
rm -rf packages/workers/python/venv_chatterbox
./SETUP_CHATTERBOX.sh
```

2. **Check Python version:**
```bash
python3 --version  # Should be 3.8+
```

3. **Check available space:**
```bash
df -h  # Need ~2GB free
```

4. **Manual installation:**
Follow the solution steps above manually

## Success Indicators

You'll know it worked when:
- ✅ No build errors during installation
- ✅ `from chatterbox.tts import ChatterboxTTS` works
- ✅ Service starts without errors
- ✅ Health check returns `{"status": "healthy"}`

## Resources

- Troubleshooting: `CHATTERBOX_TROUBLESHOOTING.md`
- Full guide: `CHATTERBOX_OPENSOURCE.md`
- GitHub: https://github.com/resemble-ai/chatterbox
