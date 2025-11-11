"""
Test script for emotion analysis service

This script tests the emotion analysis service with sample audio files
to verify emotion detection accuracy.
"""

import requests
import json
import time

SERVICE_URL = "http://localhost:5007"

def test_health():
    """Test health check endpoint"""
    print("Testing health check...")
    response = requests.get(f"{SERVICE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_analyze(audio_path):
    """Test emotion analysis for single audio file"""
    print(f"Testing emotion analysis for: {audio_path}")
    
    start_time = time.time()
    
    with open(audio_path, 'rb') as f:
        files = {'audio': f}
        response = requests.post(
            f"{SERVICE_URL}/analyze",
            files=files
        )
    
    elapsed_time = time.time() - start_time
    
    print(f"Status: {response.status_code}")
    print(f"Processing time: {elapsed_time:.2f}s")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
    else:
        print(f"Error: {response.text}")
    print()
    
    return response

def main():
    """Run all tests"""
    print("=" * 60)
    print("Emotion Analysis Service Tests")
    print("=" * 60)
    print()
    
    # Test health check
    test_health()
    
    # Test with sample audio files (if available)
    sample_files = [
        "test_audio_neutral.wav",
        "test_audio_happy.wav",
        "test_audio_sad.wav",
        "test_audio_angry.wav",
    ]
    
    for audio_file in sample_files:
        try:
            test_analyze(audio_file)
        except FileNotFoundError:
            print(f"Skipping {audio_file} - file not found")
            print()
        except Exception as e:
            print(f"Error testing {audio_file}: {e}")
            print()
    
    print("=" * 60)
    print("Tests completed")
    print("=" * 60)

if __name__ == "__main__":
    main()
        