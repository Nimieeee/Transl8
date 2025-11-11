# OpenAI Whisper - Quick Reference

## ✅ Status: READY TO USE

## Configuration

```bash
# In packages/backend/.env
USE_OPENAI_WHISPER=true
OPENAI_API_KEY=sk-proj-your-key-here
```

## Start Services

```bash
# Terminal 1
cd packages/backend && npm run dev

# Terminal 2
cd packages/workers && npm run dev
```

**Look for**: `[STT Worker] Using OpenAI Whisper API adapter`

## Test Integration

```bash
node test-openai-whisper-integration.js
```

## Switch Adapters

| Adapter | Config | Needs Docker? | Speaker Diarization? | Cost |
|---------|--------|---------------|---------------------|------|
| **OpenAI** | `USE_OPENAI_WHISPER=true` | ❌ No | ❌ No | $0.006/min |
| **Local** | `USE_OPENAI_WHISPER=false` | ✅ Yes | ✅ Yes | Free |

## Files Changed

- ✅ `packages/backend/src/adapters/openai-whisper-adapter.ts` - Created
- ✅ `packages/workers/src/stt-worker.ts` - Updated
- ✅ `packages/backend/package.json` - Added openai@6.8.1

## Documentation

- 📖 [WHISPER_INTEGRATION_SUMMARY.md](./WHISPER_INTEGRATION_SUMMARY.md) - Complete summary
- 📖 [OPENAI_WHISPER_INTEGRATION_COMPLETE.md](./OPENAI_WHISPER_INTEGRATION_COMPLETE.md) - Technical details
- 📖 [OPENAI_WHISPER_READY.md](./OPENAI_WHISPER_READY.md) - Quick start
- 📖 [USING_OPENAI_WHISPER.md](./USING_OPENAI_WHISPER.md) - User guide

## Key Points

✅ **No local Whisper service needed** when using OpenAI
✅ **Automatic adapter selection** based on environment variable
✅ **No breaking changes** to existing code
✅ **Production ready** and tested

⚠️ **OpenAI Whisper limitations**:
- No speaker diarization (all segments = SPEAKER_00)
- Costs $0.006 per minute
- Requires internet connection

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "OPENAI_API_KEY required" | Set in `.env` file |
| "Transcription failed" | Check API key, internet, OpenAI status |
| All speakers = SPEAKER_00 | Expected - use local for multi-speaker |

## Ready to Go! 🚀

Your OpenAI Whisper integration is complete and ready to process transcriptions!
