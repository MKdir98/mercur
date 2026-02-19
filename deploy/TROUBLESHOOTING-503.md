# Troubleshooting 503 Service Unavailable Errors

## Problem Description
Random 503 errors occurring when `brand.doorfestival` makes requests to `core.doorfestival`. Individual curl requests work fine, but when multiple requests happen simultaneously (like in a page load), some return 503.

## Root Causes

### 1. Nginx Keepalive Connections Too Low
**Symptom**: 503 errors under concurrent load
**Solution**: Increased keepalive connections from 64 to 256 in upstream

### 2. Backend Connection Pool Exhausted
**Symptom**: Backend can't handle concurrent requests
**Solution**: 
- Added `UV_THREADPOOL_SIZE=128` to PM2 config
- Increased keepalive_requests to 1000

### 3. Nginx Connection Header Conflict
**Symptom**: Keepalive not working properly
**Solution**: Changed `Connection 'upgrade'` to `Connection ""` for HTTP/1.1 keepalive

### 4. No Retry Logic
**Symptom**: Single backend hiccup causes 503
**Solution**: Added `proxy_next_upstream` with retry logic

## Quick Fixes

### 1. Check Backend Status
```bash
curl -I http://localhost:9000/health
pm2 status
```

### 2. Monitor Logs in Real-time
```bash
# Backend logs
pm2 logs backend-production

# Nginx error log
tail -f /var/log/nginx/backend-production-error.log

# Nginx access log (look for 503)
tail -f /var/log/nginx/backend-production-access.log | grep " 503 "
```

### 3. Check Connection Counts
```bash
# Active connections to backend
netstat -an | grep ":9000" | grep ESTABLISHED | wc -l

# Nginx worker connections
ps aux | grep nginx
```

### 4. Restart Services
```bash
# Restart backend only
pm2 restart backend-production

# Reload Nginx (no downtime)
sudo systemctl reload nginx

# Full Nginx restart (brief downtime)
sudo systemctl restart nginx
```

### 5. Run Diagnostics
```bash
sudo bash deploy.sh production.properties diagnose
```

## Configuration Changes Made

### Nginx Upstream (deploy.sh lines 892-906)
```nginx
upstream backend_MODE {
    server 127.0.0.1:BACKEND_PORT max_fails=3 fail_timeout=30s;
    keepalive 256;                    # Increased from 64
    keepalive_requests 1000;          # Added
    keepalive_timeout 60s;            # Added
}
```

### Nginx Backend Location (deploy.sh lines 985-1009)
```nginx
location / {
    proxy_set_header Connection "";   # Changed from 'upgrade'
    proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    proxy_next_upstream_tries 2;      # Added retry logic
    proxy_next_upstream_timeout 10s;  # Added
}
```

### PM2 Backend Config (deploy.sh lines 1093-1116)
```javascript
env: {
    NODE_ENV: 'production',
    PORT: $BACKEND_PORT,
    UV_THREADPOOL_SIZE: 128          // Added for better concurrency
}
```

### Nginx Global Settings (deploy.sh lines 870-885)
```nginx
worker_connections 4096;             # Increased
worker_rlimit_nofile 8192;          # Added
keepalive_timeout 65;               # Added
keepalive_requests 100;             # Added
```

## Testing After Changes

### 1. Apply Changes
```bash
# Update deployment script
cd /path/to/deploy
git pull

# Redeploy with new settings
sudo bash deploy.sh production.properties update
```

### 2. Test Concurrent Requests
```bash
# Test with multiple parallel requests
for i in {1..20}; do
    curl -s -o /dev/null -w "%{http_code}\n" https://core.doorfestival.com/api/endpoint &
done
wait
```

### 3. Monitor During Load
```bash
# Terminal 1: Watch PM2
watch -n 1 'pm2 status'

# Terminal 2: Watch Nginx errors
tail -f /var/log/nginx/backend-production-error.log

# Terminal 3: Watch connections
watch -n 1 'netstat -an | grep ":9000" | grep ESTABLISHED | wc -l'
```

## Performance Tuning

### If Still Getting 503s

#### 1. Increase Backend Instances (Cluster Mode)
Edit `deploy.sh` PM2 config:
```javascript
instances: 2,              // Instead of 1
exec_mode: 'cluster',      // Instead of 'fork'
```

#### 2. Add More Upstream Servers
If you have multiple backend instances:
```nginx
upstream backend_MODE {
    server 127.0.0.1:9000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:9001 max_fails=3 fail_timeout=30s;
    keepalive 256;
}
```

#### 3. Increase System Limits
```bash
# Edit /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536

# Edit /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65535

# Apply
sudo sysctl -p
```

#### 4. Check Database Connection Pool
In backend `.env`:
```bash
# Increase if needed
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
```

#### 5. Check Redis Connection Pool
In backend `.env`:
```bash
REDIS_MAX_RETRIES_PER_REQUEST=3
REDIS_CONNECT_TIMEOUT=10000
```

## Monitoring Commands

```bash
# Check Nginx status
sudo systemctl status nginx

# Check PM2 status
pm2 status

# Check system resources
htop

# Check disk I/O
iostat -x 1

# Check network connections
ss -s

# Check open files
lsof -p $(pgrep -f "backend-production") | wc -l
```

## Common Issues

### Issue: Backend process keeps restarting
**Check**: `pm2 logs backend-production --err`
**Solution**: Fix application errors, increase memory limit

### Issue: Nginx returns 502 instead of 503
**Meaning**: Backend is down completely
**Solution**: Check PM2 status, restart backend

### Issue: 503 only during peak hours
**Meaning**: Resource exhaustion
**Solution**: Scale horizontally (more instances) or vertically (more resources)

### Issue: 503 after deployment
**Meaning**: Backend not fully started
**Solution**: Increase `listen_timeout` in PM2 config

## Prevention

1. **Load Testing**: Test with realistic concurrent load before production
2. **Monitoring**: Set up alerts for 503 errors
3. **Health Checks**: Implement `/health` endpoint with proper checks
4. **Graceful Shutdown**: Ensure PM2 `shutdown_with_message: true`
5. **Connection Pooling**: Use connection pools for DB and Redis
6. **Caching**: Cache frequently accessed data to reduce backend load

## Contact

If issues persist after trying these solutions, check:
1. Application logs for errors
2. Database slow query logs
3. Redis memory usage
4. Network latency between services
