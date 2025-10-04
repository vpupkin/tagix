#!/bin/bash

echo "🔄 Restarting services with kar.bar configuration..."

# Kill any existing processes
echo "🛑 Stopping existing services..."
pkill -f "uvicorn.*server:app" || true
pkill -f "craco start" || true
pkill -f "react-scripts start" || true

# Wait a moment for processes to stop
sleep 2

# Start backend
echo "🚀 Starting backend server..."
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "🚀 Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "✅ Services started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Access your application at: https://kar.bar:3000"
echo "🔧 Backend API at: https://kar.bar:8001"
echo ""
echo "To stop services, run: pkill -f 'uvicorn.*server:app' && pkill -f 'craco start'"
