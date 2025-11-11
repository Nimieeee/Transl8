# Gemini 2.5 Pro - Quick Reference

## ✅ Status: ACTIVE

The adaptation engine is now using **Gemini 2.5 Pro** for all translation adaptations.

## Configuration

```bash
# packages/backend/.env
GEMINI_API_KEY=AIzaSyB9zaUGcyBKc-9u6tb1w2CEQk7NuO_MmvI
GEMINI_MODEL=gemini-2.5-pro
```

## What Uses Gemini 2.5 Pro

1. **Translation Adaptation** - Converting source text to target language with timing awareness
2. **Validation** - Checking if translations fit within time constraints
3. **Context Understanding** - Maintaining dialogue flow and emotional tone

## Quick Test

```bash
cd packages/backend
npm run test:cli
```

## Switch Models

Edit `packages/backend/.env`:

```bash
# For production (highest quality)
GEMINI_MODEL=gemini-2.5-pro

# For development (faster, cheaper)
GEMINI_MODEL=gemini-2.0-flash-exp

# For testing (fastest)
GEMINI_MODEL=gemini-1.5-flash
```

Then restart the backend:

```bash
cd packages/backend
npm run dev
```

## Key Files Modified

- ✅ `packages/backend/src/lib/gemini-client.ts` - Client implementation
- ✅ `packages/backend/.env` - Environment configuration
- ✅ `.env.example` - Example configuration

## Monitoring

Check logs for Gemini API calls:

```bash
tail -f packages/backend/logs/app.log | grep "Gemini"
```

## Cost Tracking

Gemini 2.5 Pro pricing:
- Input: $1.25 per 1M tokens
- Output: $5.00 per 1M tokens

Typical usage per minute of video:
- ~50-100 segments
- ~500-1000 tokens per segment
- ~$0.05-0.10 per minute

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API key error | Check `GEMINI_API_KEY` in `.env` |
| Model not found | Verify `GEMINI_MODEL` is valid |
| Rate limit | Reduce concurrency or upgrade quota |
| Empty responses | Check API key permissions |

## Documentation

- Full setup: `GEMINI_2.5_PRO_SETUP.md`
- Migration details: `GEMINI_2.5_PRO_MIGRATION.md`
- Adaptation engine: `packages/backend/ADAPTATION_ENGINE.md`

---

**Last Updated**: November 7, 2024
**Model**: Gemini 2.5 Pro
**Status**: Production Ready ✅
