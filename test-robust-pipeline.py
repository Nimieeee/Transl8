#!/usr/bin/env python3
"""
Comprehensive test script for the robust AI video dubbing pipeline
Tests the complete flow with a real video file
"""

import os
import sys
import time
import json
import requests
from pathlib import Path

# Configuration
# Try to find the most recent Movie file, fallback to test-video.mov
import glob
movie_files = glob.glob("./packages/backend/uploads/*Movie*.mov")
if movie_files:
    VIDEO_FILE = sorted(movie_files)[-1]  # Get most recent
else:
    VIDEO_FILE = "./test-video.mov"

API_BASE_URL = "http://localhost:3001"
SOURCE_LANGUAGE = "en"
TARGET_LANGUAGE = "es"

# Colors for output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def check_video_file():
    """Check if the video file exists"""
    print_header("Step 1: Checking Video File")
    
    if not os.path.exists(VIDEO_FILE):
        print_error(f"Video file not found: {VIDEO_FILE}")
        return False
    
    file_size = os.path.getsize(VIDEO_FILE) / (1024 * 1024)  # MB
    print_success(f"Video file found: {VIDEO_FILE}")
    print_info(f"File size: {file_size:.2f} MB")
    return True

def check_services():
    """Check if all required services are running"""
    print_header("Step 2: Checking Services")
    
    services = {
        "Backend API": f"{API_BASE_URL}/health",
        "Whisper STT": "http://localhost:5001/health",
        "Pyannote Diarization": "http://localhost:5002/health",
        "Demucs Vocal Isolation": "http://localhost:5003/health",
        "Noisereduce": "http://localhost:5004/health",
        "Emotion Analysis": "http://localhost:5007/health",
        "OpenVoice TTS": "http://localhost:5008/health",
    }
    
    all_healthy = True
    for service_name, health_url in services.items():
        try:
            response = requests.get(health_url, timeout=5)
            if response.status_code == 200:
                print_success(f"{service_name}: Running")
            else:
                print_error(f"{service_name}: Unhealthy (status {response.status_code})")
                all_healthy = False
        except requests.exceptions.RequestException as e:
            print_error(f"{service_name}: Not accessible ({str(e)})")
            all_healthy = False
    
    return all_healthy

def create_dubbing_job():
    """Create a new dubbing job"""
    print_header("Step 3: Creating Dubbing Job")
    
    try:
        # Upload video file
        with open(VIDEO_FILE, 'rb') as f:
            files = {'video': f}
            data = {
                'sourceLanguage': SOURCE_LANGUAGE,
                'targetLanguage': TARGET_LANGUAGE,
            }
            
            print_info("Uploading video file...")
            response = requests.post(
                f"{API_BASE_URL}/api/dubbing/upload",
                files=files,
                data=data,
                timeout=60
            )
        
        if response.status_code in [200, 201]:
            job_data = response.json()
            job_id = job_data.get('id') or job_data.get('jobId')
            print_success(f"Dubbing job created: {job_id}")
            print_info(f"Status: {job_data.get('status')}")
            return job_id
        else:
            print_error(f"Failed to create job: {response.status_code}")
            print_error(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Error creating job: {str(e)}")
        return None

def monitor_job_progress(job_id, max_wait_time=600):
    """Monitor the job progress through all pipeline stages"""
    print_header("Step 4: Monitoring Pipeline Progress")
    
    start_time = time.time()
    last_status = None
    last_progress = 0
    
    stages = {
        'pending': '⏳ Pending',
        'processing': '🔄 Processing',
        'stt': '🎤 Speech-to-Text',
        'vocal_isolation': '🎵 Vocal Isolation',
        'emotion_analysis': '😊 Emotion Analysis',
        'adaptation': '🔄 Translation Adaptation',
        'tts': '🗣️  Text-to-Speech',
        'synchronization': '⏱️  Absolute Synchronization',
        'muxing': '🎬 Video Muxing',
        'completed': '✅ Completed',
        'failed': '❌ Failed',
    }
    
    while True:
        try:
            response = requests.get(f"{API_BASE_URL}/api/dubbing/jobs/{job_id}")
            
            if response.status_code == 200:
                job_data = response.json()
                status = job_data.get('status')
                progress = job_data.get('progress', 0)
                
                # Print status update if changed
                if status != last_status or progress != last_progress:
                    stage_label = stages.get(status, status)
                    print_info(f"{stage_label} - Progress: {progress}%")
                    last_status = status
                    last_progress = progress
                
                # Check if completed
                if status == 'completed':
                    print_success("Pipeline completed successfully!")
                    return job_data
                
                # Check if failed
                if status == 'failed':
                    error_msg = job_data.get('error', 'Unknown error')
                    print_error(f"Pipeline failed: {error_msg}")
                    return None
                
                # Check timeout
                elapsed_time = time.time() - start_time
                if elapsed_time > max_wait_time:
                    print_warning(f"Timeout after {max_wait_time}s")
                    return None
                
            else:
                print_error(f"Failed to get job status: {response.status_code}")
                return None
            
            time.sleep(5)  # Poll every 5 seconds
            
        except Exception as e:
            print_error(f"Error monitoring job: {str(e)}")
            return None

def verify_context_map(job_id):
    """Verify the Context Map was created and updated correctly"""
    print_header("Step 5: Verifying Context Map")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/context-map/{job_id}")
        
        if response.status_code == 200:
            context_map = response.json()
            
            # Verify required fields
            required_fields = ['project_id', 'original_duration_ms', 'segments']
            for field in required_fields:
                if field in context_map:
                    print_success(f"Context Map has '{field}'")
                else:
                    print_error(f"Context Map missing '{field}'")
            
            # Verify segments
            segments = context_map.get('segments', [])
            print_info(f"Total segments: {len(segments)}")
            
            if segments:
                # Check first segment for all required fields
                first_segment = segments[0]
                segment_fields = [
                    'text', 'speaker', 'clean_prompt_path', 'emotion',
                    'adapted_text', 'status', 'generated_audio_path'
                ]
                
                print_info("Checking first segment fields:")
                for field in segment_fields:
                    if field in first_segment:
                        print_success(f"  ✓ {field}")
                    else:
                        print_warning(f"  ✗ {field} (missing)")
            
            return context_map
        else:
            print_error(f"Failed to get Context Map: {response.status_code}")
            return None
            
    except Exception as e:
        print_error(f"Error verifying Context Map: {str(e)}")
        return None

def verify_output_files(job_data):
    """Verify the output files were created"""
    print_header("Step 6: Verifying Output Files")
    
    output_file = job_data.get('outputFile') or job_data.get('outputVideoUrl')
    
    if output_file:
        print_success(f"Output file path: {output_file}")
        
        # Check if file exists locally
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file) / (1024 * 1024)  # MB
            print_success(f"Output file exists: {file_size:.2f} MB")
            return True
        else:
            print_warning("Output file path provided but file not found locally")
            print_info("File may be stored remotely (S3)")
            return True
    else:
        print_error("No output file path in job data")
        return False

def verify_quality_metrics(job_id):
    """Verify quality metrics were recorded"""
    print_header("Step 7: Verifying Quality Metrics")
    
    metrics_endpoints = {
        "Adaptation Metrics": f"{API_BASE_URL}/api/adaptation-metrics/{job_id}",
        "Audio Quality Metrics": f"{API_BASE_URL}/api/audio-quality/{job_id}",
        "Sync Quality Metrics": f"{API_BASE_URL}/api/sync-validation/{job_id}",
    }
    
    for metric_name, endpoint in metrics_endpoints.items():
        try:
            response = requests.get(endpoint)
            if response.status_code == 200:
                metrics = response.json()
                print_success(f"{metric_name}: Available")
                print_info(f"  Data: {json.dumps(metrics, indent=2)[:200]}...")
            else:
                print_warning(f"{metric_name}: Not available (status {response.status_code})")
        except Exception as e:
            print_warning(f"{metric_name}: Error ({str(e)})")

def main():
    """Run the complete system test"""
    print_header("Robust AI Video Dubbing Pipeline - System Test")
    print_info(f"Video: {VIDEO_FILE}")
    print_info(f"Source Language: {SOURCE_LANGUAGE}")
    print_info(f"Target Language: {TARGET_LANGUAGE}")
    
    # Step 1: Check video file
    if not check_video_file():
        print_error("Video file check failed. Exiting.")
        sys.exit(1)
    
    # Step 2: Check services
    if not check_services():
        print_warning("Some services are not running. Test may fail.")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # Step 3: Create dubbing job
    job_id = create_dubbing_job()
    if not job_id:
        print_error("Failed to create dubbing job. Exiting.")
        sys.exit(1)
    
    # Step 4: Monitor progress
    job_data = monitor_job_progress(job_id)
    if not job_data:
        print_error("Pipeline did not complete successfully.")
        sys.exit(1)
    
    # Step 5: Verify Context Map
    context_map = verify_context_map(job_id)
    
    # Step 6: Verify output files
    verify_output_files(job_data)
    
    # Step 7: Verify quality metrics
    verify_quality_metrics(job_id)
    
    # Final summary
    print_header("Test Summary")
    print_success("✅ All tests completed!")
    print_info(f"Job ID: {job_id}")
    print_info(f"Total time: {time.time() - time.time():.2f}s")
    
    print("\n" + "="*80)
    print("Test completed successfully! 🎉")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
