#!/bin/bash

###############################################################################
# Install Required Services (Redis + Elasticsearch)
# نصب سرویس‌های مورد نیاز برای Marketplace
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Install Required Services for Marketplace              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run with sudo${NC}"
   echo ""
   echo "Usage: sudo bash install-services.sh"
   exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}ℹ This script will install:${NC}"
echo "  1. Redis (cache & session store)"
echo "  2. Elasticsearch (search engine)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠ Installation cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Step 1/2: Installing Redis${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

bash "$SCRIPT_DIR/install-redis.sh"
REDIS_STATUS=$?

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Step 2/2: Installing Elasticsearch${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

bash "$SCRIPT_DIR/install-elasticsearch.sh"
ELASTICSEARCH_STATUS=$?

echo ""
echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Installation Summary                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ $REDIS_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Redis:         Installed and running${NC}"
else
    echo -e "${RED}✗ Redis:         Installation failed${NC}"
fi

if [ $ELASTICSEARCH_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Elasticsearch: Installed and running${NC}"
else
    echo -e "${RED}✗ Elasticsearch: Installation failed or still starting${NC}"
fi

echo ""

if [ $REDIS_STATUS -eq 0 ] && [ $ELASTICSEARCH_STATUS -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ All services installed successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Edit your configuration: nano production.properties"
    echo "  2. Deploy: sudo bash deploy.sh production.properties deploy"
    echo ""
    exit 0
else
    echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}⚠ Some services failed to install or are still starting${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Check the logs above for details${NC}"
    echo ""
    echo -e "${BLUE}You can check service status with:${NC}"
    echo "  Redis:         sudo systemctl status redis-server"
    echo "  Elasticsearch: sudo systemctl status elasticsearch"
    echo ""
    exit 1
fi



















