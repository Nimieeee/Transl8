#!/bin/bash

echo "📊 Monitoring Ultimate AI Dubbing Setup"
echo "========================================"
echo ""

while true; do
    clear
    echo "📊 Setup Progress Monitor"
    echo "========================"
    echo ""
    echo "Last 30 lines of output:"
    echo "------------------------"
    
    # Get the last 30 lines from the process
    tail -30 /tmp/setup_output.log 2>/dev/null || echo "Waiting for setup to start..."
    
    echo ""
    echo "Press Ctrl+C to stop monitoring"
    echo "Setup log: tail -f /tmp/setup_output.log"
    
    sleep 2
done
