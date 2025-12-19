#!/bin/bash

set -e

echo "🚀 Starting Auction Infrastructure..."

cd "$(dirname "$0")/.."

if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

echo "📦 Starting services with $COMPOSE_CMD..."
$COMPOSE_CMD -f docker-compose.auction.yml up -d

echo "⏳ Waiting for services to be healthy..."

check_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if $COMPOSE_CMD -f docker-compose.auction.yml ps $service | grep -q "healthy\|Up"; then
            echo "✅ $service is ready"
            return 0
        fi
        echo "⏳ Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service failed to become healthy"
    return 1
}

check_service "zookeeper"
check_service "kafka"
check_service "redis"
check_service "elasticsearch"

echo ""
echo "🎉 All services are up and running!"
echo ""
echo "📊 Service URLs:"
echo "  - Kafka: localhost:9092"
echo "  - Kafka UI: http://localhost:8080"
echo "  - Redis: localhost:6379"
echo "  - Elasticsearch: http://localhost:9200"
echo ""
echo "🔧 Next steps:"
echo "  1. Copy apps/backend/.env.auction.example to apps/backend/.env (or merge with existing)"
echo "  2. Update ZARINPAL_MERCHANT_ID in .env"
echo "  3. Run: npm run create-kafka-topics"
echo "  4. Run: npm run setup-elasticsearch-indices"
echo ""






