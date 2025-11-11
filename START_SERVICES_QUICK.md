# Quick Start: All Services

## One-Line Commands

### Start Pipeline Services (3 services)
```bash
./start-pipeline-services.sh
```
Starts: Demucs (8008), Noisereduce (8009), Emotion (8010)

### Start OpenVoice (separate terminal)
```bash
cd packages/workers/docker/openvoice && ./start-openvoice.sh
```
Starts: OpenVoice V2 (8007)

### Test All Services
```bash
curl http://localhost:8008/health && \
curl http://localhost:8009/health && \
curl http://localhost:8010/health && \
curl http://localhost:8007/health
```

### Stop All Services
```bash
# Kill by port
lsof -ti:8008,8009,8010,8007 | xargs kill -9
```

## Service Ports

- 8007 - OpenVoice V2
- 8008 - Demucs
- 8009 - Noisereduce
- 8010 - Emotion Analysis

## Logs

```bash
tail -f /tmp/demucs.log
tail -f /tmp/noisereduce.log
tail -f /tmp/emotion.log
# OpenVoice logs to console
```

## Test Pipeline

```bash
./run-pipeline-cli.sh test-video.mov
```

---

**That's it!** All services are ready to use.
