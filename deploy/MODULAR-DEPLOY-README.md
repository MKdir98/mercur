# Modular Deployment Script

This modular deployment system allows you to deploy the marketplace in multiple modes (demo, production, staging, etc.) using external configuration files.

## Overview

The deployment script (`deploy.sh`) is designed to be flexible and reusable across different environments. Instead of hardcoding values, all configuration is stored in `.properties` files that can be easily modified for different deployment scenarios.

## Quick Start

### 1. Choose Your Mode

Decide which environment you want to deploy:
- **Demo**: For testing and demonstrations
- **Production**: For live production environment
- **Custom**: Create your own `.properties` file for custom environments

### 2. Configure Your Environment

Edit the appropriate `.properties` file:

```bash
# For demo deployment
nano demo.properties

# For production deployment
nano production.properties
```

Make sure to update:
- Database credentials (`DB_PASSWORD`)
- API keys (Stripe, Algolia, TalkJS, SMS.ir, Resend)
- Domain names (if different)
- Any other environment-specific settings

### 3. Deploy

Run the deployment script with your chosen mode and config file:

```bash
# Deploy demo environment
sudo bash deploy.sh demo demo.properties deploy

# Deploy production environment
sudo bash deploy.sh production production.properties deploy
```

## Usage

### Command Syntax

```bash
sudo bash deploy.sh <MODE> <CONFIG_FILE> [COMMAND]
```

**Arguments:**
- `MODE`: Deployment mode identifier (demo, production, etc.)
- `CONFIG_FILE`: Path to the `.properties` configuration file
- `COMMAND`: Action to perform (optional, defaults to `deploy`)

### Available Commands

#### 1. **deploy** - Full Deployment (HTTP only)
Performs a complete deployment including:
- Installing system dependencies (Node.js, Nginx, PostgreSQL, Redis, PM2)
- Cloning/updating repositories
- Setting up environment files
- Building all projects
- Configuring Nginx
- Starting PM2 services
- Configuring firewall

```bash
sudo bash deploy.sh demo demo.properties deploy
```

#### 2. **deploy-ssl** - Full Deployment with SSL
Same as `deploy` but automatically sets up SSL/HTTPS certificates using Let's Encrypt.

```bash
sudo bash deploy.sh production production.properties deploy-ssl
```

**Important:** DNS records must point to your server before running this command!

#### 3. **update** - Update Code Only (SSL-safe)
Updates the codebase and rebuilds without modifying Nginx or SSL configuration. Perfect for deploying code changes after initial setup.

```bash
sudo bash deploy.sh demo demo.properties update
```

This command:
- Pulls latest code from git
- Rebuilds all projects
- Restarts PM2 services
- **Preserves** Nginx and SSL configuration

#### 4. **ssl** - Setup SSL/HTTPS
Installs SSL certificates for your domains using Let's Encrypt. Run this after initial deployment if you didn't use `deploy-ssl`.

```bash
sudo bash deploy.sh production production.properties ssl
```

## Configuration File Format

Configuration files use a simple `KEY=VALUE` format:

```properties
# Comments start with #

# Deployment Settings
MODE=demo
DEPLOY_DIR=/var/www/marketplace-demo

# Repository Configuration
GITHUB_USERNAME=mkdir98
STOREFRONT_REPO=b2c-marketplace-storefront
BACKEND_REPO=mercur
VENDOR_REPO=vendor-panel

# Ports (must be unique per mode)
STOREFRONT_PORT=3001
BACKEND_PORT=9001
VENDOR_PORT=5174

# Domains
STOREFRONT_DOMAIN=demo.doorfestival.com
BACKEND_DOMAIN=demo-core.doorfestival.com
VENDOR_DOMAIN=demo-brand.doorfestival.com

# Database
DB_NAME=mercur_demo
DB_USER=mercuruser_demo
DB_PASSWORD=your_password_here

# API Keys and Secrets
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
# ... more configuration
```

### Required Configuration Variables

The following variables **must** be defined in your `.properties` file:

| Variable | Description | Example |
|----------|-------------|---------|
| `MODE` | Deployment mode identifier | `demo`, `production` |
| `DEPLOY_DIR` | Deployment directory path | `/var/www/marketplace-demo` |
| `GITHUB_USERNAME` | GitHub username for repositories | `mkdir98` |
| `STOREFRONT_REPO` | Storefront repository name | `b2c-marketplace-storefront` |
| `BACKEND_REPO` | Backend repository name | `mercur` |
| `VENDOR_REPO` | Vendor panel repository name | `vendor-panel` |
| `STOREFRONT_PORT` | Storefront application port | `3000` |
| `BACKEND_PORT` | Backend API port | `9000` |
| `VENDOR_PORT` | Vendor panel port | `5173` |
| `STOREFRONT_DOMAIN` | Storefront domain | `demo.doorfestival.com` |
| `BACKEND_DOMAIN` | Backend API domain | `demo-core.doorfestival.com` |
| `VENDOR_DOMAIN` | Vendor panel domain | `demo-brand.doorfestival.com` |
| `DB_NAME` | Database name | `mercur_demo` |
| `DB_USER` | Database user | `mercuruser_demo` |
| `DB_PASSWORD` | Database password | `secure_password` |

### Optional Configuration Variables

These variables have defaults but can be overridden:

- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)
- `DEFAULT_REGION` - Default region (default: `us`)
- `SITE_NAME` - Site name (default: `Marketplace`)
- `SITE_DESCRIPTION` - Site description
- API keys for Stripe, Algolia, TalkJS, Resend, SMS.ir
- Feature flags like `DISABLE_SELLERS_REGISTRATION`

## Examples

### Example 1: Deploy Demo Environment

```bash
# 1. Edit demo configuration
nano demo.properties

# 2. Deploy without SSL (for testing)
sudo bash deploy.sh demo demo.properties deploy

# 3. After DNS is configured, add SSL
sudo bash deploy.sh demo demo.properties ssl
```

### Example 2: Deploy Production with SSL

```bash
# 1. Edit production configuration
nano production.properties

# 2. Make sure DNS points to your server
# 3. Deploy with SSL in one command
sudo bash deploy.sh production production.properties deploy-ssl
```

### Example 3: Update Code After Changes

```bash
# Pull latest changes and rebuild (preserves SSL)
sudo bash deploy.sh production production.properties update
```

### Example 4: Run Demo and Production Simultaneously

You can run multiple modes on the same server as long as they use different:
- Ports
- Domains
- Database names
- Deploy directories

```bash
# Deploy demo
sudo bash deploy.sh demo demo.properties deploy

# Deploy production (uses different ports/domains/database)
sudo bash deploy.sh production production.properties deploy
```

## Multi-Mode Deployment

The modular design allows running multiple environments on the same server:

### Demo Configuration (demo.properties)
```properties
MODE=demo
DEPLOY_DIR=/var/www/marketplace-demo
STOREFRONT_PORT=3001
BACKEND_PORT=9001
VENDOR_PORT=5174
DB_NAME=mercur_demo
STOREFRONT_DOMAIN=demo.doorfestival.com
```

### Production Configuration (production.properties)
```properties
MODE=production
DEPLOY_DIR=/var/www/marketplace
STOREFRONT_PORT=3000
BACKEND_PORT=9000
VENDOR_PORT=5173
DB_NAME=mercur
STOREFRONT_DOMAIN=doorfestival.com
```

Each mode gets:
- Separate PM2 processes (e.g., `backend-demo`, `backend-production`)
- Separate Nginx configurations
- Separate log files
- Separate databases
- Separate deployment directories

## PM2 Process Management

Each mode creates separate PM2 processes:

```bash
# View all processes
pm2 status

# View logs for specific mode
pm2 logs backend-demo
pm2 logs storefront-production

# Restart specific mode
pm2 restart backend-demo storefront-demo vendor-panel-demo

# Stop specific mode
pm2 stop backend-demo storefront-demo vendor-panel-demo

# Delete specific mode
pm2 delete backend-demo storefront-demo vendor-panel-demo
```

## Nginx Configuration

Each mode gets its own Nginx configuration file:

- Demo: `/etc/nginx/sites-available/marketplace-demo`
- Production: `/etc/nginx/sites-available/marketplace-production`

You can manually edit these files if needed, then reload Nginx:

```bash
sudo nginx -t                # Test configuration
sudo systemctl reload nginx  # Reload if test passes
```

## Troubleshooting

### Check Service Status

```bash
# PM2 status
pm2 status

# Nginx status
sudo systemctl status nginx

# Database status
sudo systemctl status postgresql

# Redis status
sudo systemctl status redis-server
```

### View Logs

```bash
# PM2 logs (all)
pm2 logs

# PM2 logs (specific app)
pm2 logs backend-demo

# Nginx logs
sudo tail -f /var/log/nginx/backend-demo-error.log
sudo tail -f /var/log/nginx/storefront-demo-error.log

# System logs
sudo journalctl -u nginx -f
```

### Common Issues

**Issue: Port already in use**
- Make sure ports in your `.properties` file are unique
- Check with: `sudo lsof -i :9000` (replace with your port)

**Issue: Database connection failed**
- Verify database credentials in `.properties` file
- Check if database exists: `sudo -u postgres psql -l`

**Issue: SSL certificate failed**
- Ensure DNS records point to your server
- Wait for DNS propagation (can take up to 48 hours)
- Check ports 80 and 443 are open: `sudo ufw status`

**Issue: PM2 process keeps restarting**
- Check logs: `pm2 logs backend-demo`
- Check environment file exists
- Verify all dependencies are installed

## Security Recommendations

1. **Change all default passwords** in `.properties` files
2. **Restrict SSH access**: Only allow key-based authentication
3. **Configure firewall**: Only open necessary ports (22, 80, 443)
4. **Use SSL/HTTPS** in production environments
5. **Keep secrets secure**: Don't commit `.properties` files with real credentials to git
6. **Regular updates**: Run `update` command regularly to get security patches
7. **Database backups**: Set up automated PostgreSQL backups
8. **Monitor logs**: Regularly check PM2 and Nginx logs for issues

## File Structure

After deployment, your directory structure will look like:

```
/var/www/marketplace-demo/          # Demo deployment
├── b2c-marketplace-storefront/
├── mercur/
├── vendor-panel/
└── ecosystem.config.js             # PM2 configuration

/var/www/marketplace/               # Production deployment
├── b2c-marketplace-storefront/
├── mercur/
├── vendor-panel/
└── ecosystem.config.js             # PM2 configuration
```

## Advanced Usage

### Creating a Custom Environment

1. Copy an existing `.properties` file:
```bash
cp demo.properties staging.properties
```

2. Edit the new file with custom values:
```bash
nano staging.properties
```

3. Deploy your custom environment:
```bash
sudo bash deploy.sh staging staging.properties deploy
```

### Environment Variables Priority

The script loads configuration in this order:
1. Configuration from `.properties` file
2. Template defaults in environment files
3. Runtime values generated by the script (e.g., JWT_SECRET)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the original `marketplace-deploy.sh` for comparison
3. Check PM2 and Nginx logs for specific errors
4. Verify all configuration values in your `.properties` file

## Migration from Old Script

If you're migrating from `marketplace-deploy.sh`:

1. Your existing deployment continues to work
2. To use the new modular script:
   ```bash
   # Create production.properties with your current values
   cp production.properties my-production.properties
   # Edit with your actual values
   nano my-production.properties
   # Run update (doesn't change Nginx/SSL)
   sudo bash deploy.sh production my-production.properties update
   ```

The new script preserves SSL configurations during updates, just like the old script.

