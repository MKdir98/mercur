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

# Global flags
FORCE_REBUILD=false
WITH_SSL=false
SKIP_SERVICES_CHECK=false

# Check arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: sudo bash $0 <CONFIG_FILE> [COMMAND] [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  CONFIG_FILE   Path to .properties configuration file"
    echo "  COMMAND       Optional command (update, deploy, ssl)"
    echo ""
    echo "Options:"
    echo "  --with-ssl           Automatically setup SSL after deployment"
    echo "  --force-rebuild      Force rebuild all projects even if no changes"
    echo "  --skip-services      Skip Redis/Elasticsearch checks (for dev/testing)"
    echo ""
    echo "Examples:"
    echo "  sudo bash $0 demo.properties deploy"
    echo "  sudo bash $0 production.properties deploy --with-ssl"
    echo "  sudo bash $0 production.properties update --force-rebuild"
    echo "  sudo bash $0 demo.properties deploy --skip-services"
    echo ""
    exit 1
fi

CONFIG_FILE="$1"
COMMAND="${2:-deploy}"

# Parse optional flags
shift 2 2>/dev/null || shift 1
while [ "$#" -gt 0 ]; do
    case "$1" in
        --with-ssl)
            WITH_SSL=true
            ;;
        --force-rebuild)
            FORCE_REBUILD=true
            ;;
        --skip-services)
            SKIP_SERVICES_CHECK=true
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
    shift
done

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
# Required Services Verification
###############################################################################

check_required_services() {
    # Skip if flag is set
    if [ "$SKIP_SERVICES_CHECK" = true ]; then
        print_warning "Skipping services check (--skip-services flag set)"
        return 0
    fi
    
    print_step "Checking required services..."
    
    local services_ok=true
    local redis_ok=false
    local elasticsearch_ok=false
    
    # Check Redis
    print_info "Checking Redis..."
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            print_success "Redis is running"
            redis_ok=true
        else
            print_error "Redis is installed but not running"
            print_info "Start Redis with: sudo systemctl start redis-server"
            services_ok=false
        fi
    else
        print_error "Redis is not installed"
        print_info "Install Redis with: sudo apt-get install redis-server"
        services_ok=false
    fi
    
    # Check Elasticsearch
    print_info "Checking Elasticsearch..."
    local es_url="${ELASTICSEARCH_URL:-http://localhost:9200}"
    
    if command -v curl &> /dev/null; then
        # Try to get response with timeout
        local es_response=$(curl -s --max-time 5 "$es_url" 2>/dev/null)
        local es_http_code=$(curl -s --max-time 5 "$es_url" -o /dev/null -w "%{http_code}" 2>/dev/null)
        
        # Check if we got any valid response (HTTP 200 or valid JSON with cluster info)
        if [[ "$es_http_code" == "200" ]] || echo "$es_response" | grep -q "cluster_name"; then
            print_success "Elasticsearch is running at $es_url"
            elasticsearch_ok=true
        else
            # Check if Elasticsearch process is running but not responding properly
            if systemctl is-active elasticsearch &>/dev/null || systemctl is-active elasticsearch.service &>/dev/null; then
                print_warning "Elasticsearch service is running but not responding properly"
                print_warning "This may indicate a configuration error (e.g., duplicate keys in YAML)"
                print_info "Check config: sudo grep -E 'xpack.security|network.host|http.port' /etc/elasticsearch/elasticsearch.yml"
                print_info "Check logs: sudo journalctl -u elasticsearch -n 50"
            else
                print_error "Elasticsearch is not responding at $es_url"
                print_info "Check if Elasticsearch is running or install it"
            fi
            services_ok=false
        fi
    else
        print_warning "curl not available, skipping Elasticsearch check"
    fi
    
    # For production mode, these services are REQUIRED
    if [ "$DEPLOY_MODE" = "production" ]; then
        if [ "$services_ok" = false ]; then
            echo ""
            print_error "════════════════════════════════════════════════════════"
            print_error "CRITICAL: Required services are not running!"
            print_error "════════════════════════════════════════════════════════"
            echo ""
            print_error "For PRODUCTION deployment, you MUST have:"
            echo ""
            if [ "$redis_ok" = false ]; then
                echo "  ✗ Redis (In-memory cache & session store)"
                echo "    Install: sudo apt-get install redis-server"
                echo "    Start:   sudo systemctl start redis-server"
                echo "    Enable:  sudo systemctl enable redis-server"
                echo ""
            fi
            if [ "$elasticsearch_ok" = false ]; then
                echo "  ✗ Elasticsearch (Search engine)"
                echo "    Install guide: https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html"
                echo ""
                echo "    Quick install (Ubuntu/Debian - NEW METHOD):"
                echo "      # Download and install GPG key"
                echo "      wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg"
                echo ""
                echo "      # Add repository"
                echo "      echo \"deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main\" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list"
                echo ""
                echo "      # Install"
                echo "      sudo apt-get update"
                echo "      sudo apt-get install elasticsearch"
                echo ""
                echo "      # Configure (disable security for local development)"
                echo "      echo 'xpack.security.enabled: false' | sudo tee -a /etc/elasticsearch/elasticsearch.yml"
                echo "      echo 'network.host: localhost' | sudo tee -a /etc/elasticsearch/elasticsearch.yml"
                echo ""
                echo "      # Start"
                echo "      sudo systemctl daemon-reload"
                echo "      sudo systemctl enable elasticsearch"
                echo "      sudo systemctl start elasticsearch"
                echo ""
                echo "      # Wait and test (takes 30-60 seconds to start)"
                echo "      sleep 30 && curl localhost:9200"
                echo ""
            fi
            print_error "Please install and start the required services, then run deploy again."
            print_error "════════════════════════════════════════════════════════"
            exit 1
        fi
    else
        # For non-production (demo, staging, etc), show warning but continue
        if [ "$services_ok" = false ]; then
            echo ""
            print_warning "════════════════════════════════════════════════════════"
            print_warning "WARNING: Some services are not running"
            print_warning "════════════════════════════════════════════════════════"
            echo ""
            print_warning "Mode: $DEPLOY_MODE"
            print_warning "Deployment will continue, but some features may not work:"
            echo ""
            if [ "$redis_ok" = false ]; then
                echo "  ⚠ Redis - Caching and sessions will not work"
            fi
            if [ "$elasticsearch_ok" = false ]; then
                echo "  ⚠ Elasticsearch - Search functionality will not work"
            fi
            echo ""
            print_warning "Consider installing these services for full functionality."
            print_warning "════════════════════════════════════════════════════════"
            echo ""
            
            # Give user a chance to abort
            read -p "Continue anyway? (y/n) " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Deployment cancelled by user"
                exit 0
            fi
        fi
    fi
    
    print_success "Service verification completed"
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
        
        # Get current commit hash
        local old_hash=$(git rev-parse HEAD 2>/dev/null || echo "")
        
        # Stash any local changes
        git stash save "Auto-stash before pull at $(date)" 2>/dev/null || true
        
        # Pull latest changes
        git pull origin main || git pull origin master
        
        # Get new commit hash
        local new_hash=$(git rev-parse HEAD 2>/dev/null || echo "")
        
        # Store whether changes occurred (global variable for build decisions)
        if [ "$old_hash" = "$new_hash" ]; then
            eval "${repo_name//-/_}_HAS_CHANGES=false"
            print_success "$project_name is up to date (no changes)"
        else
            eval "${repo_name//-/_}_HAS_CHANGES=true"
            print_success "$project_name updated ($(git log --oneline $old_hash..$new_hash 2>/dev/null | wc -l) new commits)"
        fi
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
        
        # New clone always needs build
        eval "${repo_name//-/_}_HAS_CHANGES=true"
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

# Elasticsearch
ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-http://localhost:9200}

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

# Postex Shipping Configuration
POSTEX_API_KEY=${POSTEX_API_KEY:-your_postex_api_key_here}
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

build_backend() {
    local BUILD_LOG_FILE="/tmp/build_backend_$$.log"
    {
        cd "$DEPLOY_DIR/$BACKEND_REPO"
        
        local YARN_CACHE_DIR="$DEPLOY_DIR/.cache/yarn"
        mkdir -p "$YARN_CACHE_DIR"
        
        export NODE_OPTIONS="--max-old-space-size=8192"
        
        yarn install --frozen-lockfile --cache-folder "$YARN_CACHE_DIR" 2>&1 || yarn install --cache-folder "$YARN_CACHE_DIR" 2>&1
        cd apps/backend
        yarn build 2>&1
        
        unset NODE_OPTIONS
        
        echo "BACKEND_BUILD_SUCCESS" >> "$BUILD_LOG_FILE"
    } > "$BUILD_LOG_FILE" 2>&1
    
    if grep -q "BACKEND_BUILD_SUCCESS" "$BUILD_LOG_FILE"; then
        return 0
    else
        return 1
    fi
}

build_storefront() {
    local BUILD_LOG_FILE="/tmp/build_storefront_$$.log"
    {
        cd "$DEPLOY_DIR/$STOREFRONT_REPO"
        
        cp .env.production .env.local 2>&1
        
        local NPM_CACHE_DIR="$DEPLOY_DIR/.cache/npm"
        mkdir -p "$NPM_CACHE_DIR"
        
        export NODE_OPTIONS="--max-old-space-size=4096"
        
        npm ci --cache "$NPM_CACHE_DIR" 2>&1 || npm install --cache "$NPM_CACHE_DIR" 2>&1
        NODE_ENV=production npm run build 2>&1
        
        unset NODE_OPTIONS
        
        echo "STOREFRONT_BUILD_SUCCESS" >> "$BUILD_LOG_FILE"
    } > "$BUILD_LOG_FILE" 2>&1
    
    if grep -q "STOREFRONT_BUILD_SUCCESS" "$BUILD_LOG_FILE"; then
        return 0
    else
        return 1
    fi
}

build_vendor_panel() {
    local BUILD_LOG_FILE="/tmp/build_vendor_$$.log"
    {
        cd "$DEPLOY_DIR/$VENDOR_REPO"
        
        cp .env.production .env 2>&1
        
        local NPM_CACHE_DIR="$DEPLOY_DIR/.cache/npm"
        mkdir -p "$NPM_CACHE_DIR"
        
        export NODE_OPTIONS="--max-old-space-size=2048"
        
        npm ci --cache "$NPM_CACHE_DIR" 2>&1 || npm install --cache "$NPM_CACHE_DIR" 2>&1
        npm run build:preview 2>&1
        
        unset NODE_OPTIONS
        
        echo "VENDOR_BUILD_SUCCESS" >> "$BUILD_LOG_FILE"
    } > "$BUILD_LOG_FILE" 2>&1
    
    if grep -q "VENDOR_BUILD_SUCCESS" "$BUILD_LOG_FILE"; then
        return 0
    else
        return 1
    fi
}

build_projects() {
    print_step "Building projects..."
    
    local backend_needs_build=true
    local storefront_needs_build=true
    local vendor_needs_build=true
    
    if [ "$FORCE_REBUILD" = false ]; then
        eval "backend_needs_build=\${${BACKEND_REPO//-/_}_HAS_CHANGES:-true}"
        eval "storefront_needs_build=\${${STOREFRONT_REPO//-/_}_HAS_CHANGES:-true}"
        eval "vendor_needs_build=\${${VENDOR_REPO//-/_}_HAS_CHANGES:-true}"
    fi
    
    mkdir -p "$DEPLOY_DIR/.cache/yarn"
    mkdir -p "$DEPLOY_DIR/.cache/npm"
    
    local build_pids=()
    local build_names=()
    local build_log_files=()
    
    if [ "$backend_needs_build" = true ]; then
        print_info "Building Backend ($BACKEND_REPO) with Yarn..."
        build_backend &
        build_pids+=($!)
        build_names+=("Backend")
        build_log_files+=("/tmp/build_backend_$$.log")
    else
        print_info "Skipping Backend build (no changes detected, use --force-rebuild to override)"
    fi
    
    if [ "$storefront_needs_build" = true ]; then
        print_info "Building Storefront ($STOREFRONT_REPO) with npm..."
        build_storefront &
        build_pids+=($!)
        build_names+=("Storefront")
        build_log_files+=("/tmp/build_storefront_$$.log")
    else
        print_info "Skipping Storefront build (no changes detected, use --force-rebuild to override)"
    fi
    
    if [ "$vendor_needs_build" = true ]; then
        print_info "Building Vendor Panel ($VENDOR_REPO) with npm..."
        build_vendor_panel &
        build_pids+=($!)
        build_names+=("Vendor Panel")
        build_log_files+=("/tmp/build_vendor_$$.log")
    else
        print_info "Skipping Vendor Panel build (no changes detected, use --force-rebuild to override)"
    fi
    
    local build_failed=false
    for i in "${!build_pids[@]}"; do
        local pid="${build_pids[$i]}"
        local name="${build_names[$i]}"
        local log_file="${build_log_files[$i]}"
        
        if wait "$pid"; then
            print_success "$name built successfully"
        else
            print_error "$name build failed!"
            echo ""
            print_error "════════════════════════════════════════════════════════"
            print_error "Build log for $name:"
            print_error "════════════════════════════════════════════════════════"
            if [ -f "$log_file" ]; then
                tail -100 "$log_file"
            else
                print_error "Log file not found: $log_file"
            fi
            echo ""
            build_failed=true
        fi
    done
    
    rm -f /tmp/build_*_$$.log 2>/dev/null || true
    
    if [ "$build_failed" = true ]; then
        print_error "One or more builds failed. Please check the logs above."
        exit 1
    fi
    
    if [ "$backend_needs_build" = true ]; then
        print_info "Running database migrations..."
        cd "$DEPLOY_DIR/$BACKEND_REPO/apps/backend"
        yarn db:migrate
        print_success "Migrations completed"
    fi
    
    print_success "All builds completed successfully!"
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
    print_info "════════════════════════════════════════════════════════"
    print_info "SSL Setup - Make sure DNS is configured before running"
    print_info "  1. DNS A records pointing to this server's IP"
    print_info "  2. Ports 80 and 443 are open"
    print_info "  3. Domain names are correct in the config file"
    print_info "════════════════════════════════════════════════════════"
    echo ""
    
    # Get SSL for storefront
    print_info "Getting SSL certificate for storefront..."
    certbot --nginx -d $STOREFRONT_DOMAIN -d www.$STOREFRONT_DOMAIN --non-interactive --agree-tos --redirect --email admin@$STOREFRONT_DOMAIN || {
        print_warning "Failed to get SSL for storefront. DNS may not be configured yet."
        print_warning "You can try manually later with: sudo certbot --nginx -d $STOREFRONT_DOMAIN"
    }
    
    # Get SSL for backend
    print_info "Getting SSL certificate for backend..."
    certbot --nginx -d $BACKEND_DOMAIN --non-interactive --agree-tos --redirect --email admin@$STOREFRONT_DOMAIN || {
        print_warning "Failed to get SSL for backend. DNS may not be configured yet."
        print_warning "You can try manually later with: sudo certbot --nginx -d $BACKEND_DOMAIN"
    }
    
    # Get SSL for vendor panel
    print_info "Getting SSL certificate for vendor panel..."
    certbot --nginx -d $VENDOR_DOMAIN --non-interactive --agree-tos --redirect --email admin@$STOREFRONT_DOMAIN || {
        print_warning "Failed to get SSL for vendor panel. DNS may not be configured yet."
        print_warning "You can try manually later with: sudo certbot --nginx -d $VENDOR_DOMAIN"
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
    
    print_info "Starting fast update process (SSL-safe) for $DEPLOY_MODE..."
    if [ "$FORCE_REBUILD" = true ]; then
        print_warning "Force rebuild enabled - all projects will be rebuilt"
    else
        print_info "Smart rebuild enabled - only changed projects will be rebuilt"
    fi
    echo ""
    
    # Check root privileges
    check_root
    
    # Check required services (Redis & Elasticsearch)
    check_required_services
    echo ""
    
    # Clone or update projects (with git change detection)
    print_step "Updating projects from git..."
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
    
    # Build projects (parallel builds with smart rebuild)
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
    print_info "Next update with force rebuild:"
    echo "  sudo bash $0 $CONFIG_FILE update --force-rebuild"
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
    
    # Check required services (Redis & Elasticsearch)
    check_required_services
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
    
    # Setup SSL if flag is set
    if [ "$WITH_SSL" = true ]; then
        echo ""
        print_info "Setting up SSL (--with-ssl flag detected)..."
        setup_ssl_auto
    else
        echo ""
        print_info "To enable HTTPS/SSL, run:"
        echo ""
        echo "  sudo bash $0 $CONFIG_FILE ssl"
        echo "  OR"
        echo "  sudo bash $0 $CONFIG_FILE deploy --with-ssl"
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
        echo "Usage: sudo bash $0 <CONFIG_FILE> [COMMAND] [OPTIONS]"
        echo ""
        echo "Commands:"
        echo "  deploy        Full deployment (install, build, configure)"
        echo "  update        Update code & rebuild (SSL-safe, preserves Nginx config)"
        echo "  ssl           Setup SSL/HTTPS certificates"
        echo ""
        echo "Options:"
        echo "  --with-ssl           Automatically setup SSL after deployment"
        echo "  --force-rebuild      Force rebuild all projects even if no changes"
        echo "  --skip-services      Skip Redis/Elasticsearch checks (for dev/testing)"
        echo ""
        echo "Examples:"
        echo "  sudo bash $0 demo.properties deploy"
        echo "  sudo bash $0 production.properties deploy --with-ssl"
        echo "  sudo bash $0 production.properties update --force-rebuild"
        echo "  sudo bash $0 demo.properties ssl"
        echo ""
        echo "What this script does:"
        echo ""
        echo "  deploy command:"
        echo "    • Install dependencies (Node.js, Nginx, PostgreSQL, Redis, PM2)"
        echo "    • Clone or update all three projects"
        echo "    • Smart rebuild (only changed projects, use --force-rebuild to override)"
        echo "    • Parallel builds with caching for faster deployment"
        echo "    • Configure Nginx as reverse proxy"
        echo "    • Start services with PM2"
        echo "    • Configure firewall"
        echo "    • Optional: Setup SSL with --with-ssl flag"
        echo ""
        echo "  update command (SSL-safe, fast):"
        echo "    • Pull latest code from git"
        echo "    • Smart rebuild (only changed projects)"
        echo "    • Parallel builds with caching"
        echo "    • Restart PM2 services"
        echo "    • Preserves Nginx/SSL configuration"
        echo ""
        echo "  ssl command:"
        echo "    • Setup SSL certificates with Let's Encrypt (non-interactive)"
        echo "    • Auto-renewal configuration"
        echo ""
        echo "Performance Features:"
        echo "  ✓ Parallel builds (Backend, Storefront, Vendor Panel)"
        echo "  ✓ Smart rebuild (skip unchanged projects)"
        echo "  ✓ Build caching (npm/yarn)"
        echo "  ✓ Git change detection"
        echo ""
        exit 1
        ;;
esac

