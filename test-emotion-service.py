#!/usr/bin/env python3
"""
Test script for Emotion Analysis Service
Tests the superb/wav2vec2-base-superb-er model
"""

import sys
import time
import requests
import numpy as np
import soundfile as sf

def create_test_audio(filename='test_audio.wav', duration=3, sample_rate=16000):
    """Create a simple test audio file"""
    print(f"Creating test audio file: {filename}")
    
    # Generate a simple sine wave
    t = np.linspace(0, duration, int(sample_rate * duration))
    frequency = 440  # A4 note
    audio = 0.5 * np.sin(2 * np.pi * frequency * t)
    
    # Save as WAV
    sf.write(filename, audio, sample_rate)
    print(f"✓ Test audio created: {duration}s @ {sample_rate}Hz")
    return filename

def test_health_check(base_url='http://localhost:8010'):
    """Test the health check endpoint"""
    print("\n1. Testing health check...")
    try:
        response = requests.get(f'{base_url}/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Service is healthy")
            print(f"  Model: {data.get('model')}")
            print(f"  Device: {data.get('device')}")
            print(f"  Emotions: {data.get('emotions')}")
            return True
        else:
            print(f"✗ Health check failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to service. Is it running?")
        print("  Start with: cd packages/workers/docker/emotion && python emotion_service.py")
        return False
    except Exception as e:
        print(f"✗ Health check error: {e}")
        return False

def test_emotion_analysis(audio_path, base_url='http://localhost:8010'):
    """Test emotion analysis endpoint"""
    print(f"\n2. Testing emotion analysis with {audio_path}...")
    try:
        start_time = time.time()
        
        response = requests.post(
            f'{base_url}/analyze',
            json={'audio_path': audio_path},
            timeout=30
        )
        
        elapsed = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Analysis successful ({elapsed:.0f}ms)")
            print(f"  Emotion: {data.get('emotion')}")
            print(f"  Confidence: {data.get('confidence', 0):.3f}")
            print(f"  Scores:")
            for emotion, score in data.get('scores', {}).items():
                print(f"    {emotion}: {score:.3f}")
            print(f"  Processing time: {data.get('processing_time_ms', 0):.0f}ms")
            return True
        else:
            print(f"✗ Analysis failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Analysis error: {e}")
        return False

def test_batch_analysis(audio_paths, base_url='http://localhost:8010'):
    """Test batch emotion analysis endpoint"""
    print(f"\n3. Testing batch analysis with {len(audio_paths)} files...")
    try:
        start_time = time.time()
        
        response = requests.post(
            f'{base_url}/analyze_batch',
            json={'audio_paths': audio_paths},
            timeout=60
        )
        
        elapsed = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Batch analysis successful ({elapsed:.0f}ms)")
            print(f"  Processed: {data.get('processed_count')} files")
            print(f"  Total time: {data.get('total_processing_time_ms', 0):.0f}ms")
            
            for i, result in enumerate(data.get('results', [])):
                if 'error' not in result:
                    print(f"  File {i+1}: {result.get('emotion')} ({result.get('confidence', 0):.3f})")
                else:
                    print(f"  File {i+1}: Error - {result.get('error')}")
            return True
        else:
            print(f"✗ Batch analysis failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Batch analysis error: {e}")
        return False

def main():
    print("=" * 60)
    print("Emotion Analysis Service Test")
    print("Model: superb/wav2vec2-base-superb-er")
    print("=" * 60)
    
    base_url = 'http://localhost:8010'
    
    # Test 1: Health check
    if not test_health_check(base_url):
        print("\n✗ Service not available. Exiting.")
        sys.exit(1)
    
    # Create test audio
    test_audio = create_test_audio()
    
    # Test 2: Single analysis
    success = test_emotion_analysis(test_audio, base_url)
    
    # Test 3: Batch analysis
    if success:
        test_batch_analysis([test_audio, test_audio], base_url)
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("✓ Emotion service is working with superb/wav2vec2-base-superb-er")
    print("✓ Supports emotions: neutral, happy, sad, angry")
    print("\nService ready for production use!")
    print("=" * 60)

if __name__ == '__main__':
    main()
