# Setup Guide

## Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- npm 9 or higher

## Quick Start

### Automated Setup

Run the setup script:

```bash
./scripts/setup.sh
```

This will:
1. Check prerequisites
2. Install dependencies
3. Create environment files
4. Start Docker services

### Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.example packages/frontend/.env
   cp packages/workers/.env.example packages/workers/.env
   ```

3. **Start infrastructure services**
   ```bash
   npm run docker:up
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## Environment Configuration

### Root .env

Contains global configuration for all services.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `AWS_*` - AWS/S3 credentials for storage

### Backend .env

Backend-specific configuration.

### Frontend .env

Frontend-specific configuration.
- `NEXT_PUBLIC_API_URL` - Backend API URL

### Workers .env

Worker-specific configuration including model service URLs.

## Docker Services

The platform uses Docker Compose for local development infrastructure:

- **PostgreSQL** (port 5432) - Main database
- **Redis** (port 6379) - Session store and job queue
- **MinIO** (ports 9000, 9001) - S3-compatible object storage

### Managing Docker Services

Start services:
```bash
npm run docker:up
```

Stop services:
```bash
npm run docker:down
```

View logs:
```bash
npm run docker:logs
```

## Development Workflow

### Running Services

Start all services:
```bash
npm run dev
```

Start individual services:
```bash
npm run dev:backend   # Backend API
npm run dev:frontend  # Frontend app
npm run dev:workers   # Workers
```

### Code Quality

Format code:
```bash
npm run format
```

Check formatting:
```bash
npm run format:check
```

Lint code:
```bash
npm run lint
```

### Building

Build all packages:
```bash
npm run build
```

## Troubleshooting

### Port Already in Use

If ports 3000, 3001, 5432, 6379, 9000, or 9001 are already in use, either:
1. Stop the conflicting service
2. Change the port in docker-compose.yml and .env files

### Docker Services Not Starting

Check Docker is running:
```bash
docker ps
```

View service logs:
```bash
docker-compose logs [service-name]
```

### Dependencies Not Installing

Clear npm cache and reinstall:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

After setup is complete:
1. Review the [Architecture Documentation](.kiro/specs/ai-video-dubbing-platform/design.md)
2. Check the [Implementation Tasks](.kiro/specs/ai-video-dubbing-platform/tasks.md)
3. Start implementing features following the task list
