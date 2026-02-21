#!/bin/bash
# start.sh - Start both the Momentum Shift React frontend and Python FastAPI backend

echo "Starting Momentum Shift..."

# 1. Start the Python Backend in the background
echo "Starting Python FastAPI Backend on port 8000..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 2. Start the Frontend (which also starts the Node Express proxy on port 3001)
echo "Starting React Frontend on port 5173 and Node Proxy on port 3001..."
npm run dev &
FRONTEND_PID=$!

# Trap SIGINT (Ctrl+C) to kill both background processes
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Wait for background processes to keep shell open
wait
