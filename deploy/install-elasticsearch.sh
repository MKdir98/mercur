#!/bin/bash

###############################################################################
# Elasticsearch Quick Install Script
# برای Ubuntu 22.04+ (با روش جدید GPG)
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Elasticsearch 8.x Installation Script${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run with sudo${NC}" 
   exit 1
fi

# Check if already installed
if command -v /usr/share/elasticsearch/bin/elasticsearch &> /dev/null; then
    echo -e "${YELLOW}⚠ Elasticsearch is already installed${NC}"
    echo -e "${BLUE}ℹ Checking if it's running...${NC}"
    
    if curl -s localhost:9200 &> /dev/null; then
        echo -e "${GREEN}✓ Elasticsearch is running!${NC}"
        curl -s localhost:9200 | grep -E "number|cluster_name"
        exit 0
    else
        echo -e "${YELLOW}⚠ Elasticsearch is installed but not running${NC}"
        echo -e "${BLUE}ℹ Starting Elasticsearch...${NC}"
        systemctl start elasticsearch
        sleep 10
        if curl -s localhost:9200 &> /dev/null; then
            echo -e "${GREEN}✓ Elasticsearch started successfully!${NC}"
            exit 0
        else
            echo -e "${RED}✗ Failed to start Elasticsearch${NC}"
            echo -e "${BLUE}ℹ Check logs: sudo journalctl -u elasticsearch${NC}"
            exit 1
        fi
    fi
fi

echo -e "${BLUE}ℹ Starting installation...${NC}"
echo ""

# 1. Install prerequisites
echo -e "${BLUE}▶ Installing prerequisites...${NC}"
apt-get update -qq
apt-get install -y wget curl gpg > /dev/null 2>&1
echo -e "${GREEN}✓ Prerequisites installed${NC}"

# 2. Add GPG Key (new method for Ubuntu 22.04+)
echo -e "${BLUE}▶ Adding Elasticsearch GPG key...${NC}"
if [ -f /usr/share/keyrings/elasticsearch-keyring.gpg ]; then
    rm -f /usr/share/keyrings/elasticsearch-keyring.gpg
fi
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo -e "${GREEN}✓ GPG key added${NC}"

# 3. Add repository
echo -e "${BLUE}▶ Adding Elasticsearch repository...${NC}"
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list > /dev/null
echo -e "${GREEN}✓ Repository added${NC}"

# 4. Install Elasticsearch
echo -e "${BLUE}▶ Installing Elasticsearch (this may take a few minutes)...${NC}"
apt-get update -qq
apt-get install -y elasticsearch
echo -e "${GREEN}✓ Elasticsearch installed${NC}"

# 5. Configure for local development
echo -e "${BLUE}▶ Configuring Elasticsearch...${NC}"

# Backup original config
cp /etc/elasticsearch/elasticsearch.yml /etc/elasticsearch/elasticsearch.yml.backup

# Remove any existing duplicate configurations first
sed -i '/^cluster.name:/d' /etc/elasticsearch/elasticsearch.yml
sed -i '/^node.name:/d' /etc/elasticsearch/elasticsearch.yml
sed -i '/^network.host:/d' /etc/elasticsearch/elasticsearch.yml
sed -i '/^http.port:/d' /etc/elasticsearch/elasticsearch.yml
sed -i '/^xpack.security.enabled:/d' /etc/elasticsearch/elasticsearch.yml

# Add our configurations (only once)
cat >> /etc/elasticsearch/elasticsearch.yml << EOF

# Added by install script
cluster.name: marketplace-cluster
node.name: node-1
network.host: localhost
http.port: 9200

# Disable security for local development
xpack.security.enabled: false
EOF

echo -e "${GREEN}✓ Configuration updated${NC}"

# 6. Start Elasticsearch
echo -e "${BLUE}▶ Starting Elasticsearch service...${NC}"
systemctl daemon-reload
systemctl enable elasticsearch > /dev/null 2>&1
systemctl start elasticsearch

echo -e "${GREEN}✓ Elasticsearch service started${NC}"

# 7. Wait for Elasticsearch to be ready
echo ""
echo -e "${YELLOW}⏳ Waiting for Elasticsearch to be ready (this takes 30-60 seconds)...${NC}"

max_wait=60
counter=0
while [ $counter -lt $max_wait ]; do
    if curl -s localhost:9200 > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Elasticsearch is ready!${NC}"
        echo ""
        echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✓ Installation completed successfully!${NC}"
        echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${BLUE}Elasticsearch info:${NC}"
        curl -s localhost:9200 | grep -E "name|cluster_name|version" | head -5
        echo ""
        echo -e "${BLUE}Useful commands:${NC}"
        echo "  Status:  sudo systemctl status elasticsearch"
        echo "  Restart: sudo systemctl restart elasticsearch"
        echo "  Logs:    sudo journalctl -u elasticsearch"
        echo "  Test:    curl localhost:9200"
        echo ""
        exit 0
    fi
    echo -n "."
    sleep 1
    counter=$((counter + 1))
done

echo ""
echo -e "${RED}✗ Elasticsearch did not start within $max_wait seconds${NC}"
echo -e "${YELLOW}⚠ This might be normal - Elasticsearch can take longer on slower systems${NC}"
echo ""
echo -e "${BLUE}Check the status with:${NC}"
echo "  sudo systemctl status elasticsearch"
echo "  sudo journalctl -u elasticsearch -n 50"
echo ""
echo -e "${BLUE}Try testing in a few minutes:${NC}"
echo "  curl localhost:9200"
echo ""

exit 1

