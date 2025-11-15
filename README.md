# Video Dubbing Platform

AI-powered video dubbing platform with speech-to-text, translation, and text-to-speech capabilities.

## 🚀 Quick Start

### Local Development

1. **Start services**:
```bash
docker-compose -f docker-compose.simple.yml up -d
```

2. **Setup**:
```bash
./START_SIMPLE.sh
```

3. **Configure environment**:
Edit `.env` files in each package with your API keys.

4. **Start development** (3 terminals):
```bash
# Terminal 1 - Backend
cd packages/backend && npm run dev

# Terminal 2 - Workers
cd packages/workers && npm run dev

# Terminal 3 - Frontend
cd packages/frontend && npm run dev
```

5. **Open**: http://localhost:3000

---

## 🌐 Deployment

### Deploy to Production

**Services**:
- Backend + Workers: Render
- Frontend: Vercel
- Database: Supabase
- Queue: Upstash Redis
- Storage: AWS S3

**Quick Deploy** (30 minutes):
```bash
cat START_HERE.md
```

**Deployment Guides**:
- `START_HERE.md` - Choose your deployment path
- `DEPLOY_NOW.md` - Quick reference (30 min)
- `DEPLOY_CHECKLIST.md` - Step-by-step guide
- `DEPLOYMENT_GUIDE.md` - Complete documentation

---

## 📁 Project Structure

```
packages/
├── backend/          # Express.js API
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── lib/      # Core logic
│   │   └── middleware/
│   └── prisma/       # Database schema
├── workers/          # BullMQ workers
│   └── src/
│       ├── stt-worker.ts
│       ├── translation-worker.ts
│       ├── tts-worker.ts
│       └── muxing-worker.ts
└── frontend/         # Next.js app
    └── src/
        ├── app/      # Pages
        └── lib/      # API client
```

---

## 🛠 Tech Stack

- **Backend**: Express.js, Prisma, BullMQ, JWT
- **Workers**: BullMQ, FFmpeg, OpenAI APIs
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **Queue**: Redis (Upstash)
- **Storage**: AWS S3
- **APIs**: OpenAI (Whisper, GPT-4, TTS)

---

## 🔑 Environment Variables

### Backend
```bash
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=your-secret
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=your-bucket
FRONTEND_URL=http://localhost:3000
```

### Workers
```bash
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
OPENAI_API_KEY=sk-...
```

### Frontend
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 📊 Pipeline

1. **Upload** → Video stored in S3
2. **STT** → Whisper extracts transcript
3. **Translation** → GPT-4 translates
4. **TTS** → OpenAI TTS generates audio
5. **Muxing** → FFmpeg combines video + audio
6. **Complete** → Download result

---

## 🧪 Testing

```bash
# Test API
./test-simple.sh

# Run builds
npm run build --workspace=@dubbing/backend
npm run build --workspace=@dubbing/workers
npm run build --workspace=@dubbing/frontend
```

---

## 💰 Cost

### Development
- Local: Free (PostgreSQL + Redis in Docker)

### Production
- Render Backend: $7/month
- Render Workers: $7/month
- Vercel: Free
- Supabase: Free (up to 500MB)
- Upstash: Free (10K commands/day)
- AWS S3: ~$1-5/month

**Total: ~$15-20/month**

---

## 📚 Documentation

- `START_HERE.md` - Deployment entry point
- `QUICK_START.md` - Local development guide
- `DEPLOYMENT_GUIDE.md` - Complete deployment docs
- `README_SIMPLE.md` - Platform overview

---

## 🔒 Security

- HTTPS (automatic on Render/Vercel)
- JWT authentication
- Bcrypt password hashing
- Environment variables
- CORS configured
- S3 signed URLs

---

## 🤝 Contributing

See `CONTRIBUTING.md` for guidelines.

---

## 📄 License

MIT

---

## 🆘 Support

### Issues?
1. Check service logs
2. Verify environment variables
3. Test connections
4. Review deployment guides

### Documentation
- Local: `QUICK_START.md`
- Deploy: `START_HERE.md`
- Troubleshooting: `DEPLOYMENT_GUIDE.md`

---

**Ready to deploy?** → `START_HERE.md`
