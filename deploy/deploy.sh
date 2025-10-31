#!/bin/bash

###############################################################################
# Modular Marketplace Deployment Script
# Supports multiple modes (demo, production) via external configuration files
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

###############################################################################
# Configuration Loading
###############################################################################

# Check arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: sudo bash $0 <CONFIG_FILE> [COMMAND]"
    echo ""
    echo "Arguments:"
    echo "  CONFIG_FILE   Path to .properties configuration file"
    echo "  COMMAND       Optional command (update, deploy, ssl)"
    echo ""
    echo "Examples:"
    echo "  sudo bash $0 demo.properties deploy"
    echo "  sudo bash $0 production.properties update"
    echo "  sudo bash $0 demo.properties ssl"
    echo ""
    exit 1
fi

CONFIG_FILE="$1"
COMMAND="${2:-deploy}"

# Load properties file
load_properties() {
    local config_file="$1"
    
    if [ ! -f "$config_file" ]; then
        echo -e "${RED}✗${NC} Configuration file not found: $config_file"
        exit 1
    fi
    
    echo -e "${BLUE}ℹ${NC} Loading configuration from: $config_file"
    
    # Read properties file and export variables
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        
        # Trim whitespace
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Remove quotes if present
        value="${value%\"}"
        value="${value#\"}"
        
        # Export variable
        export "$key=$value"
    done < "$config_file"
}

# Load configuration
load_properties "$CONFIG_FILE"

# Set DEPLOY_MODE from config file
DEPLOY_MODE="${MODE:-unknown}"

echo -e "${GREEN}✓${NC} Configuration loaded for mode: $DEPLOY_MODE"

# Validate required configuration
validate_config() {
    local required_vars=(
        "MODE"
        "DEPLOY_DIR"
        "GITHUB_USERNAME"
        "STOREFRONT_REPO"
        "BACKEND_REPO"
        "VENDOR_REPO"
        "STOREFRONT_PORT"
        "BACKEND_PORT"
        "VENDOR_PORT"
        "STOREFRONT_DOMAIN"
        "BACKEND_DOMAIN"
        "VENDOR_DOMAIN"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo -e "${RED}✗${NC} Missing required configuration variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
}

validate_config

###############################################################################
# Helper Functions
###############################################################################

print_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║   Marketplace Deployment Manager - Mode: ${DEPLOY_MODE^^}$(printf '%*s' $((13-${#DEPLOY_MODE})) '')║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✓${NC} ${1}"
}

print_error() {
    echo -e "${RED}✗${NC} ${1}"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} ${1}"
}

print_step() {
    echo -e "${CYAN}▶${NC} ${1}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run with sudo privileges"
        exit 1
    fi
}

# Setup SSH agent for GitHub access
setup_ssh_agent() {
    print_info "Setting up SSH agent for GitHub access..."
    
    # Start SSH agent
    eval $(ssh-agent -s) > /dev/null 2>&1
    
    # Add all SSH keys
    if [ -d "$HOME/.ssh" ]; then
        ssh-add ~/.ssh/* 2>/dev/null || true
    fi
    
    # If running with sudo, also try the original user's keys
    if [ -n "$SUDO_USER" ]; then
        ORIGINAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
        if [ -d "$ORIGINAL_HOME/.ssh" ]; then
            ssh-add $ORIGINAL_HOME/.ssh/* 2>/dev/null || true
        fi
    fi
    
    print_success "SSH agent configured"
}

###############################################################################
# System Dependencies
###############################################################################

install_system_dependencies() {
    print_step "Installing system dependencies..."
    
    # Update package list
    apt-get update -qq
    
    # Install basic tools
    if ! command -v curl &> /dev/null; then
        print_info "Installing curl..."
        apt-get install -y curl
    fi
    
    if ! command -v wget &> /dev/null; then
        apt-get install -y wget
    fi
    
    # Install Git
    if ! command -v git &> /dev/null; then
        print_info "Installing Git..."
        apt-get install -y git
        print_success "Git installed: $(git --version)"
    else
        print_success "Git already installed: $(git --version)"
    fi
    
    # Install Node.js 20
    if ! command -v node &> /dev/null; then
        print_info "Installing Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        print_success "Node.js installed: $(node --version)"
    else
        print_success "Node.js already installed: $(node --version)"
    fi
    
    # Install Nginx
    if ! command -v nginx &> /dev/null; then
        print_info "Installing Nginx..."
        apt-get install -y nginx
        print_success "Nginx installed"
    else
        print_success "Nginx already installed"
    fi
    
    # Install PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_info "Installing PostgreSQL..."
        apt-get install -y postgresql postgresql-contrib
        systemctl start postgresql
        systemctl enable postgresql
        print_success "PostgreSQL installed"
    else
        print_success "PostgreSQL already installed"
    fi
    
    # Install Redis
    if ! command -v redis-cli &> /dev/null; then
        print_info "Installing Redis..."
        apt-get install -y redis-server
        systemctl start redis-server
        systemctl enable redis-server
        print_success "Redis installed"
    else
        print_success "Redis already installed"
    fi
    
    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        print_info "Installing PM2..."
        npm install -g pm2
        print_success "PM2 installed"
    else
        print_success "PM2 already installed"
    fi
    
    # Install Yarn
    if ! command -v yarn &> /dev/null; then
        print_info "Installing Yarn..."
        npm install -g yarn
        print_success "Yarn installed"
    else
        print_success "Yarn already installed"
    fi
    
    # Install serve for static files
    if ! command -v serve &> /dev/null; then
        npm install -g serve
    fi
    
    print_success "All system dependencies are ready"
}

###############################################################################
# Database Setup
###############################################################################

setup_database() {
    print_step "Setting up PostgreSQL database..."
    
    # Check if database exists
    DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)
    
    if [ $DB_EXISTS -eq 0 ]; then
        print_info "Creating database '$DB_NAME'..."
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
        print_success "Database created successfully"
    else
        print_success "Database '$DB_NAME' already exists"
    fi
}

###############################################################################
# Project Management
###############################################################################

clone_or_update_project() {
    local project_name=$1
    local repo_name=$2
    local project_path="$DEPLOY_DIR/$repo_name"
    
    # Setup SSH agent before git operations
    setup_ssh_agent
    
    if [ -d "$project_path" ]; then
        print_info "Updating $project_name..."
        cd "$project_path"
        
        # Stash any local changes
        git stash save "Auto-stash before pull at $(date)" 2>/dev/null || true
        
        # Pull latest changes
        git pull origin main || git pull origin master
        
        print_success "$project_name updated"
    else
        print_info "Cloning $project_name..."
        mkdir -p "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
        
        # Try to clone
        local repo_base_url="git@github.com:$GITHUB_USERNAME"
        
        # Check if local copy exists (for development)
        if [ -d "/home/mehdi/all/repositories/github.com/$repo_name" ]; then
            # If we're running from local, just copy
            cp -r "/home/mehdi/all/repositories/github.com/$repo_name" "$project_path"
            print_success "$project_name copied from local"
        else
            # Clone from git using SSH
            git clone "$repo_base_url/$repo_name.git" || {
                print_error "Failed to clone $repo_name. Please check:"
                print_error "  1. SSH keys are set up correctly"
                print_error "  2. Repository exists: $repo_base_url/$repo_name.git"
                print_error "  3. You have access to the repository"
                exit 1
            }
            print_success "$project_name cloned"
        fi
    fi
}

setup_env_files() {
    print_step "Setting up environment files..."
    
    # Storefront .env
    local storefront_env="$DEPLOY_DIR/$STOREFRONT_REPO/.env.production"
    if [ ! -f "$storefront_env" ]; then
        cat > "$storefront_env" << EOF
# Environment
NEXT_PUBLIC_APP_ENV=$DEPLOY_MODE

# Backend URLs
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://$BACKEND_DOMAIN
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${MEDUSA_PUBLISHABLE_KEY:-your_publishable_key_here}

# Site URLs
NEXT_PUBLIC_BASE_URL=http://$STOREFRONT_DOMAIN
NEXT_PUBLIC_DEFAULT_REGION=${DEFAULT_REGION:-us}

# Stripe
NEXT_PUBLIC_STRIPE_KEY=${STRIPE_PUBLIC_KEY:-your_stripe_key_here}

# Security
REVALIDATE_SECRET=${REVALIDATE_SECRET:-your_revalidate_secret_here}

# Site Info
NEXT_PUBLIC_SITE_NAME="${SITE_NAME:-Marketplace}"
NEXT_PUBLIC_SITE_DESCRIPTION="${SITE_DESCRIPTION:-Your Marketplace Description}"

# Algolia
NEXT_PUBLIC_ALGOLIA_ID=${ALGOLIA_APP_ID:-your_algolia_id}
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=${ALGOLIA_SEARCH_KEY:-your_algolia_key}

# SMS - Frontend does NOT need these anymore (handled by backend)
# NEXT_PUBLIC_ENABLE_SMS_DEBUG_PANEL=false
EOF
        print_warning "Created $storefront_env - PLEASE EDIT IT!"
    else
        print_success "Storefront .env.production exists"
    fi
    
    # Backend .env
    local backend_env="$DEPLOY_DIR/$BACKEND_REPO/apps/backend/.env"
    if [ ! -f "$backend_env" ]; then
        cat > "$backend_env" << EOF
# Environment
APP_ENV=$DEPLOY_MODE

# CORS Configuration - Include both HTTP and HTTPS
STORE_CORS=http://$STOREFRONT_DOMAIN,https://$STOREFRONT_DOMAIN,http://www.$STOREFRONT_DOMAIN,https://www.$STOREFRONT_DOMAIN
ADMIN_CORS=http://$BACKEND_DOMAIN,https://$BACKEND_DOMAIN
VENDOR_CORS=http://$VENDOR_DOMAIN,https://$VENDOR_DOMAIN
AUTH_CORS=http://$BACKEND_DOMAIN,https://$BACKEND_DOMAIN,http://$VENDOR_DOMAIN,https://$VENDOR_DOMAIN,http://$STOREFRONT_DOMAIN,https://$STOREFRONT_DOMAIN

# Redis
REDIS_URL=${REDIS_URL:-redis://localhost:6379}

# Security
JWT_SECRET=$(openssl rand -base64 32)
COOKIE_SECRET=$(openssl rand -base64 32)

# Database
DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
DB_NAME=$DB_NAME

# Stripe
STRIPE_SECRET_API_KEY=${STRIPE_SECRET_KEY:-your_stripe_secret_key_here}
STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-your_webhook_secret_here}

# Email (Resend)
RESEND_API_KEY=${RESEND_API_KEY:-your_resend_api_key_here}
RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL:-noreply@$STOREFRONT_DOMAIN}

# Algolia
ALGOLIA_APP_ID=${ALGOLIA_APP_ID:-your_algolia_app_id}
ALGOLIA_API_KEY=${ALGOLIA_ADMIN_KEY:-your_algolia_admin_key}

# TalkJS
VITE_TALK_JS_APP_ID=${TALKJS_APP_ID:-your_talkjs_id}
VITE_TALK_JS_SECRET_API_KEY=${TALKJS_SECRET_KEY:-your_talkjs_key}

# URLs
VENDOR_PANEL_URL=http://$VENDOR_DOMAIN
STOREFRONT_URL=http://$STOREFRONT_DOMAIN
BACKEND_URL=http://$BACKEND_DOMAIN

# SMS.ir Configuration
SMS_IR_API_KEY=${SMS_IR_API_KEY:-your_sms_ir_api_key}
SMS_IR_LINE_NUMBER=${SMS_IR_LINE_NUMBER:-2}
SMS_IR_TEMPLATE_ID=${SMS_IR_TEMPLATE_ID:-552147}

# SMS.ir Sandbox (for testing)
SMS_IR_SANDBOX_API_KEY=${SMS_IR_SANDBOX_API_KEY:-sandbox_key}
SMS_IR_SANDBOX_LINE_NUMBER=${SMS_IR_SANDBOX_LINE_NUMBER:-sandbox_line}
EOF
        print_warning "Created $backend_env - PLEASE EDIT IT!"
    else
        print_success "Backend .env exists"
    fi
    
    # Vendor Panel .env
    local vendor_env="$DEPLOY_DIR/$VENDOR_REPO/.env.production"
    if [ ! -f "$vendor_env" ]; then
        cat > "$vendor_env" << EOF
VITE_MEDUSA_BASE='/'
VITE_MEDUSA_STOREFRONT_URL=http://$STOREFRONT_DOMAIN
VITE_MEDUSA_BACKEND_URL=http://$BACKEND_DOMAIN
VITE_TALK_JS_APP_ID=${TALKJS_APP_ID:-your_talkjs_id}
VITE_DISABLE_SELLERS_REGISTRATION=${DISABLE_SELLERS_REGISTRATION:-false}
EOF
        print_warning "Created $vendor_env - PLEASE EDIT IT!"
    else
        print_success "Vendor Panel .env.production exists"
    fi
}

build_projects() {
    print_step "Building projects..."
    
    # Build Backend (using Yarn)
    print_info "Building Backend ($BACKEND_REPO) with Yarn..."
    cd "$DEPLOY_DIR/$BACKEND_REPO"
    
    # Increase Node.js memory for build (8GB heap)
    export NODE_OPTIONS="--max-old-space-size=8192"
    
    yarn install --frozen-lockfile 2>/dev/null || yarn install
    cd apps/backend
    yarn build
    print_success "Backend built"
    
    # Reset NODE_OPTIONS
    unset NODE_OPTIONS
    
    # Run migrations
    print_info "Running database migrations..."
    yarn db:migrate
    print_success "Migrations completed"
    
    # Build Storefront (using npm)
    print_info "Building Storefront ($STOREFRONT_REPO) with npm..."
    cd "$DEPLOY_DIR/$STOREFRONT_REPO"
    
    # Copy .env.production to .env.local for build
    cp .env.production .env.local
    
    # Increase Node.js memory for build (4GB heap)
    export NODE_OPTIONS="--max-old-space-size=4096"
    
    npm ci 2>/dev/null || npm install
    NODE_ENV=production npm run build
    print_success "Storefront built"
    
    # Reset NODE_OPTIONS
    unset NODE_OPTIONS
    
    # Build Vendor Panel (using npm)
    print_info "Building Vendor Panel ($VENDOR_REPO) with npm..."
    cd "$DEPLOY_DIR/$VENDOR_REPO"
    
    # Copy .env.production to .env for build
    cp .env.production .env
    
    # Increase Node.js memory for build (2GB heap)
    export NODE_OPTIONS="--max-old-space-size=2048"
    
    npm ci 2>/dev/null || npm install
    npm run build:preview
    print_success "Vendor Panel built"
    
    # Reset NODE_OPTIONS
    unset NODE_OPTIONS
}

###############################################################################
# Nginx Configuration
###############################################################################

setup_nginx() {
    print_step "Configuring Nginx..."
    
    local nginx_config_name="marketplace-${DEPLOY_MODE}"
    
    # Check if SSL is already configured
    local has_ssl=false
    if [ -f /etc/nginx/sites-available/$nginx_config_name ] && grep -q "listen 443 ssl" /etc/nginx/sites-available/$nginx_config_name; then
        has_ssl=true
        print_warning "SSL configuration detected! Preserving existing config."
        print_warning "If you need to reset Nginx config, manually delete:"
        print_warning "  /etc/nginx/sites-available/$nginx_config_name"
        print_warning "Then run deploy again."
        echo ""
        return 0
    fi
    
    # Backup existing config if it exists
    if [ -f /etc/nginx/sites-available/$nginx_config_name ]; then
        cp /etc/nginx/sites-available/$nginx_config_name /etc/nginx/sites-available/$nginx_config_name.backup.$(date +%Y%m%d_%H%M%S)
        print_info "Backed up existing Nginx config"
    fi
    
    # Create nginx configuration (HTTP only - SSL will be added by certbot)
    cat > /etc/nginx/sites-available/$nginx_config_name << 'NGINXEOF'
# Upstream definitions
upstream backend_MODE {
    server 127.0.0.1:BACKEND_PORT;
    keepalive 64;
}

upstream storefront_MODE {
    server 127.0.0.1:STOREFRONT_PORT;
    keepalive 64;
}

upstream vendor_panel_MODE {
    server 127.0.0.1:VENDOR_PORT;
    keepalive 64;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit_MODE:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit_MODE:10m rate=30r/s;

# Main Storefront
server {
    listen 80;
    listen [::]:80;
    server_name STOREFRONT_DOMAIN www.STOREFRONT_DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json image/svg+xml;
    
    # Client settings
    client_max_body_size 50M;
    client_body_timeout 60s;
    
    # Logging
    access_log /var/log/nginx/storefront-MODE-access.log;
    error_log /var/log/nginx/storefront-MODE-error.log;
    
    location / {
        limit_req zone=general_limit_MODE burst=20 nodelay;
        
        proxy_pass http://storefront_MODE;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Backend API
server {
    listen 80;
    listen [::]:80;
    server_name BACKEND_DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # CORS headers for authentication
    add_header Access-Control-Allow-Credentials "true" always;
    
    # Client settings
    client_max_body_size 100M;
    client_body_timeout 120s;
    
    # Logging
    access_log /var/log/nginx/backend-MODE-access.log;
    error_log /var/log/nginx/backend-MODE-error.log;
    
    location / {
        limit_req zone=api_limit_MODE burst=30 nodelay;
        
        proxy_pass http://backend_MODE;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Important for authentication and cookies
        proxy_pass_header Set-Cookie;
        proxy_pass_header Authorization;
        proxy_cookie_path / /;
        
        proxy_cache_bypass $http_upgrade;
        
        # Longer timeouts for API
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}

# Vendor Panel
server {
    listen 80;
    listen [::]:80;
    server_name VENDOR_DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Client settings
    client_max_body_size 50M;
    
    # Logging
    access_log /var/log/nginx/vendor-MODE-access.log;
    error_log /var/log/nginx/vendor-MODE-error.log;
    
    location / {
        limit_req zone=general_limit_MODE burst=20 nodelay;
        
        proxy_pass http://vendor_panel_MODE;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF
    
    # Replace placeholders
    sed -i "s/MODE/$DEPLOY_MODE/g" /etc/nginx/sites-available/$nginx_config_name
    sed -i "s/STOREFRONT_DOMAIN/$STOREFRONT_DOMAIN/g" /etc/nginx/sites-available/$nginx_config_name
    sed -i "s/BACKEND_DOMAIN/$BACKEND_DOMAIN/g" /etc/nginx/sites-available/$nginx_config_name
    sed -i "s/VENDOR_DOMAIN/$VENDOR_DOMAIN/g" /etc/nginx/sites-available/$nginx_config_name
    sed -i "s/STOREFRONT_PORT/$STOREFRONT_PORT/g" /etc/nginx/sites-available/$nginx_config_name
    sed -i "s/BACKEND_PORT/$BACKEND_PORT/g" /etc/nginx/sites-available/$nginx_config_name
    sed -i "s/VENDOR_PORT/$VENDOR_PORT/g" /etc/nginx/sites-available/$nginx_config_name
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$nginx_config_name /etc/nginx/sites-enabled/$nginx_config_name
    
    # Remove default site if exists (only for production)
    if [ "$DEPLOY_MODE" = "production" ]; then
        rm -f /etc/nginx/sites-enabled/default
    fi
    
    # Test nginx configuration
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        print_success "Nginx configured and reloaded"
    else
        print_error "Nginx configuration test failed!"
        nginx -t
        exit 1
    fi
}

###############################################################################
# PM2 Process Management
###############################################################################

setup_pm2() {
    print_step "Setting up PM2 process manager..."
    
    # Create PM2 ecosystem config
    cat > "$DEPLOY_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'backend-$DEPLOY_MODE',
      cwd: '$DEPLOY_DIR/$BACKEND_REPO/apps/backend',
      script: 'yarn',
      args: 'start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: '/var/log/pm2/backend-$DEPLOY_MODE-error.log',
      out_file: '/var/log/pm2/backend-$DEPLOY_MODE-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'storefront-$DEPLOY_MODE',
      cwd: '$DEPLOY_DIR/$STOREFRONT_REPO',
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: $STOREFRONT_PORT
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: '/var/log/pm2/storefront-$DEPLOY_MODE-error.log',
      out_file: '/var/log/pm2/storefront-$DEPLOY_MODE-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'vendor-panel-$DEPLOY_MODE',
      cwd: '$DEPLOY_DIR/$VENDOR_REPO',
      script: '/usr/bin/env',
      args: 'serve -s dist -l $VENDOR_PORT --no-clipboard',
      env: {
        NODE_ENV: 'production',
        PATH: '/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/vendor-panel-$DEPLOY_MODE-error.log',
      out_file: '/var/log/pm2/vendor-panel-$DEPLOY_MODE-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '5s',
      max_restarts: 10
    }
  ]
};
EOF
    
    # Create log directory
    mkdir -p /var/log/pm2
    
    print_success "PM2 configuration created"
}

start_services() {
    print_step "Starting services with PM2..."
    
    cd "$DEPLOY_DIR"
    
    # Stop existing processes for this mode
    pm2 delete backend-$DEPLOY_MODE 2>/dev/null || true
    pm2 delete storefront-$DEPLOY_MODE 2>/dev/null || true
    pm2 delete vendor-panel-$DEPLOY_MODE 2>/dev/null || true
    
    # Start services
    pm2 start ecosystem.config.js
    
    # Save PM2 process list
    pm2 save --force
    
    # Setup PM2 to start on system boot
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
    
    print_success "All services started"
    
    # Wait a moment for services to initialize
    sleep 3
    
    # Show status
    pm2 status
}

###############################################################################
# Firewall Configuration
###############################################################################

setup_firewall() {
    print_step "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        # Allow SSH
        ufw allow 22/tcp comment 'SSH'
        
        # Allow HTTP and HTTPS
        ufw allow 80/tcp comment 'HTTP'
        ufw allow 443/tcp comment 'HTTPS'
        
        # Enable firewall
        echo "y" | ufw enable 2>/dev/null || ufw --force enable
        
        print_success "Firewall configured"
    else
        print_warning "UFW not found, skipping firewall setup"
    fi
}

###############################################################################
# SSL/TLS Setup (Let's Encrypt)
###############################################################################

install_certbot() {
    if ! command -v certbot &> /dev/null; then
        print_info "Installing Certbot..."
        apt-get install -y certbot python3-certbot-nginx
        print_success "Certbot installed"
    else
        print_success "Certbot already installed"
    fi
}

setup_ssl_manual() {
    print_step "SSL Setup Instructions..."
    
    install_certbot
    
    echo ""
    print_info "To enable SSL, run the following commands:"
    echo ""
    echo "  sudo certbot --nginx -d $STOREFRONT_DOMAIN -d www.$STOREFRONT_DOMAIN"
    echo "  sudo certbot --nginx -d $BACKEND_DOMAIN"
    echo "  sudo certbot --nginx -d $VENDOR_DOMAIN"
    echo ""
    print_warning "Make sure your DNS records are pointing to this server first!"
}

setup_ssl_auto() {
    print_step "Setting up SSL with Let's Encrypt..."
    
    install_certbot
    
    echo ""
    print_warning "════════════════════════════════════════════════════════"
    print_warning "IMPORTANT: Before continuing, make sure:"
    print_warning "  1. DNS A records are pointing to this server's IP"
    print_warning "  2. Ports 80 and 443 are open"
    print_warning "  3. Domain names are correct in the config file"
    print_warning "════════════════════════════════════════════════════════"
    echo ""
    
    read -p "Are your DNS records configured correctly? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Please configure your DNS first, then run:"
        print_warning "  sudo bash $0 $CONFIG_FILE ssl"
        return 0
    fi
    
    # Get SSL for storefront
    print_info "Getting SSL certificate for storefront..."
    certbot --nginx -d $STOREFRONT_DOMAIN -d www.$STOREFRONT_DOMAIN --non-interactive --agree-tos --redirect --email admin@$STOREFRONT_DOMAIN || {
        print_warning "Failed to get SSL for storefront. You can try manually later."
    }
    
    # Get SSL for backend
    print_info "Getting SSL certificate for backend..."
    certbot --nginx -d $BACKEND_DOMAIN --non-interactive --agree-tos --redirect --email admin@$STOREFRONT_DOMAIN || {
        print_warning "Failed to get SSL for backend. You can try manually later."
    }
    
    # Get SSL for vendor panel
    print_info "Getting SSL certificate for vendor panel..."
    certbot --nginx -d $VENDOR_DOMAIN --non-interactive --agree-tos --redirect --email admin@$STOREFRONT_DOMAIN || {
        print_warning "Failed to get SSL for vendor panel. You can try manually later."
    }
    
    # Setup auto-renewal
    print_info "Setting up automatic certificate renewal..."
    systemctl enable certbot.timer 2>/dev/null || {
        # If systemd timer doesn't exist, add cron job
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
    }
    
    print_success "SSL setup completed!"
    print_info "Certificates will auto-renew before expiration"
}

###############################################################################
# Update Only Function (Preserves Nginx/SSL config)
###############################################################################

update_only() {
    print_banner
    
    print_info "Starting update process (SSL-safe) for $DEPLOY_MODE..."
    echo ""
    
    # Check root privileges
    check_root
    
    # Clone or update projects
    print_step "Updating projects..."
    clone_or_update_project "Storefront" "$STOREFRONT_REPO"
    clone_or_update_project "Backend" "$BACKEND_REPO"
    clone_or_update_project "Vendor Panel" "$VENDOR_REPO"
    echo ""
    
    # Check if env files exist
    if [ ! -f "$DEPLOY_DIR/$STOREFRONT_REPO/.env.production" ] || \
       [ ! -f "$DEPLOY_DIR/$BACKEND_REPO/apps/backend/.env" ] || \
       [ ! -f "$DEPLOY_DIR/$VENDOR_REPO/.env.production" ]; then
        print_error "Environment files not found! Please run 'deploy' first."
        exit 1
    fi
    
    # Build projects
    build_projects
    echo ""
    
    # Restart services (no nginx config change)
    print_step "Restarting services..."
    cd "$DEPLOY_DIR"
    pm2 restart backend-$DEPLOY_MODE storefront-$DEPLOY_MODE vendor-panel-$DEPLOY_MODE
    
    # Wait a moment for services to initialize
    sleep 3
    
    # Show status
    pm2 status
    echo ""
    
    # Success message
    print_success "════════════════════════════════════════════════════════"
    print_success "Update completed successfully! 🚀"
    print_success "════════════════════════════════════════════════════════"
    echo ""
    print_info "SSL/Nginx configuration was NOT modified (preserved)"
    echo ""
    print_info "Your applications are now running with latest code:"
    echo ""
    echo "  📱 Storefront:    http://$STOREFRONT_DOMAIN"
    echo "  🔧 Backend API:   http://$BACKEND_DOMAIN"
    echo "  👥 Vendor Panel:  http://$VENDOR_DOMAIN"
    echo ""
    print_info "Useful commands:"
    echo ""
    echo "  View logs:        pm2 logs"
    echo "  View status:      pm2 status"
    echo "  Monitor:          pm2 monit"
    echo ""
}

###############################################################################
# Deployment Function
###############################################################################

deploy() {
    print_banner
    
    print_info "Starting deployment process for $DEPLOY_MODE..."
    echo ""
    
    # Check root privileges
    check_root
    
    # Install system dependencies
    install_system_dependencies
    echo ""
    
    # Setup database
    setup_database
    echo ""
    
    # Clone or update projects
    print_step "Managing projects..."
    clone_or_update_project "Storefront" "$STOREFRONT_REPO"
    clone_or_update_project "Backend" "$BACKEND_REPO"
    clone_or_update_project "Vendor Panel" "$VENDOR_REPO"
    echo ""
    
    # Setup environment files
    setup_env_files
    echo ""
    
    # Check if env files need to be edited
    if grep -q "your_.*_here" "$DEPLOY_DIR/$STOREFRONT_REPO/.env.production" 2>/dev/null || \
       grep -q "your_.*_here" "$DEPLOY_DIR/$BACKEND_REPO/apps/backend/.env" 2>/dev/null || \
       grep -q "your_.*_here" "$DEPLOY_DIR/$VENDOR_REPO/.env.production" 2>/dev/null; then
        print_warning "════════════════════════════════════════════════════════"
        print_warning "IMPORTANT: Environment files need to be configured!"
        print_warning ""
        print_warning "Please edit these files with your actual credentials:"
        print_warning "  1. $DEPLOY_DIR/$STOREFRONT_REPO/.env.production"
        print_warning "  2. $DEPLOY_DIR/$BACKEND_REPO/apps/backend/.env"
        print_warning "  3. $DEPLOY_DIR/$VENDOR_REPO/.env.production"
        print_warning ""
        print_warning "After editing, run: sudo bash $0 $CONFIG_FILE deploy"
        print_warning "════════════════════════════════════════════════════════"
        exit 0
    fi
    
    # Build projects
    build_projects
    echo ""
    
    # Setup Nginx (with SSL preservation check)
    setup_nginx
    echo ""
    
    # Setup PM2
    setup_pm2
    echo ""
    
    # Start services
    start_services
    echo ""
    
    # Setup firewall
    setup_firewall
    echo ""
    
    # Success message
    print_success "════════════════════════════════════════════════════════"
    print_success "Deployment completed successfully! 🚀"
    print_success "════════════════════════════════════════════════════════"
    echo ""
    print_info "Your applications are now running:"
    echo ""
    echo "  📱 Storefront:    http://$STOREFRONT_DOMAIN"
    echo "  🔧 Backend API:   http://$BACKEND_DOMAIN"
    echo "  👥 Vendor Panel:  http://$VENDOR_DOMAIN"
    echo ""
    print_info "Useful commands:"
    echo ""
    echo "  View status:      pm2 status"
    echo "  View logs:        pm2 logs backend-$DEPLOY_MODE"
    echo "  Restart all:      pm2 restart backend-$DEPLOY_MODE storefront-$DEPLOY_MODE vendor-panel-$DEPLOY_MODE"
    echo "  Stop all:         pm2 stop backend-$DEPLOY_MODE storefront-$DEPLOY_MODE vendor-panel-$DEPLOY_MODE"
    echo "  Monitor:          pm2 monit"
    echo ""
    echo "  Update code (SSL-safe): sudo bash $0 $CONFIG_FILE update"
    echo "  Full redeploy:          sudo bash $0 $CONFIG_FILE deploy"
    echo "  Setup SSL:              sudo bash $0 $CONFIG_FILE ssl"
    echo ""
    
    # Prompt for SSL setup
    echo ""
    print_info "═══════════════════════════════════════════════════════════"
    print_info "SSL/HTTPS Setup"
    print_info "═══════════════════════════════════════════════════════════"
    echo ""
    print_warning "To secure your site with HTTPS, you need SSL certificates."
    echo ""
    read -p "Do you want to setup SSL/HTTPS now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        setup_ssl_auto
    else
        echo ""
        print_info "You can setup SSL later by running:"
        echo ""
        echo "  sudo bash $0 $CONFIG_FILE ssl"
        echo ""
        print_warning "Note: Make sure DNS records point to this server first!"
    fi
    echo ""
}

###############################################################################
# Main Script Entry Point
###############################################################################

case "$COMMAND" in
    update)
        update_only
        ;;
    deploy)
        deploy
        ;;
    ssl)
        print_banner
        check_root
        setup_ssl_auto
        ;;
    *)
        print_banner
        echo "Usage: sudo bash $0 <CONFIG_FILE> [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  deploy        Full deployment (prompts for SSL setup)"
        echo "  update        Update code & rebuild (SSL-safe, preserves Nginx config)"
        echo "  ssl           Setup SSL/HTTPS (run separately if needed)"
        echo ""
        echo "Examples:"
        echo "  sudo bash $0 demo.properties deploy"
        echo "  sudo bash $0 production.properties update"
        echo "  sudo bash $0 demo.properties ssl"
        echo ""
        echo "What this script does:"
        echo ""
        echo "  deploy command:"
        echo "    • Install dependencies (Node.js, Nginx, PostgreSQL, Redis, PM2)"
        echo "    • Clone or update all three projects"
        echo "    • Setup environment files"
        echo "    • Build all projects"
        echo "    • Configure Nginx as reverse proxy"
        echo "    • Start services with PM2"
        echo "    • Configure firewall"
        echo "    • Prompt for SSL setup"
        echo ""
        echo "  update command (SSL-safe):"
        echo "    • Pull latest code from git"
        echo "    • Build all projects"
        echo "    • Restart PM2 services"
        echo "    • Preserves Nginx/SSL configuration"
        echo ""
        echo "  ssl command:"
        echo "    • Setup SSL certificates (Let's Encrypt)"
        echo ""
        exit 1
        ;;
esac

