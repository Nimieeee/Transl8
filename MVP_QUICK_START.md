# MVP Prototype - Quick Start (5 Minutes)

Get the MVP prototype running in 5 minutes or less.

## Prerequisites Check

```bash
node --version   # Need v20+
docker --version # Need Docker installed
npm --version    # Need v9+
```

Don't have these? Install:
- **Node.js**: https://nodejs.org
- **Docker**: https://docker.com

## One-Command Start

```bash
./mvp-start.sh
```

That's it! The script will:
1. ✅ Check prerequisites
2. ✅ Create environment files
3. ✅ Install dependencies
4. ✅ Start database and Redis
5. ✅ Initialize database schema
6. ✅ Start all services

## Access the Application

Once you see "Setup complete!", open:

**http://localhost:3000**

## Test the Flow

1. **Register** - Create an account with email/password
2. **Upload** - Select an MP4 video (under 100MB)
3. **Wait** - Watch progress bar (takes 2-5 minutes)
4. **Download** - Get your dubbed video

## Stop Services

```bash
# Press Ctrl+C in the terminal
# OR
./mvp-stop.sh
```

## Reset Everything

```bash
./mvp-reset.sh
```

## Need Help?

- **Full Documentation**: [MVP_README.md](./MVP_README.md)
- **Commands**: [MVP_COMMANDS.md](./MVP_COMMANDS.md)
- **Troubleshooting**: [MVP_TROUBLESHOOTING.md](./MVP_TROUBLESHOOTING.md)

## Common Issues

### Port already in use
```bash
./mvp-stop.sh
./mvp-start.sh
```

### Database connection failed
```bash
docker-compose restart postgres
```

### Services won't start
```bash
./mvp-reset.sh
```

---

**Ready?** Run `./mvp-start.sh` and visit http://localhost:3000
