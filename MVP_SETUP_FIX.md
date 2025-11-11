# MVP Setup Fix - jiwer Dependency Issue

## Issue
The initial run of `./mvp-start.sh` failed with:
```
npm error 404 Not Found - GET https://registry.npmjs.org/jiwer
```

## Root Cause
The `packages/benchmarks/package.json` file incorrectly listed `jiwer` as a Node.js dependency. `jiwer` is actually a Python package for calculating Word Error Rate (WER), not a Node.js package.

## Fix Applied
Removed the invalid dependency from `packages/benchmarks/package.json`:

```diff
  "dependencies": {
    "axios": "^1.6.0",
    "csv-parser": "^3.0.0",
    "csv-writer": "^1.6.0",
    "fast-levenshtein": "^3.0.0",
-   "form-data": "^4.0.0",
-   "jiwer": "^1.0.0"
+   "form-data": "^4.0.0"
  },
```

## Verification
After the fix:
- ✅ `npm install` completed successfully
- ✅ 1235 packages installed with 0 vulnerabilities
- ✅ Docker services (PostgreSQL and Redis) are running

## Next Steps
You can now continue with the startup process:

```bash
# Option 1: Run the full startup script again
./mvp-start.sh

# Option 2: Since dependencies are installed and Docker is running,
# you can skip to database setup:
cd packages/backend
npm run prisma:generate
npm run db:push
cd ../..
npm run dev
```

## Prevention
This issue has been documented in `MVP_TROUBLESHOOTING.md` under "404 Not Found during npm install" for future reference.

## Note
The benchmarks package is not part of the MVP prototype and is not required for the core functionality. If you need to use the benchmarks in the future, you'll need to implement WER calculation using a JavaScript library like `fast-levenshtein` (which is already installed) or another alternative.
