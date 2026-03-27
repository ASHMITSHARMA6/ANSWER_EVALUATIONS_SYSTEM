#!/bin/bash

# AUTOSTART SCRIPT - Just run this to start everything
# Usage: bash start.sh

echo "🚀 Starting Vector Evaluation System..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 18+ and try again."
    exit 1
fi

# Check if MongoDB is running
echo "⏳ Checking MongoDB..."
if ! nc -z localhost 27017 2>/dev/null; then
    echo "⚠️  MongoDB not running on localhost:27017"
    echo "   Start MongoDB: mongod"
    echo "   Or use MongoDB Atlas (update MONGODB_URI in .env)"
fi

echo ""
echo "=== BACKEND SETUP ==="
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Edit .env file with your MongoDB URI and API keys"
fi

echo "Running seed..."
npm run seed

echo ""
echo "🟢 Starting backend (port 5000)..."
npm start &
BACKEND_PID=$!

echo ""
echo "=== FRONTEND SETUP ==="
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

echo ""
echo "🟡 Starting frontend (port 3000)..."
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Both services starting..."
echo "🌐 Backend:  http://localhost:5000"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "📧 Login: teacher@test.com / teacher123"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Handle cleanup
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
