#!/bin/bash

###############################################################################
# تست سریع SMS در محیط Local
###############################################################################

echo "🧪 تست SMS در محیط Local..."
echo ""

# رنگ‌ها
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# تابع برای نمایش نتایج
show_result() {
    if echo "$1" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ موفق!${NC}"
        echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
    else
        echo -e "${RED}❌ خطا!${NC}"
        echo "$1"
    fi
}

# چک کردن backend
echo "1️⃣ چک کردن Backend..."
if curl -s http://localhost:9000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend در حال اجرا${NC}"
else
    echo -e "${RED}❌ Backend اجرا نیست!${NC}"
    echo "   برای اجرا: cd apps/backend && yarn dev"
    exit 1
fi
echo ""

# تست ارسال OTP
echo "2️⃣ تست ارسال OTP..."
PHONE="09$(date +%s | tail -c 9)"  # شماره تصادفی
echo "   شماره تست: $PHONE"
echo ""

RESULT=$(curl -s -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\"}")

show_result "$RESULT"

# استخراج کد OTP
if echo "$RESULT" | grep -q '"code"'; then
    CODE=$(echo "$RESULT" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
    echo ""
    echo -e "${YELLOW}📱 کد OTP: ${CODE}${NC}"
    echo ""
    
    # تست verify
    echo "3️⃣ تست Verify OTP..."
    sleep 1
    
    VERIFY_RESULT=$(curl -s -X POST http://localhost:9000/store/auth/verify-otp \
      -H "Content-Type: application/json" \
      -d "{\"phone\": \"$PHONE\", \"code\": \"$CODE\"}")
    
    show_result "$VERIFY_RESULT"
    
    if echo "$VERIFY_RESULT" | grep -q '"success":true'; then
        echo ""
        echo -e "${GREEN}🎉 همه تست‌ها موفق بود!${NC}"
        echo ""
        echo "✅ Backend درست کار می‌کنه"
        echo "✅ SMS در حالت Sandbox هست"
        echo "✅ کدهای OTP تولید می‌شن"
        echo "✅ Verify کردن کار می‌کنه"
    fi
else
    echo ""
    echo -e "${RED}⚠️  کد OTP در response نیست${NC}"
    echo "   احتمالاً APP_ENV=production هست یا به SMS.ir واقعی درخواست میده"
    echo ""
    echo "راه حل:"
    echo "   1. چک کن: cat apps/backend/.env | grep APP_ENV"
    echo "   2. باید APP_ENV=local باشه"
    echo "   3. Backend رو restart کن"
fi

echo ""
echo "✅ تست کامل شد!"





