#!/bin/bash

# API Monitor CLI Example
# Usage: ./examples/cli-example.sh

API_URL="http://localhost:3001/api"
API_KEY="your-api-key-here"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "API Monitor CLI Example"
echo "======================="
echo ""

# Create monitor
echo "Creating monitor..."
MONITOR_RESPONSE=$(curl -s -X POST "$API_URL/monitors" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub API",
    "url": "https://api.github.com/users/filipmarinca",
    "method": "GET",
    "interval": 300000,
    "timeout": 30000,
    "expectedStatus": 200,
    "regions": ["us-east"]
  }')

MONITOR_ID=$(echo $MONITOR_RESPONSE | jq -r '.id')
echo -e "${GREEN}Monitor created: $MONITOR_ID${NC}"
echo ""

# Trigger manual check
echo "Triggering manual check..."
curl -s -X POST "$API_URL/monitors/$MONITOR_ID/trigger" \
  -H "X-API-Key: $API_KEY" | jq .
echo ""

# Wait for check to complete
echo "Waiting for check to complete..."
sleep 5

# Get stats
echo "Fetching statistics..."
STATS=$(curl -s "$API_URL/checks/stats?monitorId=$MONITOR_ID&period=1h" \
  -H "X-API-Key: $API_KEY")

UPTIME=$(echo $STATS | jq -r '.uptime')
AVG_RESPONSE=$(echo $STATS | jq -r '.responseTime.avg')
TOTAL_CHECKS=$(echo $STATS | jq -r '.totalChecks')

echo -e "${GREEN}Uptime: ${UPTIME}%${NC}"
echo -e "${YELLOW}Avg Response Time: ${AVG_RESPONSE}ms${NC}"
echo -e "Total Checks: $TOTAL_CHECKS"
echo ""

# List all monitors
echo "All monitors:"
curl -s "$API_URL/monitors" \
  -H "X-API-Key: $API_KEY" | jq -r '.[] | "- \(.name) (\(.enabled | if . then "enabled" else "disabled" end))"'
echo ""

echo -e "${GREEN}Example completed successfully!${NC}"
