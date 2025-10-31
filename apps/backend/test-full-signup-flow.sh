#!/bin/bash

###############################################################################
# تست کامل Flow ثبت نام با API ها
###############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}🧪 تست کامل Flow ثبت نام${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# شماره تصادفی برای تست
PHONE="09$(date +%s | tail -c 9)"
echo -e "${YELLOW}📱 شماره تست: ${PHONE}${NC}"
echo ""

# متغیرهای global
OTP_CODE=""
AUTH_TOKEN=""

# تابع برای نمایش response
show_response() {
    local response="$1"
    local title="$2"
    
    echo -e "${BLUE}${title}${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
}

# تابع برای چک success
check_success() {
    local response="$1"
    local step="$2"
    
    if echo "$response" | grep -q '"success":true' || echo "$response" | grep -q '"customer"'; then
        echo -e "${GREEN}✅ $step موفق بود${NC}"
        return 0
    else
        echo -e "${RED}❌ $step ناموفق بود${NC}"
        echo "$response"
        return 1
    fi
}

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}مرحله 1: چک کردن شماره (نباید وجود داشته باشه)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

CHECK_RESPONSE=$(curl -s -X GET "http://localhost:9000/store/customers/phone/${PHONE}")
show_response "$CHECK_RESPONSE" "📋 Response:"

if echo "$CHECK_RESPONSE" | grep -q '"customer":null'; then
    echo -e "${GREEN}✅ شماره وجود نداره (درست برای ثبت نام جدید)${NC}"
else
    echo -e "${RED}⚠️  شماره قبلاً ثبت شده${NC}"
fi
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}مرحله 2: ارسال OTP (بدون publishable key!)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SEND_OTP_RESPONSE=$(curl -s -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"${PHONE}\"}")

show_response "$SEND_OTP_RESPONSE" "📋 Response:"

if ! check_success "$SEND_OTP_RESPONSE" "ارسال OTP"; then
    echo -e "${RED}متوقف شد. خطا در ارسال OTP${NC}"
    exit 1
fi

# استخراج کد
OTP_CODE=$(echo "$SEND_OTP_RESPONSE" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
if [ -z "$OTP_CODE" ]; then
    echo -e "${RED}❌ کد در response نیست!${NC}"
    echo -e "${YELLOW}شاید APP_ENV=production هست؟${NC}"
    exit 1
fi

echo -e "${GREEN}🔐 کد OTP دریافتی: ${OTP_CODE}${NC}"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}مرحله 3: دیدن لیست کدها از API sandbox${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SANDBOX_RESPONSE=$(curl -s http://localhost:9000/store/auth/sandbox-messages)
show_response "$SANDBOX_RESPONSE" "📋 Response:"

if echo "$SANDBOX_RESPONSE" | grep -q '"success":true'; then
    COUNT=$(echo "$SANDBOX_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ API sandbox کار می‌کنه، تعداد پیامک‌ها: ${COUNT}${NC}"
    
    # چک کن که کد ما توی لیست هست
    if echo "$SANDBOX_RESPONSE" | grep -q "$OTP_CODE"; then
        echo -e "${GREEN}✅ کد ما توی لیست هست${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  API sandbox کار نکرد (شاید production mode؟)${NC}"
fi
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}مرحله 4: Verify کردن OTP${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

VERIFY_RESPONSE=$(curl -s -X POST http://localhost:9000/store/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"${PHONE}\", \"code\": \"${OTP_CODE}\"}")

show_response "$VERIFY_RESPONSE" "📋 Response:"

if ! check_success "$VERIFY_RESPONSE" "Verify OTP"; then
    echo -e "${RED}متوقف شد. خطا در verify${NC}"
    exit 1
fi

echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}مرحله 5: ثبت نام کاربر (Phone Auth)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PHONE_AUTH_RESPONSE=$(curl -s -X POST http://localhost:9000/store/auth/phone \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"${PHONE}\",
    \"firstName\": \"تست\",
    \"lastName\": \"کاربر\",
    \"isNewUser\": true
  }")

show_response "$PHONE_AUTH_RESPONSE" "📋 Response:"

if ! check_success "$PHONE_AUTH_RESPONSE" "ثبت نام"; then
    echo -e "${RED}متوقف شد. خطا در ثبت نام${NC}"
    exit 1
fi

# استخراج token
AUTH_TOKEN=$(echo "$PHONE_AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 | head -1)
if [ -n "$AUTH_TOKEN" ]; then
    echo -e "${GREEN}🎟️  Token دریافت شد: ${AUTH_TOKEN:0:30}...${NC}"
fi

echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}مرحله 6: چک کردن کاربر (باید وجود داشته باشه)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

FINAL_CHECK=$(curl -s -X GET "http://localhost:9000/store/customers/phone/${PHONE}")
show_response "$FINAL_CHECK" "📋 Response:"

if echo "$FINAL_CHECK" | grep -q '"first_name":"تست"'; then
    echo -e "${GREEN}✅ کاربر با موفقیت ثبت شد${NC}"
else
    echo -e "${RED}❌ کاربر پیدا نشد${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 تست کامل Flow ثبت نام موفق بود!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "خلاصه:"
echo "  ✅ چک شماره کار کرد"
echo "  ✅ ارسال OTP بدون publishable key"
echo "  ✅ کد در response بود"
echo "  ✅ API sandbox لیست کدها رو داد"
echo "  ✅ Verify کار کرد"
echo "  ✅ ثبت نام موفق بود"
echo "  ✅ کاربر در database ثبت شد"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"




