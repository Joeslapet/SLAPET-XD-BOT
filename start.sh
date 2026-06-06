#!/bin/bash

# XXXD-BOT Startup Script

echo "Starting XXXD-BOT Pairing Service..."

cd pairing-service

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Create .env if missing
if [ ! -f ".env" ]; then
    echo "Creating .env from example..."
    cp .env.example .env
    echo "Please edit .env with your configuration"
fi

# Start service
npm start
