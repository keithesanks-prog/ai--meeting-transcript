#!/bin/bash
# Quick start script for AI Meeting Transcripts

echo "🚀 Starting AI Meeting Transcripts Application..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating Python virtual environment..."
source venv/bin/activate

# Install Python dependencies
if [ ! -f "venv/.deps_installed" ]; then
    echo "📥 Installing Python dependencies..."
    pip install -r requirements.txt
    touch venv/.deps_installed
fi

# Install Node dependencies
if [ ! -d "node_modules" ]; then
    echo "📥 Installing Node dependencies..."
    npm install
fi

# Create data directory
mkdir -p data

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  Terminal 1: python backend.py"
echo "  Terminal 2: npm run dev"
echo ""
echo "Or run both in background:"
echo "  ./start.sh"
echo ""

