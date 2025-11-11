"""
Demucs Vocal Isolation Service

Provides REST API for vocal separation using Demucs model.
Separates vocals from background music and sound effects.

Requirements: 16.1, 16.2
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
import tempfile
import os
import logging
import subprocess
import shutil
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Demucs Vocal Isolation Service", version="1.0.0")

# Model configuration
MODEL_NAME = "htdemucs"  # Hybrid Transformer Demucs (best quality)
DEMUCS_OUTPUT_DIR = "/tmp/demucs_output"

@app.on_event("startup")
async def startup():
    """Initialize service on startup"""
    logger.info(f"Starting Demucs service with model: {MODEL_NAME}")
    # Create output directory
    os.makedirs(DEMUCS_OUTPUT_DIR, exist_ok=True)
    logger.info("Demucs service ready")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model": MODEL_NAME}

@app.post("/separate")
async def separate_vocals(
    audio: UploadFile = File(...)
):
    """
    Separate vocals from background music and effects
    
    Args:
        audio: Audio file (WAV, MP3, etc.)
    
    Returns:
        Isolated vocals audio file (WAV format)
    """
    temp_input = None
    temp_output_dir = None
    
    try:
        # Create temporary input file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_input:
            content = await audio.read()
            temp_input.write(content)
            temp_input_path = temp_input.name
        
        # Create unique output directory
        temp_output_dir = tempfile.mkdtemp(dir=DEMUCS_OUTPUT_DIR)
        
        logger.info(f"Separating vocals from: {audio.filename}")
        
        # Run Demucs separation
        # --two-stems=vocals: Only separate vocals (faster than full 4-stem separation)
        # -n htdemucs: Use Hybrid Transformer Demucs model
        # -o: Output directory
        cmd = [
            "python3", "-m", "demucs",
            "--two-stems=vocals",
            "-n", MODEL_NAME,
            "-o", temp_output_dir,
            temp_input_path
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            logger.error(f"Demucs error: {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Vocal separation failed: {result.stderr}"
            )
        
        # Find the vocals output file
        # Demucs creates: output_dir/MODEL_NAME/filename/vocals.wav
        input_basename = Path(temp_input_path).stem
        vocals_path = os.path.join(
            temp_output_dir,
            MODEL_NAME,
            input_basename,
            "vocals.wav"
        )
        
        if not os.path.exists(vocals_path):
            raise HTTPException(
                status_code=500,
                detail="Vocals file not found after separation"
            )
        
        logger.info(f"Vocal separation completed: {vocals_path}")
        
        # Return the vocals file
        return FileResponse(
            vocals_path,
            media_type="audio/wav",
            filename="vocals.wav"
        )
        
    except subprocess.TimeoutExpired:
        logger.error("Demucs processing timeout")
        raise HTTPException(status_code=504, detail="Processing timeout")
    
    except Exception as e:
        logger.error(f"Vocal separation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Vocal separation failed: {str(e)}"
        )
    
    finally:
        # Clean up temporary input file
        if temp_input and os.path.exists(temp_input_path):
            try:
                os.unlink(temp_input_path)
            except:
                pass
        
        # Clean up output directory (after response is sent)
        # Note: FileResponse will handle the file, so we schedule cleanup
        if temp_output_dir and os.path.exists(temp_output_dir):
            try:
                # We can't delete immediately as FileResponse needs the file
                # In production, use a background task or cleanup job
                pass
            except:
                pass

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Demucs Vocal Isolation Service",
        "version": "1.0.0",
        "model": MODEL_NAME
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
