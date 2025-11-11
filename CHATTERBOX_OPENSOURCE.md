# 🎉 Chatterbox Open Source - FREE Voice Cloning!

## Amazing News!

Chatterbox by Resemble AI is **completely open source** and **MIT licensed**! No API keys, no costs, just incredible voice cloning technology.

## What You Get (FREE!)

✅ **MIT Licensed** - Use it anywhere, commercially too  
✅ **23 Languages** - Multilingual support out of the box  
✅ **Zero-shot Voice Cloning** - No training needed  
✅ **Emotion Control** - Exaggeration/intensity settings  
✅ **Self-hosted** - Complete privacy and control  
✅ **Outperforms ElevenLabs** - Better quality in benchmarks  
✅ **0.5B Parameters** - Efficient model size  
✅ **Watermarked Outputs** - Built-in Perth watermarking  

## Supported Languages (23)

Arabic (ar) • Danish (da) • German (de) • Greek (el) • English (en) • Spanish (es) • Finnish (fi) • French (fr) • Hebrew (he) • Hindi (hi) • Italian (it) • Japanese (ja) • Korean (ko) • Malay (ms) • Dutch (nl) • Norwegian (no) • Polish (pl) • Portuguese (pt) • Russian (ru) • Swedish (sv) • Swahili (sw) • Turkish (tr) • Chinese (zh)

## Quick Setup (5 Minutes)

### 1. Install Dependencies
```bash
./SETUP_CHATTERBOX.sh
```

This installs:
- `chatterbox-tts` (the open source model)
- Flask (for the API service)
- PyTorch & torchaudio

### 2. Start the Service
```bash
./START_CHATTERBOX.sh
```

Models will download automatically on first run (~500MB).

### 3. Test It
```bash
./test-chatterbox.sh
```

## Usage

### Basic Synthesis (English)
```bash
curl -X POST http://localhost:5003/synthesize \
  -F "text=Hello, this is Chatterbox speaking!" \
  -F "language=en"
```

### With Voice Cloning
```bash
curl -X POST http://localhost:5003/synthesize \
  -F "text=Hola, ¿cómo estás?" \
  -F "language=es" \
  -F "audio_prompt=@reference_voice.wav"
```

### With Emotion Control
```bash
curl -X POST http://localhost:5003/synthesize \
  -F "text=I'm so excited about this!" \
  -F "language=en" \
  -F "exaggeration=0.8" \
  -F "cfg_weight=0.3"
```

## Parameters

### Required
- `text` - Text to synthesize
- `language` - Language code (en, es, fr, de, etc.)

### Optional
- `audio_prompt` - Reference audio file for voice cloning
- `exaggeration` - Emotion intensity (0.0-1.0+, default 0.5)
- `cfg_weight` - CFG weight (0.0-1.0, default 0.5)

## Tips for Best Results

### General Use
- Default settings (exaggeration=0.5, cfg_weight=0.5) work well
- Match reference audio language to target language
- For fast speakers, lower cfg_weight to ~0.3

### Expressive Speech
- Lower cfg_weight (~0.3)
- Increase exaggeration (~0.7 or higher)
- Higher exaggeration speeds up speech

### Voice Cloning
- Use 10+ seconds of clean audio
- Avoid background noise
- Supported formats: WAV, MP3, FLAC

## API Endpoints

### Health Check
```bash
GET /health
```

### Synthesize Speech
```bash
POST /synthesize
- text: string (required)
- language: string (required)
- audio_prompt: file (optional)
- exaggeration: float (optional, default 0.5)
- cfg_weight: float (optional, default 0.5)
```

### List Languages
```bash
GET /languages
```

## Comparison

| Feature | Chatterbox OS | ElevenLabs | OpenAI TTS |
|---------|--------------|------------|------------|
| Cost | **FREE** | $0.30/1K chars | $0.015/1K chars |
| Voice Cloning | ✅ | ✅ | ❌ |
| Languages | 23 | 29 | 50+ |
| Self-hosted | ✅ | ❌ | ❌ |
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Emotion Control | ✅ | ✅ | ❌ |
| License | MIT | Proprietary | Proprietary |

## Performance

### Model Size
- English model: ~250MB
- Multilingual model: ~250MB
- Total: ~500MB

### Speed (on M1 Mac)
- First load: ~30 seconds (model loading)
- Synthesis: ~2-3 seconds per sentence
- Voice cloning: Instant (zero-shot)

### GPU Support
- CUDA (NVIDIA)
- MPS (Apple Silicon)
- CPU fallback

## Integration with Dubbing Pipeline

The dubbing worker automatically uses Chatterbox:

```typescript
// Priority order:
1. Chatterbox (FREE, voice cloning) ← You are here!
2. OpenAI TTS (paid, no voice cloning)
3. XTTS v2 (self-hosted fallback)
4. YourTTS (self-hosted fallback)
5. gTTS (basic fallback)
```

## Why Open Source is Better

### vs Resemble AI API
- ✅ **FREE** (vs $0.006/second)
- ✅ **No API limits**
- ✅ **Complete privacy**
- ✅ **No internet required**
- ✅ **Same quality**

### vs XTTS v2
- ✅ **Easier setup** (5 min vs 30+ min)
- ✅ **Better quality**
- ✅ **More languages** (23 vs 16)
- ✅ **Emotion control**
- ✅ **No dependency issues**

### vs ElevenLabs
- ✅ **FREE** (vs $0.30/1K chars)
- ✅ **Self-hosted**
- ✅ **MIT licensed**
- ✅ **Comparable quality**

## Watermarking

Every audio file includes Perth watermarking:
- Imperceptible to humans
- Survives MP3 compression
- Survives audio editing
- ~100% detection accuracy

Extract watermark:
```python
import perth
import librosa

audio, sr = librosa.load("output.wav", sr=None)
watermarker = perth.PerthImplicitWatermarker()
watermark = watermarker.get_watermark(audio, sample_rate=sr)
print(f"Watermark: {watermark}")  # 0.0 or 1.0
```

## Troubleshooting

### Models won't download
- Check internet connection
- Models download from Hugging Face
- Total size: ~500MB

### Out of memory
- Use CPU instead of GPU
- Reduce batch size
- Close other applications

### Poor quality
- Adjust exaggeration (try 0.3-0.7)
- Adjust cfg_weight (try 0.3-0.7)
- Use clean reference audio
- Match reference language to target

## Resources

- **GitHub**: https://github.com/resemble-ai/chatterbox
- **Hugging Face (English)**: https://huggingface.co/resemble-ai/chatterbox
- **Hugging Face (Multilingual)**: https://huggingface.co/resemble-ai/chatterbox-multilingual
- **Paper**: Coming soon
- **Discord**: Join Resemble AI community

## Citation

```bibtex
@misc{chatterboxtts2025,
  author       = {{Resemble AI}},
  title        = {{Chatterbox-TTS}},
  year         = {2025},
  howpublished = {\url{https://github.com/resemble-ai/chatterbox}},
  note         = {GitHub repository}
}
```

## Next Steps

1. ✅ Setup complete (you're here!)
2. Test with sample audio
3. Integrate with dubbing pipeline
4. Deploy to production
5. Enjoy FREE voice cloning! 🎉

---

**This changes everything! Professional voice cloning, completely free, open source, and MIT licensed.**

No API costs. No limits. Just amazing technology.
