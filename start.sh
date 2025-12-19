#!/bin/bash
###############################################################################
# Portfolio AI - Quick Start Script
# Use this to quickly start the server for testing
###############################################################################

echo "🚀 Starting Portfolio AI Server..."

cd "$(dirname "$0")"

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "📦 Using PM2 (recommended)"

    # Stop if already running
    pm2 stop portai-api 2>/dev/null || true

    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save

    echo ""
    echo "✅ Server started with PM2"
    echo "   View logs: pm2 logs portai-api"
    echo "   Restart: pm2 restart portai-api"
    echo "   Stop: pm2 stop portai-api"
else
    echo "⚠️  PM2 not found. Starting with node directly..."
    echo "   For production, install PM2: npm install -g pm2"
    echo ""

    # Start directly
    cd api
    node server.js
fi
