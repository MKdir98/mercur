#!/bin/bash

###############################################################################
# Script برای Reset و تست SMS در محیط Local
###############################################################################

set -e

BACKEND_DIR="/home/mehdi/all/repositories/github.com/mercur/apps/backend"

echo "🔧 Reset و تنظیم SMS برای محیط Local..."
echo ""

# مرحله 1: پاک کردن .env قدیمی و ساخت جدید
echo "1️⃣ تنظیم .env برای local..."
cd "$BACKEND_DIR"

# Backup فایل قدیمی
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# ساخت .env جدید
cat > .env << 'ENVEOF'
# Environment - مهم ترین تنظیم!
APP_ENV=local

# Database (تنظیمات خودت رو بذار)
DATABASE_URL=postgres://mercuruser:your_password@localhost:5432/mercur
DB_NAME=mercur

# Redis
REDIS_URL=redis://localhost:6379

# CORS - اجازه دسترسی از frontend
STORE_CORS=http://localhost:3001,http://localhost:3000
AUTH_CORS=http://localhost:3001,http://localhost:3000,http://localhost:9000
ADMIN_CORS=http://localhost:9000
VENDOR_CORS=http://localhost:5173

# Security
JWT_SECRET=local-test-jwt-secret-key-12345
COOKIE_SECRET=local-test-cookie-secret-key-67890

# SMS.ir - در local نیاز به کلید واقعی نیست
SMS_IR_SANDBOX_API_KEY=sandbox_test_key
SMS_IR_SANDBOX_LINE_NUMBER=sandbox_line
SMS_IR_TEMPLATE_ID=123456

# URLs
BACKEND_URL=http://localhost:9000
STOREFRONT_URL=http://localhost:3001
VENDOR_PANEL_URL=http://localhost:5173
ENVEOF

echo "   ✅ فایل .env ساخته شد"
echo ""

# مرحله 2: نمایش تنظیمات
echo "2️⃣ تنظیمات فعلی:"
echo "   APP_ENV = $(grep APP_ENV .env | cut -d'=' -f2)"
echo "   SMS_IR_SANDBOX_API_KEY = $(grep SMS_IR_SANDBOX_API_KEY .env | cut -d'=' -f2)"
echo ""

# مرحله 3: تست سریع
echo "3️⃣ آماده برای اجرا!"
echo ""
echo "📝 دستورات بعدی:"
echo ""
echo "   # در این terminal:"
echo "   yarn dev"
echo ""
echo "   # در terminal دیگه (بعد از اجرا):"
echo "   curl -X POST http://localhost:9000/store/auth/send-otp \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"phone\": \"09123456789\"}'"
echo ""
echo "   باید کد OTP رو در این terminal ببینی!"
echo ""

echo "🎯 تنظیمات کامل شد!"





