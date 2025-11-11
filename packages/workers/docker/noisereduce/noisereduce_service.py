"""
Noise Reduction Service

Provides REST API for ambient noise removal using noisereduce library.
Removes hiss, ambient noise, and other stationary noise from audio.

Requirements: 16.3
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
import tempfile
import os
import logging
import noisereduce as nr
import soundfile as sf
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Noise Reduction Service", version="1.0.0")

@app.on_event("startup")
async def startup():
    """Initialize service on startup"""
    logger.info("Starting Noise Reduction service")
    logger.info("Noise Reduction service ready")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "library": "noisereduce"}

@app.post("/reduce")
async def reduce_noise(
    audio: UploadFile = File(...),
    prop_decrease: float = Form(default=0.8),
    stationary: str = Form(default="true")
):
    """
    Remove ambient noise from audio
    
    Args:
        audio: Audio file (WAV format recommended)
        prop_decrease: Proportion of noise to reduce (0.0-1.0, default 0.8)
        stationary: Whether noise is stationary (default: true)
    
    Returns:
        Cleaned audio file (WAV format)
    """
    temp_input = None
    temp_output = None
    
    try:
        # Create temporary input file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_input:
            content = await audio.read()
            temp_input.write(content)
            temp_input_path = temp_input.name
        
        logger.info(f"Reducing noise from: {audio.filename}")
        
        # Load audio
        audio_data, sample_rate = sf.read(temp_input_path)
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        
        # Apply noise reduction
        is_stationary = stationary.lower() == "true"
        
        reduced_audio = nr.reduce_noise(
            y=audio_data,
            sr=sample_rate,
            stationary=is_stationary,
            prop_decrease=prop_decrease
        )
        
        # Create temporary output file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_output:
            temp_output_path = temp_output.name
        
        # Save cleaned audio
        sf.write(temp_output_path, reduced_audio, sample_rate)
        
        logger.info(f"Noise reduction completed: {temp_output_path}")
        
        # Return the cleaned file
        return FileResponse(
            temp_output_path,
            media_type="audio/wav",
            filename="cleaned.wav"
        )
        
    except Exception as e:
        logger.error(f"Noise reduction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Noise reduction failed: {str(e)}"
        )
    
    finally:
        # Clean up temporary input file
        if temp_input and os.path.exists(temp_input_path):
            try:
                os.unlink(temp_input_path)
            except:
                pass

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Noise Reduction Service",
        "version": "1.0.0",
        "library": "noisereduce"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)
