# Auction System Deployment Guide

## Overview

This guide provides instructions for deploying the Auction system infrastructure in production.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- At least 4GB RAM
- 20GB free disk space
- Root or sudo access

## Infrastructure Components

1. **Kafka + Zookeeper** - Message broker for bid processing
2. **Redis** - Caching and session management
3. **Elasticsearch** - Logging and monitoring
4. **PostgreSQL** - Main database (already existing)

## Production Setup

### 1. Kafka Cluster Setup

#### Single Node (Development/Small Scale)

Use the provided `docker-compose.auction.yml` with minor modifications:

```bash
cd /path/to/mercur
docker-compose -f docker-compose.auction.yml up -d
```

#### Multi-Node (Production)

For production, deploy Kafka cluster with at least 3 brokers:

```yaml
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
```

Configure each broker with unique `KAFKA_BROKER_ID` and update `KAFKA_ZOOKEEPER_CONNECT`.

### 2. Redis Cluster Setup

For high availability, use Redis Sentinel or Redis Cluster:

#### Redis Sentinel (Recommended)

```bash
apt-get install redis-sentinel
```

Configure 3 sentinel nodes monitoring 1 master and 2 replicas.

#### Redis Configuration for Persistence

```conf
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 3. Elasticsearch Setup

#### Production Configuration

```yaml
elasticsearch:
  environment:
    - cluster.name=mercur-production
    - node.name=es-node-1
    - discovery.seed_hosts=es-node-2,es-node-3
    - cluster.initial_master_nodes=es-node-1,es-node-2,es-node-3
    - xpack.security.enabled=true
    - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
```

Enable security and configure users:

```bash
docker exec mercur-elasticsearch bin/elasticsearch-setup-passwords auto
```

### 4. Environment Variables

Copy and configure environment variables:

```bash
cd apps/backend
cp .env.auction.example .env
```

Update production values:

```bash
# Kafka
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
KAFKA_CLIENT_ID=mercur-backend-prod
KAFKA_GROUP_ID=auction-consumer-prod

# Redis
REDIS_URL=redis://redis-master:6379
REDIS_CACHE_TTL=300

# Zarinpal
ZARINPAL_MERCHANT_ID=your-actual-merchant-id
ZARINPAL_SANDBOX=false
ZARINPAL_CALLBACK_URL=https://yourdomain.com/wallet/deposit/verify

# WebSocket
WEBSOCKET_PORT=3001
WEBSOCKET_CORS_ORIGIN=https://yourdomain.com

# Elasticsearch
ELASTICSEARCH_NODE=https://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password

# Auction
AUCTION_MODULE_ENABLED=false
```

### 5. Initialize Topics and Indices

```bash
npm run auction:kafka:topics
npm run auction:es:indices
```

### 6. Backend Node Configuration

#### Load Balancer Setup (Nginx)

For WebSocket support with multiple backend nodes, configure sticky sessions:

```nginx
upstream backend_nodes {
    ip_hash;
    server backend-node-1:3001;
    server backend-node-2:3001;
    server backend-node-3:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location /socket.io/ {
        proxy_pass http://backend_nodes;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://backend_nodes;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Backend Scaling

Deploy multiple backend instances:

```bash
docker-compose up --scale backend=3
```

Only ONE instance will act as Kafka consumer (automatic leader election).

### 7. Health Checks

Configure health check endpoints in your orchestrator (K8s, Docker Swarm):

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

Run manual health check:

```bash
npm run auction:health
```

### 8. Monitoring Setup

#### Prometheus Metrics

Install Kafka Exporter:

```bash
docker run -d -p 9308:9308 \
  danielqsj/kafka-exporter \
  --kafka.server=kafka:9092
```

Install Redis Exporter:

```bash
docker run -d -p 9121:9121 \
  oliver006/redis_exporter \
  --redis.addr=redis://redis:6379
```

#### Grafana Dashboards

Import pre-built dashboards:
- Kafka: Dashboard ID 7589
- Redis: Dashboard ID 763
- Elasticsearch: Dashboard ID 266

### 9. Backup Strategy

#### Redis Backup

```bash
redis-cli BGSAVE
redis-cli --rdb /backup/dump.rdb
```

Schedule daily backups:

```bash
0 2 * * * redis-cli BGSAVE && cp /var/lib/redis/dump.rdb /backup/redis-$(date +\%Y\%m\%d).rdb
```

#### Elasticsearch Snapshots

Configure snapshot repository:

```bash
PUT /_snapshot/auction_backup
{
  "type": "fs",
  "settings": {
    "location": "/backup/elasticsearch"
  }
}
```

Take snapshot:

```bash
PUT /_snapshot/auction_backup/snapshot_1?wait_for_completion=true
```

### 10. Security Considerations

1. **Network Security**
   - Use VPC/private network for internal services
   - Only expose necessary ports to internet
   - Enable TLS for all external connections

2. **Authentication**
   - Enable Kafka SASL authentication
   - Use Redis AUTH password
   - Enable Elasticsearch security

3. **Firewall Rules**
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw deny 9092/tcp  # Kafka - internal only
   ufw deny 6379/tcp  # Redis - internal only
   ufw deny 9200/tcp  # ES - internal only
   ```

### 11. Performance Tuning

#### Kafka

```properties
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
log.segment.bytes=1073741824
```

#### Redis

```conf
tcp-backlog=511
timeout=300
tcp-keepalive=300
maxclients=10000
```

#### Elasticsearch

```yaml
indices.memory.index_buffer_size: 30%
indices.queries.cache.size: 10%
```

### 12. Scaling Strategy

#### Horizontal Scaling

- **Backend Nodes**: Scale to 3-5 nodes behind load balancer
- **Kafka Brokers**: Start with 3, add more for throughput
- **Redis**: Use cluster mode for > 100k ops/sec

#### Vertical Scaling

- **Kafka**: 4-8 CPU cores, 16-32GB RAM
- **Redis**: 2-4 CPU cores, 8-16GB RAM  
- **Elasticsearch**: 4-8 CPU cores, 16-32GB RAM

### 13. Disaster Recovery

#### Recovery Time Objective (RTO): 15 minutes
#### Recovery Point Objective (RPO): 1 hour

Steps:
1. Restore Redis from latest snapshot
2. Restore Elasticsearch indices
3. Kafka auto-rebalances on restart
4. Verify data integrity
5. Resume traffic

### 14. Troubleshooting

#### Kafka Issues

```bash
kafka-topics.sh --bootstrap-server localhost:9092 --list
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group auction-consumer
```

#### Redis Issues

```bash
redis-cli INFO
redis-cli SLOWLOG GET 10
redis-cli MONITOR
```

#### Elasticsearch Issues

```bash
curl localhost:9200/_cluster/health?pretty
curl localhost:9200/_cat/indices?v
curl localhost:9200/_cat/nodes?v
```

### 15. Cost Optimization

- Use reserved instances for production
- Implement log rotation and retention policies
- Monitor and right-size resources monthly
- Use compression for Kafka topics
- Enable Elasticsearch index lifecycle management

## Support

For issues or questions, check:
- Application logs: `/var/log/mercur/`
- Elasticsearch logs: `/var/log/elasticsearch/`
- Kafka logs: `/var/log/kafka/`




