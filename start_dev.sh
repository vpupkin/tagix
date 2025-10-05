#!/bin/bash

# Development startup script for both local and production environments
# Usage: ./start_dev.sh [local|prod]

set -e

# Default to local if no argument provided
ENV=${1:-local}

echo "🚀 Starting Tagix application in $ENV mode..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
sleep 2

if [ "$ENV" = "local" ]; then
    echo "🏠 Starting in LOCAL development mode..."
    
    # Set environment variables for local development
    export REACT_APP_BACKEND_URL=http://localhost:8001
    
    # Start backend
    echo "🔧 Starting backend server on localhost:8001..."
    cd /home/i1/git/tagix/backend
    python3 server.py &
    BACKEND_PID=$!
    
    # Wait for backend to start
    echo "⏳ Waiting for backend to start..."
    sleep 3
    
    # Check if backend is running
    if curl -s http://localhost:8001/health >/dev/null 2>&1; then
        echo "✅ Backend is running on localhost:8001"
    else
        echo "❌ Backend failed to start"
        exit 1
    fi
    
    # Start frontend
    echo "🎨 Starting frontend development server on localhost:3000..."
    cd /home/i1/git/tagix/frontend
    yarn start &
    FRONTEND_PID=$!
    
    echo "✅ Both services started successfully!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend: http://localhost:8001"
    echo "📊 WebSocket: ws://localhost:3000/ws (proxied to backend)"
    
elif [ "$ENV" = "prod" ]; then
    echo "🌐 Starting in PRODUCTION mode..."
    
    # Set environment variables for production
    export REACT_APP_BACKEND_URL=https://kar.bar/be
    
    # Start backend (assuming it's already configured for production)
    echo "🔧 Starting backend server for production..."
    cd /home/i1/git/tagix/backend
    python3 server.py &
    BACKEND_PID=$!
    
    # Start frontend
    echo "🎨 Starting frontend for production..."
    cd /home/i1/git/tagix/frontend
    yarn start &
    FRONTEND_PID=$!
    
    echo "✅ Production services started!"
    echo "🌐 Frontend: http://localhost:3000 (configured for kar.bar)"
    echo "🔧 Backend: https://kar.bar/be"
    echo "📊 WebSocket: wss://kar.bar/be/ws"
    
else
    echo "❌ Invalid environment. Use 'local' or 'prod'"
    echo "Usage: ./start_dev.sh [local|prod]"
    exit 1
fi

echo ""
echo "🔄 To stop services, run: pkill -f 'python3 server.py' && pkill -f 'yarn start'"
echo "📝 Logs will appear above. Press Ctrl+C to stop this script (services will continue running)"

# Keep script running and show logs
wait
