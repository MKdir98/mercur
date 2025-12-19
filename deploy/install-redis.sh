#!/bin/bash

###############################################################################
# Redis Quick Install Script
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Redis Installation Script${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run with sudo${NC}" 
   exit 1
fi

# Check if already installed
if command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠ Redis is already installed${NC}"
    echo -e "${BLUE}ℹ Checking if it's running...${NC}"
    
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis is running!${NC}"
        redis-cli --version
        exit 0
    else
        echo -e "${YELLOW}⚠ Redis is installed but not running${NC}"
        echo -e "${BLUE}ℹ Starting Redis...${NC}"
        systemctl start redis-server
        sleep 2
        if redis-cli ping &> /dev/null; then
            echo -e "${GREEN}✓ Redis started successfully!${NC}"
            exit 0
        else
            echo -e "${RED}✗ Failed to start Redis${NC}"
            echo -e "${BLUE}ℹ Check logs: sudo journalctl -u redis-server${NC}"
            exit 1
        fi
    fi
fi

echo -e "${BLUE}ℹ Starting installation...${NC}"
echo ""

# Install Redis
echo -e "${BLUE}▶ Installing Redis...${NC}"
apt-get update -qq
apt-get install -y redis-server
echo -e "${GREEN}✓ Redis installed${NC}"

# Start and enable Redis
echo -e "${BLUE}▶ Starting Redis service...${NC}"
systemctl enable redis-server > /dev/null 2>&1
systemctl start redis-server
echo -e "${GREEN}✓ Redis service started${NC}"

# Test Redis
echo -e "${BLUE}▶ Testing Redis connection...${NC}"
sleep 2

if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is working!${NC}"
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ Installation completed successfully!${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Redis info:${NC}"
    redis-cli --version
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  Status:  sudo systemctl status redis-server"
    echo "  Restart: sudo systemctl restart redis-server"
    echo "  Logs:    sudo journalctl -u redis-server"
    echo "  Test:    redis-cli ping"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Redis is not responding${NC}"
    echo -e "${BLUE}ℹ Check logs: sudo journalctl -u redis-server${NC}"
    exit 1
fi



















