#!/bin/bash

###############################################################################
# Fix Elasticsearch Configuration (Remove Duplicates)
# برای وقتی که Elasticsearch بالا اومده ولی Empty reply میده
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Fix Elasticsearch Configuration${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run with sudo${NC}" 
   exit 1
fi

# Check if Elasticsearch is installed
if [ ! -f /etc/elasticsearch/elasticsearch.yml ]; then
    echo -e "${RED}✗ Elasticsearch config not found${NC}"
    exit 1
fi

echo -e "${BLUE}▶ Checking current configuration...${NC}"

# Show current duplicates
echo -e "${YELLOW}Current config status:${NC}"
grep -n "xpack.security\|network.host\|http.port" /etc/elasticsearch/elasticsearch.yml || true
echo ""

# Backup
echo -e "${BLUE}▶ Creating backup...${NC}"
cp /etc/elasticsearch/elasticsearch.yml /etc/elasticsearch/elasticsearch.yml.fix-backup-$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backup created${NC}"

# Remove duplicates
echo -e "${BLUE}▶ Removing duplicate configurations...${NC}"
sed -i '/^xpack.security.enabled/d' /etc/elasticsearch/elasticsearch.yml
sed -i '/^network.host/d' /etc/elasticsearch/elasticsearch.yml
sed -i '/^http.port/d' /etc/elasticsearch/elasticsearch.yml
sed -i '/^cluster.name/d' /etc/elasticsearch/elasticsearch.yml
sed -i '/^node.name/d' /etc/elasticsearch/elasticsearch.yml
echo -e "${GREEN}✓ Duplicates removed${NC}"

# Add correct configuration
echo -e "${BLUE}▶ Adding correct configuration...${NC}"
cat >> /etc/elasticsearch/elasticsearch.yml << 'EOF'

# Marketplace configuration (added by fix script)
cluster.name: marketplace-cluster
node.name: node-1
network.host: localhost
http.port: 9200
xpack.security.enabled: false
EOF
echo -e "${GREEN}✓ Configuration added${NC}"

# Restart Elasticsearch
echo -e "${BLUE}▶ Restarting Elasticsearch...${NC}"
systemctl restart elasticsearch
echo -e "${GREEN}✓ Elasticsearch restarted${NC}"

# Wait for Elasticsearch to be ready
echo ""
echo -e "${YELLOW}⏳ Waiting for Elasticsearch to be ready (30-60 seconds)...${NC}"

max_wait=60
counter=0
while [ $counter -lt $max_wait ]; do
    if curl -s localhost:9200 > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Elasticsearch is now responding!${NC}"
        echo ""
        echo -e "${BLUE}Test result:${NC}"
        curl -s localhost:9200 | grep -E "name|cluster_name|version" | head -5
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✓ Fix completed successfully!${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
        exit 0
    fi
    echo -n "."
    sleep 1
    counter=$((counter + 1))
done

echo ""
echo -e "${YELLOW}⚠ Elasticsearch is taking longer than expected${NC}"
echo ""
echo -e "${BLUE}Check status with:${NC}"
echo "  sudo systemctl status elasticsearch"
echo "  sudo journalctl -u elasticsearch -n 50"
echo "  curl -v localhost:9200"
echo ""

exit 1


















