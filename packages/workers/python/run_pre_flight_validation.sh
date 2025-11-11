#!/bin/bash

# Pre-Flight Validation Runner
# This script runs the pre-flight validation tests

set -e

echo "======================================================================"
echo "Running Pre-Flight Validation Tests"
echo "======================================================================"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to script directory
cd "$SCRIPT_DIR"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found"
    exit 1
fi

# Check if required packages are installed
echo "Checking required packages..."
python3 -c "import numpy, librosa, soundfile, pydub" 2>/dev/null || {
    echo "Error: Required Python packages not installed"
    echo "Please install: numpy, librosa, soundfile, pydub"
    exit 1
}

# Run validation
echo ""
python3 pre_flight_validator.py

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "======================================================================"
    echo "✓ Pre-flight validation completed successfully"
    echo "======================================================================"
    exit 0
else
    echo ""
    echo "======================================================================"
    echo "✗ Pre-flight validation failed"
    echo "======================================================================"
    exit 1
fi
