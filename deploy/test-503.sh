#!/bin/bash

###############################################################################
# 503 Error Testing Script
# Tests concurrent requests to identify 503 issues
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_URL="${1:-http://localhost:9000}"
NUM_REQUESTS="${2:-50}"
CONCURRENT="${3:-10}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           503 Error Concurrent Request Tester            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Backend URL:      $BACKEND_URL"
echo "  Total Requests:   $NUM_REQUESTS"
echo "  Concurrent:       $CONCURRENT"
echo ""

# Create temp directory for results
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo -e "${YELLOW}Starting test...${NC}"
echo ""

# Function to make a single request
make_request() {
    local id=$1
    local url=$2
    local output_file=$3
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time 10 \
        --connect-timeout 5 \
        "$url" 2>/dev/null)
    
    echo "$http_code" > "$output_file"
}

# Make concurrent requests
start_time=$(date +%s)

for ((i=1; i<=NUM_REQUESTS; i++)); do
    make_request $i "$BACKEND_URL/health" "$TEMP_DIR/result_$i.txt" &
    
    # Limit concurrency
    if (( i % CONCURRENT == 0 )); then
        wait
    fi
done

# Wait for all remaining requests
wait

end_time=$(date +%s)
duration=$((end_time - start_time))

# Analyze results
echo -e "${BLUE}Analyzing results...${NC}"
echo ""

total=0
success=0
error_503=0
error_502=0
error_500=0
error_timeout=0
error_other=0

for file in "$TEMP_DIR"/result_*.txt; do
    if [ -f "$file" ]; then
        total=$((total + 1))
        code=$(cat "$file")
        
        case "$code" in
            200|201|204)
                success=$((success + 1))
                ;;
            503)
                error_503=$((error_503 + 1))
                ;;
            502)
                error_502=$((error_502 + 1))
                ;;
            500)
                error_500=$((error_500 + 1))
                ;;
            000)
                error_timeout=$((error_timeout + 1))
                ;;
            *)
                error_other=$((error_other + 1))
                ;;
        esac
    fi
done

# Calculate percentages
success_rate=$(awk "BEGIN {printf \"%.2f\", ($success/$total)*100}")
error_rate=$(awk "BEGIN {printf \"%.2f\", (($total-$success)/$total)*100}")

# Display results
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      Test Results                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Duration:         ${duration}s"
echo "Total Requests:   $total"
echo ""

if [ $success -eq $total ]; then
    echo -e "${GREEN}✓ Success:        $success ($success_rate%)${NC}"
else
    echo -e "${YELLOW}✓ Success:        $success ($success_rate%)${NC}"
fi

if [ $error_503 -gt 0 ]; then
    echo -e "${RED}✗ 503 Errors:     $error_503${NC}"
fi

if [ $error_502 -gt 0 ]; then
    echo -e "${RED}✗ 502 Errors:     $error_502${NC}"
fi

if [ $error_500 -gt 0 ]; then
    echo -e "${RED}✗ 500 Errors:     $error_500${NC}"
fi

if [ $error_timeout -gt 0 ]; then
    echo -e "${RED}✗ Timeouts:       $error_timeout${NC}"
fi

if [ $error_other -gt 0 ]; then
    echo -e "${RED}✗ Other Errors:   $error_other${NC}"
fi

echo ""
echo -e "${BLUE}Error Rate:       $error_rate%${NC}"
echo ""

# Recommendations
if [ $error_503 -gt 0 ]; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                    Recommendations                        ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "503 errors detected! Possible causes:"
    echo ""
    echo "1. Backend overloaded"
    echo "   → Check: pm2 status"
    echo "   → Fix: Increase instances or resources"
    echo ""
    echo "2. Nginx keepalive connections exhausted"
    echo "   → Check: netstat -an | grep :9000 | wc -l"
    echo "   → Fix: Increase keepalive in nginx config"
    echo ""
    echo "3. Backend slow to respond"
    echo "   → Check: pm2 logs backend-production"
    echo "   → Fix: Optimize slow queries/operations"
    echo ""
    echo "4. Connection pool exhausted"
    echo "   → Check: Database/Redis connection limits"
    echo "   → Fix: Increase pool sizes"
    echo ""
    echo "Run diagnostics: sudo bash deploy.sh production.properties diagnose"
    echo ""
elif [ $error_502 -gt 0 ]; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                    Recommendations                        ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "502 errors detected! Backend is down or unreachable."
    echo ""
    echo "Check backend status: pm2 status"
    echo "Check backend logs: pm2 logs backend-production --err"
    echo "Restart if needed: pm2 restart backend-production"
    echo ""
elif [ $success -eq $total ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  All Tests Passed! ✓                      ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "No errors detected. System is handling concurrent requests well."
    echo ""
fi

# Exit with error code if there were failures
if [ $success -eq $total ]; then
    exit 0
else
    exit 1
fi
