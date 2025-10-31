#!/bin/bash

###############################################################################
# Restart Backend و تست کامل Flow
###############################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 مراحل Restart و تست:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Backend رو متوقف کن (Ctrl+C در terminal که backend اجراست)"
echo "2. بعد این دستور رو بزن:"
echo ""
echo -e "${GREEN}   cd /home/mehdi/all/repositories/github.com/mercur/apps/backend${NC}"
echo -e "${GREEN}   yarn dev${NC}"
echo ""
echo "3. صبر کن تا backend بالا بیاد (تا ببینی: Server ready)"
echo ""
echo "4. در terminal دیگه، این اسکریپت رو اجرا کن:"
echo ""
echo -e "${GREEN}   bash /home/mehdi/all/repositories/github.com/mercur/apps/backend/test-full-signup-flow.sh${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"




