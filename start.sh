#!/bin/bash
set -e

# Build frontend
echo "=== Building frontend ==="
cd dashboard-frontend
npm install
npm run build

# Start backend
echo "=== Starting backend ==="
cd ../backend
uvicorn main:app --host 0.0.0.0 --port $PORT
