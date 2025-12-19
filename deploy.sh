#!/bin/bash

###############################################################################
# Portfolio AI - Deployment Script
# Run this script to deploy/update the application
###############################################################################

set -e  # Exit on error

echo "======================================"
echo "Portfolio AI - Deployment Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to portai directory
cd "$(dirname "$0")"
PORTAI_DIR=$(pwd)

echo -e "${YELLOW}📁 Working directory: $PORTAI_DIR${NC}"
echo ""

# Step 1: Install/Update Dependencies
echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
cd "$PORTAI_DIR/api"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Check Database Connection
echo -e "${YELLOW}🗄️  Testing database connection...${NC}"
source "$PORTAI_DIR/api/.env"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your database credentials in api/.env"
    exit 1
fi
echo ""

# Step 3: Initialize Database Tables
echo -e "${YELLOW}🔧 Initializing database tables...${NC}"
node -e "const db = require('./db'); db.initTables().then(() => { console.log('Tables ready'); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });"
echo -e "${GREEN}✅ Database tables ready${NC}"
echo ""

# Step 4: Update Nginx Configuration (manual step reminder)
echo -e "${YELLOW}⚙️  Nginx Configuration${NC}"
if diff -q "$PORTAI_DIR/nginx-complete-config.conf" /etc/nginx/sites-available/sol.inoutconnect.com > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx config is up to date${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx config needs update. Run these commands:${NC}"
    echo ""
    echo "  sudo cp $PORTAI_DIR/nginx-complete-config.conf /etc/nginx/sites-available/sol.inoutconnect.com"
    echo "  sudo nginx -t"
    echo "  sudo systemctl reload nginx"
    echo ""
    read -p "Have you updated nginx config? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Please update nginx config and run this script again${NC}"
        exit 1
    fi
fi
echo ""

# Step 5: Start/Restart PM2
echo -e "${YELLOW}🚀 Starting API server with PM2...${NC}"
if pm2 describe portai-api > /dev/null 2>&1; then
    echo "Restarting existing PM2 process..."
    pm2 restart portai-api
else
    echo "Starting new PM2 process..."
    cd "$PORTAI_DIR"
    pm2 start ecosystem.config.js
fi

pm2 save
echo -e "${GREEN}✅ API server started${NC}"
echo ""

# Step 6: Verify Services
echo -e "${YELLOW}🔍 Verifying services...${NC}"

# Check PM2
if pm2 describe portai-api | grep -q "online"; then
    echo -e "${GREEN}✅ PM2: portai-api is online${NC}"
else
    echo -e "${RED}❌ PM2: portai-api is not running${NC}"
    pm2 logs portai-api --lines 20
    exit 1
fi

# Check API health
sleep 2
if curl -s http://localhost:3001/api/health | grep -q "ok"; then
    echo -e "${GREEN}✅ API: Health check passed${NC}"
else
    echo -e "${RED}❌ API: Health check failed${NC}"
    exit 1
fi

# Check Nginx
if sudo nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx: Configuration valid${NC}"
else
    echo -e "${RED}❌ Nginx: Configuration has errors${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo "======================================"
echo ""
echo "Application is ready at:"
echo "  🌐 https://sol.inoutconnect.com/portai/"
echo ""
echo "Useful commands:"
echo "  pm2 logs portai-api      - View logs"
echo "  pm2 restart portai-api   - Restart server"
echo "  pm2 stop portai-api      - Stop server"
echo ""
