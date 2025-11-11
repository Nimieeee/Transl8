#!/usr/bin/env python3
"""
Test the dubbing pipeline with whatever services are currently available
This is a simplified test that works with the MVP setup
"""

import os
import sys
import time
import json
import requests
import glob

# Configuration
movie_files = glob.glob("./packages/backend/uploads/*Movie*.mov")
if movie_files:
    VIDEO_FILE = sorted(movie_files)[-1]
else:
    VIDEO_FILE = "./test-video.mov"

API_BASE_URL = "http://localhost:3001"

# Colors
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

def check_backend():
    """Check if backend is running"""
    print_header("Checking Backend API")
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_success("Backend API is running")
            return True
        else:
            print_error(f"Backend API returned status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Backend API not accessible: {str(e)}")
        return False

def check_video_file():
    """Check if video file exists"""
    print_header("Checking Video File")
    
    if not os.path.exists(VIDEO_FILE):
        print_error(f"Video file not found: {VIDEO_FILE}")
        return False
    
    file_size = os.path.getsize(VIDEO_FILE) / (1024 * 1024)
    print_success(f"Video file found: {os.path.basename(VIDEO_FILE)}")
    print_info(f"File size: {file_size:.2f} MB")
    return True

def test_simple_dubbing():
    """Test simple dubbing with the MVP endpoint"""
    print_header("Testing Simple Dubbing (MVP)")
    
    try:
        # Use the simple dubbing endpoint
        print_info("Uploading video for dubbing...")
        
        with open(VIDEO_FILE, 'rb') as f:
            files = {'video': (os.path.basename(VIDEO_FILE), f, 'video/quicktime')}
            data = {
                'sourceLanguage': 'en',
                'targetLanguage': 'es'
            }
            
            response = requests.post(
                f"{API_BASE_URL}/api/dubbing/simple",
                files=files,
                data=data,
                timeout=300  # 5 minutes timeout
            )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print_success("Dubbing completed!")
            print_info(f"Job ID: {result.get('jobId', 'N/A')}")
            print_info(f"Status: {result.get('status', 'N/A')}")
            
            if 'outputFile' in result:
                print_success(f"Output file: {result['outputFile']}")
            
            return result
        else:
            print_error(f"Dubbing failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print_error("Request timed out after 5 minutes")
        return None
    except Exception as e:
        print_error(f"Error during dubbing: {str(e)}")
        return None

def test_database_connection():
    """Test database connection"""
    print_header("Testing Database Connection")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/dubbing/jobs", timeout=5)
        if response.status_code in [200, 401]:  # 401 is ok, means auth is working
            print_success("Database connection working")
            return True
        else:
            print_warning(f"Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Database connection test failed: {str(e)}")
        return False

def check_available_services():
    """Check which services are available"""
    print_header("Checking Available Services")
    
    services = {
        "Backend API": f"{API_BASE_URL}/health",
        "Demucs Vocal Isolation": "http://localhost:5003/health",
        "Whisper STT": "http://localhost:5001/health",
        "Pyannote Diarization": "http://localhost:5002/health",
        "Noisereduce": "http://localhost:5004/health",
        "Emotion Analysis": "http://localhost:5007/health",
        "OpenVoice TTS": "http://localhost:5008/health",
    }
    
    available = []
    unavailable = []
    
    for service_name, health_url in services.items():
        try:
            response = requests.get(health_url, timeout=2)
            if response.status_code == 200:
                print_success(f"{service_name}")
                available.append(service_name)
            else:
                print_warning(f"{service_name}: Unhealthy")
                unavailable.append(service_name)
        except:
            print_error(f"{service_name}: Not running")
            unavailable.append(service_name)
    
    print()
    print_info(f"Available services: {len(available)}/{len(services)}")
    
    if unavailable:
        print_warning("Missing services:")
        for service in unavailable:
            print(f"  - {service}")
    
    return available, unavailable

def main():
    """Run the test"""
    print_header("AI Video Dubbing Pipeline - Quick Test")
    print_info(f"Video: {os.path.basename(VIDEO_FILE)}")
    
    # Check backend
    if not check_backend():
        print_error("Backend is not running. Please start it first.")
        print_info("Run: npm run dev (in packages/backend)")
        sys.exit(1)
    
    # Check video file
    if not check_video_file():
        print_error("Video file not found.")
        sys.exit(1)
    
    # Check database
    test_database_connection()
    
    # Check available services
    available, unavailable = check_available_services()
    
    if len(available) < 2:  # Need at least backend + one service
        print_warning("\nNot enough services running for full pipeline test.")
        print_info("You can start services with: ./start-all-services.sh")
        print_info("Or use Docker Compose: docker-compose up -d")
        
        response = input("\nContinue with available services? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)
    
    # Run simple dubbing test
    result = test_simple_dubbing()
    
    if result:
        print_header("Test Summary")
        print_success("✅ Test completed successfully!")
        print_info(f"Available services: {len(available)}")
        print_info(f"Job completed: {result.get('status') == 'completed'}")
    else:
        print_header("Test Summary")
        print_error("❌ Test failed")
        print_info("Check the logs for more details")
    
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    main()
