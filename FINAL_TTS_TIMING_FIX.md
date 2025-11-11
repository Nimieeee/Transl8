# TTS Timing Fix - Final Solution

## Problem
TTS runs before vocal isolation completes, so clean prompts don't exist yet.

**Current Flow:**
1. STT → triggers Vocal Isolation + Emotion + Adaptation (parallel)
2. Adaptation completes first (2s) → triggers TTS immediately
3. TTS runs but clean prompts don't exist → fails
4. Vocal isolation completes later (2min) → clean prompts created but TTS already failed

## Solution
Vocal Isolation worker should trigger TTS after it completes (if adaptation is also done).

**New Flow:**
1. STT → triggers Vocal Isolation + Emotion + Adaptation (parallel)
2. Adaptation completes (2s) → updates Context Map, does NOT trigger TTS
3. Vocal Isolation completes (2min) → checks if adaptation is done → triggers TTS
4. TTS runs with clean prompts → success!

## Implementation

### Step 1: Remove TTS trigger from Adaptation Worker
In `packages/workers/src/adaptation-worker.ts`, comment out the TTS trigger.

### Step 2: Add TTS trigger to Vocal Isolation Worker  
In `packages/workers/src/vocal-isolation-worker.ts`, after updating Context Map:
- Check if adaptation is complete (Context Map has adapted_text for all segments)
- If yes, trigger TTS
- If no, wait for adaptation to finish

### Step 3: Add TTS trigger to Adaptation Worker (conditional)
In `packages/workers/src/adaptation-worker.ts`, after updating Context Map:
- Check if vocal isolation is complete (Context Map has clean_prompt_path for all segments)
- If yes, trigger TTS
- If no, wait for vocal isolation to finish

This way, whichever completes last (adaptation or vocal isolation) will trigger TTS.

## Quick Fix (Temporary)
For now, just add a delay in adaptation worker before triggering TTS:
```typescript
// Wait for vocal isolation to complete (temporary fix)
await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
await this.triggerTTSStage(projectId, job.data.userId, targetLanguage);
```

This ensures vocal isolation has time to complete before TTS runs.

## Better Fix (Proper Solution)
Implement the conditional TTS triggering as described above so both workers can trigger TTS when their prerequisites are met.
