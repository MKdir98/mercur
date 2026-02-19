# Mailcow Database Initialization Fix

## Problem

SOGo container keeps showing error:
```
ERROR 1146 (42S02): Table 'mailcow.versions' doesn't exist
```

This happens when the database wasn't properly initialized.

## Quick Fix

### Option 1: Use Fix Script (Recommended)

```bash
cd ~/doorfestival
sudo bash deploy/fix-mailcow-database.sh
```

This script will:
1. Stop all containers
2. Remove the database volume
3. Start MySQL first and wait for initialization
4. Start all other containers
5. Wait for everything to be ready

### Option 2: Manual Fix

```bash
cd /opt/mailcow-dockerized

# Stop everything
docker compose down

# Remove database volume
docker volume rm mailcow-dockerized_mysql-vol-1

# Start MySQL first
docker compose up -d mysql-mailcow

# Wait for MySQL to initialize (important!)
sleep 60

# Check if MySQL is ready
docker compose exec mysql-mailcow mysqladmin ping -h localhost

# Start everything else
docker compose up -d

# Wait for initialization
sleep 30

# Check status
docker compose ps
```

## Verify Database is Working

```bash
cd /opt/mailcow-dockerized

# Check tables exist
docker compose exec mysql-mailcow mysql -u root -p$(grep DBROOT= mailcow.conf | cut -d= -f2) mailcow -e "SHOW TABLES;"

# Should see tables like:
# - versions
# - admin
# - domain
# - mailbox
# etc.
```

## Check Logs

```bash
cd /opt/mailcow-dockerized

# Check SOGo logs
docker compose logs -f sogo-mailcow

# Check MySQL logs
docker compose logs mysql-mailcow

# Check all logs
docker compose logs
```

## Why This Happens

The database initialization can fail if:
1. Containers start too quickly (before MySQL is ready)
2. Database volume was corrupted
3. First-time setup didn't complete properly
4. Network issues during initialization

## After Fix

Once fixed, you should see:
- All containers showing "Up" or "healthy" status
- No more "Table doesn't exist" errors
- Webmail accessible at http://mail.doorfestival.com

## If Still Having Issues

### Reset Everything

```bash
cd /opt/mailcow-dockerized

# Stop and remove everything
docker compose down -v

# Remove all volumes
docker volume ls | grep mailcow | awk '{print $2}' | xargs docker volume rm

# Start fresh
docker compose up -d

# Wait for initialization
sleep 60

# Check status
docker compose ps
```

### Check Container Health

```bash
# See which containers are unhealthy
docker compose ps

# Check specific container logs
docker compose logs <container-name>

# Examples:
docker compose logs mysql-mailcow
docker compose logs sogo-mailcow
docker compose logs postfix-mailcow
```

## Common Issues

### MySQL Takes Long to Start

MySQL initialization can take 1-2 minutes on first run. Be patient!

```bash
# Monitor MySQL startup
docker compose logs -f mysql-mailcow
```

Look for: "ready for connections"

### Permission Issues

```bash
# Fix permissions
cd /opt/mailcow-dockerized
sudo chown -R root:root .
```

### Port Conflicts

Make sure ports are configured correctly in `mailcow.conf`:

```bash
cd /opt/mailcow-dockerized
grep -E "HTTP_PORT|HTTP_BIND" mailcow.conf

# Should show:
# HTTP_PORT=8880
# HTTP_BIND=127.0.0.1
```

## Prevention

To avoid this in the future:
1. Always wait for MySQL to be ready before starting other services
2. Don't interrupt the first-time initialization
3. Make sure you have enough disk space
4. Use the deploy script which handles timing correctly

## Next Steps After Fix

Once database is working:

1. **Access Webmail**: http://mail.doorfestival.com
2. **Login**: admin / moohoo
3. **Change Password**: Immediately!
4. **Setup SSL**: `sudo bash deploy.sh production.properties ssl-mail`
5. **Configure DKIM**: Generate keys in admin panel
6. **Create Mailboxes**: Add your email addresses

## Support

If the fix doesn't work:
- Check [Mailcow GitHub Issues](https://github.com/mailcow/mailcow-dockerized/issues)
- Visit [Mailcow Community](https://community.mailcow.email/)
- Check system resources: `df -h` and `free -h`
