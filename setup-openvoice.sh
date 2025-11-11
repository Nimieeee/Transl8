#!/bin/bash

# OpenVoice Setup Script
# Automates installation and configuration of OpenVoice TTS service

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🎤 OpenVoice Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "packages/workers/docker/openvoice" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

cd packages/workers/docker/openvoice

# Check for conda
if ! command -v conda &> /dev/null; then
    echo -e "${YELLOW}⚠️  Conda not found. Installing with Miniconda...${NC}"
    echo ""
    echo "Please install Miniconda first:"
    echo "  https://docs.conda.io/en/latest/miniconda.html"
    echo ""
    echo "Or on macOS with Homebrew:"
    echo "  brew install miniconda"
    echo ""
    exit 1
fi

echo -e "${BLUE}1. Creating conda environment...${NC}"
if conda env list | grep -q "^openvoice "; then
    echo -e "${YELLOW}Environment 'openvoice' already exists${NC}"
    read -p "Remove and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        conda env remove -n openvoice -y
        conda create -n openvoice python=3.9 -y
    fi
else
    conda create -n openvoice python=3.9 -y
fi

echo -e "${GREEN}✓ Environment created${NC}"
echo ""

echo -e "${BLUE}2. Cloning OpenVoice repository...${NC}"
if [ -d "OpenVoice" ]; then
    echo -e "${YELLOW}OpenVoice directory already exists${NC}"
    read -p "Remove and re-clone? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf OpenVoice
        git clone https://github.com/myshell-ai/OpenVoice.git
    fi
else
    git clone https://github.com/myshell-ai/OpenVoice.git
fi

echo -e "${GREEN}✓ Repository cloned${NC}"
echo ""

echo -e "${BLUE}3. Installing OpenVoice...${NC}"
cd OpenVoice
eval "$(conda shell.bash hook)"
conda activate openvoice
pip install -e .
cd ..

echo -e "${GREEN}✓ OpenVoice installed${NC}"
echo ""

echo -e "${BLUE}4. Downloading model checkpoints...${NC}"
echo "Choose version:"
echo "  1) V2 (Recommended - supports EN, ES, FR, ZH, JA, KR)"
echo "  2) V1 (Original version)"
read -p "Enter choice (1 or 2): " -n 1 -r
echo

if [[ $REPLY == "2" ]]; then
    # V1 Setup
    echo -e "${BLUE}Downloading V1 checkpoints...${NC}"
    if [ ! -d "checkpoints" ]; then
        wget https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_1226.zip
        unzip checkpoints_1226.zip
        rm checkpoints_1226.zip
        echo -e "${GREEN}✓ V1 checkpoints downloaded${NC}"
    else
        echo -e "${YELLOW}V1 checkpoints already exist${NC}"
    fi
else
    # V2 Setup (default)
    echo -e "${BLUE}Downloading V2 checkpoints...${NC}"
    if [ ! -d "checkpoints_v2" ]; then
        wget https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_v2_0417.zip
        unzip checkpoints_v2_0417.zip
        rm checkpoints_v2_0417.zip
        echo -e "${GREEN}✓ V2 checkpoints downloaded${NC}"
    else
        echo -e "${YELLOW}V2 checkpoints already exist${NC}"
    fi
    
    echo -e "${BLUE}Installing MeloTTS...${NC}"
    pip install git+https://github.com/myshell-ai/MeloTTS.git
    python -m unidic download
    echo -e "${GREEN}✓ MeloTTS installed${NC}"
fi

echo ""

echo -e "${BLUE}5. Installing service dependencies...${NC}"
pip install flask werkzeug torch torchaudio numpy
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${BLUE}6. Creating directories...${NC}"
mkdir -p models clones temp
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Create activation script
cat > activate-openvoice.sh << 'EOF'
#!/bin/bash
eval "$(conda shell.bash hook)"
conda activate openvoice
echo "OpenVoice environment activated"
echo "Start service with: python openvoice_service.py"
EOF

chmod +x activate-openvoice.sh

echo "=========================================="
echo -e "${GREEN}🎉 OpenVoice Setup Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}To start the service:${NC}"
echo ""
echo "  cd packages/workers/docker/openvoice"
echo "  source activate-openvoice.sh"
echo "  python openvoice_service.py"
echo ""
echo -e "${BLUE}Or use the pipeline script:${NC}"
echo ""
echo "  ./start-pipeline-services.sh"
echo ""
echo -e "${BLUE}Test the service:${NC}"
echo ""
echo "  curl http://localhost:8007/health"
echo ""
