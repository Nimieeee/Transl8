# Wav2Lip Implementation for M1 GPU

## What This Solves
✅ **Perfect lip-sync** - Video frames modified to match audio
✅ **No timing issues** - Audio can be any duration
✅ **Professional quality** - Industry-standard solution
✅ **Uses M1 GPU** - Fast processing with Metal acceleration

## Architecture

```
Video Input → Extract Audio → Transcribe → Translate → Generate TTS
                    ↓
              Original Video → Wav2Lip → Synced Video Output
                    ↓              ↑
              Face Detection    New Audio
```

## Implementation Steps

### 1. Setup Wav2Lip for M1 Mac
```bash
# Install dependencies
pip3 install torch torchvision torchaudio
pip3 install opencv-python librosa numpy scipy tqdm

# Clone Wav2Lip
git clone https://github.com/Rudrabha/Wav2Lip.git
cd Wav2Lip

# Download pretrained models
wget 'https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/Eb3LEzbfuKlJiR600lQWRxgBIY27JZg80f7V9jtMfbNDaQ?download=1' -O 'checkpoints/wav2lip_gan.pth'
```

### 2. Create Wav2Lip Service (Python)
```python
# packages/workers/docker/wav2lip/wav2lip_service.py
from flask import Flask, request, send_file
import subprocess
import os

app = Flask(__name__)

@app.route('/sync', methods=['POST'])
def sync_video():
    video = request.files['video']
    audio = request.files['audio']
    
    # Save files
    video_path = '/tmp/input_video.mp4'
    audio_path = '/tmp/input_audio.wav'
    output_path = '/tmp/output_synced.mp4'
    
    video.save(video_path)
    audio.save(audio_path)
    
    # Run Wav2Lip
    cmd = [
        'python3', 'inference.py',
        '--checkpoint_path', 'checkpoints/wav2lip_gan.pth',
        '--face', video_path,
        '--audio', audio_path,
        '--outfile', output_path,
        '--fps', '25',
        '--pads', '0', '10', '0', '0',
        '--face_det_batch_size', '4',
        '--wav2lip_batch_size', '128'
    ]
    
    subprocess.run(cmd, check=True)
    
    return send_file(output_path, mimetype='video/mp4')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8008)
```

### 3. Update Dubbing Worker
Add Wav2Lip as final step:
```typescript
// After generating audio and merging
if (process.env.WAV2LIP_SERVICE_URL) {
  console.log('Applying Wav2Lip for perfect lip-sync');
  
  const FormData = require('form-data');
  const formData = new FormData();
  formData.append('video', fs.createReadStream(videoPath));
  formData.append('audio', fs.createReadStream(finalAudioPath));
  
  const response = await axios.post(
    `${process.env.WAV2LIP_SERVICE_URL}/sync`,
    formData,
    {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer',
      timeout: 300000, // 5 minutes
    }
  );
  
  const syncedPath = path.join(outputDir, `${cleanName}_synced_${timestamp}.mp4`);
  fs.writeFileSync(syncedPath, Buffer.from(response.data));
  
  return syncedPath;
}
```

### 4. Environment Setup
```bash
# .env
WAV2LIP_SERVICE_URL=http://localhost:8008
```

## M1 GPU Optimization

### Use Metal Performance Shaders
```python
import torch

# Enable M1 GPU acceleration
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print(f"Using device: {device}")

# Load model on M1 GPU
model = load_checkpoint(checkpoint_path, device)
```

### Batch Processing
```python
# Optimize for M1
face_det_batch_size = 8  # M1 can handle larger batches
wav2lip_batch_size = 256  # Increase for M1
```

## Expected Performance

- **Processing Time**: ~2-3x video duration on M1
- **Quality**: Professional lip-sync
- **GPU Usage**: 60-80% on M1
- **Memory**: ~4-6GB

## Installation Commands

```bash
# 1. Install Wav2Lip dependencies
cd packages/workers
pip3 install -r requirements-wav2lip.txt

# 2. Download models
./download-wav2lip-models.sh

# 3. Start Wav2Lip service
python3 docker/wav2lip/wav2lip_service.py

# 4. Update worker environment
echo "WAV2LIP_SERVICE_URL=http://localhost:8008" >> .env

# 5. Test
./test-my-video.sh
```

## Benefits Over Current Approach

| Feature | Current | With Wav2Lip |
|---------|---------|--------------|
| Lip-sync | ❌ Poor | ✅ Perfect |
| Timing | ❌ Audio finishes early | ✅ Exact match |
| Quality | ⚠️ Acceptable | ✅ Professional |
| GPU Usage | ❌ None | ✅ M1 accelerated |
| Processing | ✅ Fast | ⚠️ Slower (2-3x) |

## Next Steps

1. Install Wav2Lip
2. Download pretrained models
3. Create Python service
4. Integrate with worker
5. Test with your video

Ready to implement?
