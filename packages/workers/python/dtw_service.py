#!/usr/bin/env python3
"""
Dynamic Time Warping (DTW) Audio Alignment Service
Aligns translated audio segments with original timing using DTW
"""

from flask import Flask, request, send_file
import librosa
import numpy as np
from librosa.sequence import dtw
import soundfile as sf
import tempfile
import json
import os
from scipy.interpolate import interp1d

app = Flask(__name__)

class DTWAligner:
    def __init__(self, sr=22050):
        self.sr = sr
    
    def extract_features(self, audio):
        """Extract MFCC features for DTW alignment"""
        mfcc = librosa.feature.mfcc(
            y=audio, 
            sr=self.sr, 
            n_mfcc=13,
            hop_length=512,
            n_fft=2048
        )
        # Normalize features
        mfcc = (mfcc - np.mean(mfcc, axis=1, keepdims=True)) / (np.std(mfcc, axis=1, keepdims=True) + 1e-8)
        return mfcc
    
    def align_with_dtw(self, original_audio, translated_audio, word_timestamps):
        """Align translated audio with original using DTW and word timestamps"""
        print(f"Aligning audio: orig={len(original_audio)/self.sr:.2f}s, trans={len(translated_audio)/self.sr:.2f}s")
        
        # Extract features
        orig_mfcc = self.extract_features(original_audio)
        trans_mfcc = self.extract_features(translated_audio)
        
        print(f"MFCC shapes: orig={orig_mfcc.shape}, trans={trans_mfcc.shape}")
        
        # Compute DTW alignment
        D, wp = dtw(orig_mfcc.T, trans_mfcc.T, subseq=True)
        
        print(f"DTW path length: {len(wp)}")
        
        # Create time mapping from DTW path
        orig_frames = wp[:, 0]
        trans_frames = wp[:, 1]
        
        # Convert frames to time
        hop_length = 512
        orig_times = orig_frames * hop_length / self.sr
        trans_times = trans_frames * hop_length / self.sr
        
        # Create interpolation function
        if len(orig_times) > 1 and len(trans_times) > 1:
            # Ensure monotonic increasing for interpolation
            valid_indices = np.where(np.diff(orig_times) > 0)[0]
            if len(valid_indices) > 0:
                orig_times_mono = orig_times[valid_indices]
                trans_times_mono = trans_times[valid_indices]
                
                # Add endpoints
                orig_times_mono = np.concatenate([[0], orig_times_mono, [len(original_audio)/self.sr]])
                trans_times_mono = np.concatenate([[0], trans_times_mono, [len(translated_audio)/self.sr]])
                
                time_mapping = interp1d(
                    orig_times_mono, 
                    trans_times_mono, 
                    kind='linear', 
                    bounds_error=False, 
                    fill_value='extrapolate'
                )
            else:
                # Fallback to linear mapping
                time_mapping = lambda t: t * len(translated_audio) / len(original_audio)
        else:
            # Fallback to linear mapping
            time_mapping = lambda t: t * len(translated_audio) / len(original_audio)
        
        # Align segments based on word timestamps
        aligned_segments = []
        silence_samples = int(0.1 * self.sr)  # 100ms silence between words
        
        for i, word in enumerate(word_timestamps):
            word_start = word['start']
            word_end = word['end']
            
            # Map original word timing to translated audio
            trans_start = time_mapping(word_start)
            trans_end = time_mapping(word_end)
            
            # Extract segment from translated audio
            start_sample = int(trans_start * self.sr)
            end_sample = int(trans_end * self.sr)
            
            # Ensure valid bounds
            start_sample = max(0, min(start_sample, len(translated_audio)))
            end_sample = max(start_sample, min(end_sample, len(translated_audio)))
            
            if end_sample > start_sample:
                segment = translated_audio[start_sample:end_sample]
                
                # Time-stretch segment to match original word duration
                target_duration = word_end - word_start
                current_duration = len(segment) / self.sr
                
                if current_duration > 0.01:  # Avoid very short segments
                    stretch_ratio = current_duration / target_duration
                    
                    # Limit stretch ratio to reasonable bounds
                    stretch_ratio = max(0.5, min(2.0, stretch_ratio))
                    
                    if abs(stretch_ratio - 1.0) > 0.05:  # Only stretch if significant difference
                        try:
                            stretched_segment = librosa.effects.time_stretch(segment, rate=stretch_ratio)
                            aligned_segments.append(stretched_segment)
                        except:
                            # Fallback if time stretch fails
                            aligned_segments.append(segment)
                    else:
                        aligned_segments.append(segment)
                else:
                    # Very short segment, just use as is
                    aligned_segments.append(segment)
            
            # Add silence between words (except last word)
            if i < len(word_timestamps) - 1:
                silence = np.zeros(silence_samples)
                aligned_segments.append(silence)
        
        if aligned_segments:
            aligned_audio = np.concatenate(aligned_segments)
            print(f"Aligned audio duration: {len(aligned_audio)/self.sr:.2f}s")
            return aligned_audio
        else:
            print("No segments aligned, returning original translated audio")
            return translated_audio

# Initialize DTW aligner
aligner = DTWAligner()

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'healthy', 'service': 'DTW Alignment'}

@app.route('/align', methods=['POST'])
def align_audio():
    try:
        # Get uploaded files
        original_audio_file = request.files['original_audio']
        translated_audio_file = request.files['translated_audio']
        word_timestamps_file = request.files['word_timestamps']
        
        # Load audio files
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            original_audio_file.save(f.name)
            original_audio, sr1 = librosa.load(f.name, sr=aligner.sr)
            os.unlink(f.name)
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            translated_audio_file.save(f.name)
            translated_audio, sr2 = librosa.load(f.name, sr=aligner.sr)
            os.unlink(f.name)
        
        # Load word timestamps
        word_timestamps_data = json.loads(word_timestamps_file.read().decode('utf-8'))
        word_timestamps = word_timestamps_data.get('words', [])
        
        print(f"Loaded {len(word_timestamps)} word timestamps")
        
        if not word_timestamps:
            print("No word timestamps, returning original translated audio")
            aligned_audio = translated_audio
        else:
            # Apply DTW alignment
            aligned_audio = aligner.align_with_dtw(original_audio, translated_audio, word_timestamps)
        
        # Save aligned audio
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            sf.write(f.name, aligned_audio, aligner.sr)
            output_path = f.name
        
        return send_file(output_path, mimetype='audio/wav')
        
    except Exception as e:
        print(f"Error in DTW alignment: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500

if __name__ == '__main__':
    print("🎵 Starting DTW Audio Alignment Service")
    print("======================================")
    print("Features:")
    print("✅ Dynamic Time Warping alignment")
    print("✅ Word-level timing preservation")
    print("✅ Intelligent segment stretching")
    print("✅ Natural rhythm maintenance")
    print("")
    print("Listening on http://localhost:8010")
    app.run(host='0.0.0.0', port=8010, debug=False)
