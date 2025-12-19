#!/bin/bash

set -e

echo "🛑 Stopping Auction Infrastructure..."

cd "$(dirname "$0")/.."

COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

$COMPOSE_CMD -f docker-compose.auction.yml down

echo "✅ All services stopped"
echo ""
echo "💡 To remove volumes (data will be lost), run:"
echo "   $COMPOSE_CMD -f docker-compose.auction.yml down -v"
echo ""






