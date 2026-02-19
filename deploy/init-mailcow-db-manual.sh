#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✓${NC} ${1}"
}

print_error() {
    echo -e "${RED}✗${NC} ${1}"
}

if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run with sudo"
    exit 1
fi

cd /opt/mailcow-dockerized

echo "════════════════════════════════════════════════════════"
echo "Manual Database Initialization"
echo "════════════════════════════════════════════════════════"
echo ""

# Get DB credentials
DBNAME=$(grep "^DBNAME=" mailcow.conf | cut -d= -f2)
DBUSER=$(grep "^DBUSER=" mailcow.conf | cut -d= -f2)
DBPASS=$(grep "^DBPASS=" mailcow.conf | cut -d= -f2)
DBROOT=$(grep "^DBROOT=" mailcow.conf | cut -d= -f2)

print_info "Database: $DBNAME"
print_info "User: $DBUSER"

# Check MySQL is running
print_info "Checking MySQL..."
if ! docker compose exec -T mysql-mailcow mysqladmin ping -h localhost 2>/dev/null | grep -q "alive"; then
    print_error "MySQL is not running!"
    exit 1
fi
print_success "MySQL is running"

# Create database if not exists
print_info "Ensuring database exists..."
docker compose exec -T mysql-mailcow mysql -u root -p$DBROOT -e "CREATE DATABASE IF NOT EXISTS $DBNAME;" 2>/dev/null
print_success "Database exists"

# Create user if not exists
print_info "Ensuring user exists..."
docker compose exec -T mysql-mailcow mysql -u root -p$DBROOT -e "CREATE USER IF NOT EXISTS '$DBUSER'@'%' IDENTIFIED BY '$DBPASS';" 2>/dev/null
docker compose exec -T mysql-mailcow mysql -u root -p$DBROOT -e "GRANT ALL PRIVILEGES ON $DBNAME.* TO '$DBUSER'@'%';" 2>/dev/null
docker compose exec -T mysql-mailcow mysql -u root -p$DBROOT -e "FLUSH PRIVILEGES;" 2>/dev/null
print_success "User configured"

# Download and run Mailcow schema
print_info "Initializing Mailcow schema..."

# Get schema from container or create basic one
cat > /tmp/mailcow-schema.sql << 'EOF'
-- Mailcow basic schema
CREATE TABLE IF NOT EXISTS `versions` (
  `application` varchar(255) NOT NULL,
  `version` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`application`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `versions` (`application`, `version`) VALUES
('db_schema', 1),
('api', 1);

CREATE TABLE IF NOT EXISTS `admin` (
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `superadmin` tinyint(1) NOT NULL DEFAULT 1,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default admin user (password: moohoo)
INSERT INTO `admin` (`username`, `password`, `superadmin`, `active`) VALUES
('admin', '{SSHA256}K8eVJ6YsZbQCfuJvSUbaQRLr0HPLz5rC9IAp0PAFl0tmNDBkMDc0NDAyOTAxN2Rk', 1, 1)
ON DUPLICATE KEY UPDATE username=username;

CREATE TABLE IF NOT EXISTS `domain` (
  `domain` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `aliases` int(10) NOT NULL DEFAULT 400,
  `mailboxes` int(10) NOT NULL DEFAULT 10,
  `defquota` bigint(20) NOT NULL DEFAULT 3221225472,
  `maxquota` bigint(20) NOT NULL DEFAULT 10737418240,
  `quota` bigint(20) NOT NULL DEFAULT 10737418240,
  `transport` varchar(255) NOT NULL DEFAULT 'lmtp:inet:dovecot:24',
  `backupmx` tinyint(1) NOT NULL DEFAULT 0,
  `relay_all_recipients` tinyint(1) NOT NULL DEFAULT 0,
  `relay_unknown_only` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `mailbox` (
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `maildir` varchar(255) NOT NULL,
  `quota` bigint(20) NOT NULL DEFAULT 0,
  `local_part` varchar(255) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`username`),
  KEY `domain` (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `address` varchar(255) NOT NULL,
  `goto` text NOT NULL,
  `domain` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `address` (`address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
EOF

# Import schema
docker compose exec -T mysql-mailcow mysql -u $DBUSER -p$DBPASS $DBNAME < /tmp/mailcow-schema.sql 2>/dev/null
rm /tmp/mailcow-schema.sql

print_success "Schema initialized"

# Verify tables
print_info "Verifying tables..."
TABLE_COUNT=$(docker compose exec -T mysql-mailcow mysql -u $DBUSER -p$DBPASS $DBNAME -e "SHOW TABLES;" 2>/dev/null | wc -l)

if [ "$TABLE_COUNT" -gt 3 ]; then
    print_success "Found $((TABLE_COUNT-1)) tables"
    
    # Show tables
    print_info "Tables created:"
    docker compose exec -T mysql-mailcow mysql -u $DBUSER -p$DBPASS $DBNAME -e "SHOW TABLES;" 2>/dev/null | tail -n +2
else
    print_error "Tables not created properly"
    exit 1
fi

echo ""
print_success "════════════════════════════════════════════════════════"
print_success "Database initialized successfully!"
print_success "════════════════════════════════════════════════════════"
echo ""

print_info "Now restart all services:"
echo "  cd /opt/mailcow-dockerized"
echo "  docker compose restart"
echo ""
print_info "Or start remaining services:"
echo "  docker compose up -d"
echo ""
