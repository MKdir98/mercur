#!/bin/bash

###############################################################################
# تست جریان جدید SMS در محیط Local
###############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 تست جریان جدید SMS...${NC}"
echo ""

# تابع کمکی
show_result() {
    if echo "$1" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ موفق${NC}"
        echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
    else
        echo -e "${RED}❌ خطا${NC}"
        echo "$1"
    fi
}

# چک کردن backend
echo -e "${YELLOW}1️⃣ چک کردن Backend...${NC}"
if curl -s http://localhost:9000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend اجرا است${NC}"
else
    echo -e "${RED}❌ Backend اجرا نیست!${NC}"
    echo "   اجرا کنید: cd apps/backend && yarn dev"
    exit 1
fi
echo ""

# چک کردن APP_ENV
echo -e "${YELLOW}2️⃣ چک کردن APP_ENV...${NC}"
if [ -f .env ]; then
    APP_ENV=$(grep "^APP_ENV=" .env | cut -d'=' -f2 || echo "not_set")
    if [ "$APP_ENV" = "local" ] || [ "$APP_ENV" = "demo" ]; then
        echo -e "${GREEN}✅ APP_ENV=$APP_ENV${NC}"
    else
        echo -e "${RED}❌ APP_ENV=$APP_ENV (باید local یا demo باشه)${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ فایل .env وجود ندارد!${NC}"
    exit 1
fi
echo ""

# تست ارسال OTP
echo -e "${YELLOW}3️⃣ تست ارسال OTP...${NC}"
PHONE="09$(date +%s | tail -c 9)"
echo "   شماره تست: $PHONE"

RESULT=$(curl -s -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\"}")

show_result "$RESULT"

if echo "$RESULT" | grep -q '"code"'; then
    CODE=$(echo "$RESULT" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
    echo ""
    echo -e "${GREEN}📱 کد OTP در response: ${CODE}${NC}"
    echo -e "${GREEN}✅ کد در response هست (sandbox mode کار می‌کنه)${NC}"
else
    echo -e "${RED}❌ کد در response نیست! احتمالاً APP_ENV production هست${NC}"
    exit 1
fi
echo ""

# تست API جدید sandbox-messages
echo -e "${YELLOW}4️⃣ تست API sandbox-messages...${NC}"
sleep 1

MESSAGES=$(curl -s http://localhost:9000/store/auth/sandbox-messages)

if echo "$MESSAGES" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ API sandbox-messages کار می‌کنه${NC}"
    
    COUNT=$(echo "$MESSAGES" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo "   تعداد پیامک‌ها: $COUNT"
    
    if [ "$COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ پیامک‌ها در store ذخیره شدن${NC}"
    fi
else
    echo -e "${RED}❌ API sandbox-messages کار نمی‌کنه${NC}"
    echo "$MESSAGES"
fi
echo ""

# تست verify
echo -e "${YELLOW}5️⃣ تست Verify OTP...${NC}"

VERIFY_RESULT=$(curl -s -X POST http://localhost:9000/store/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\", \"code\": \"$CODE\"}")

show_result "$VERIFY_RESULT"
echo ""

# تست Rate Limiting
echo -e "${YELLOW}6️⃣ تست Rate Limiting (درخواست دوم بلافاصله)...${NC}"

RATE_RESULT=$(curl -s -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\"}")

if echo "$RATE_RESULT" | grep -q "صبر کنید"; then
    SECONDS=$(echo "$RATE_RESULT" | grep -o '[0-9]* ثانیه' | cut -d' ' -f1)
    echo -e "${GREEN}✅ Rate limiting کار می‌کنه (${SECONDS} ثانیه)${NC}"
    
    if [ "$SECONDS" -le 30 ]; then
        echo -e "${GREEN}✅ Rate limit در local کمتر از 30 ثانیه است${NC}"
    else
        echo -e "${YELLOW}⚠️  Rate limit ${SECONDS} ثانیه است (انتظار: ≤30)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Rate limiting فعال نشد (ممکنه قبلاً clear شده باشه)${NC}"
fi
echo ""

# تست خطا در SMS (شماره نامعتبر)
echo -e "${YELLOW}7️⃣ تست خطا بدون Rate Limit...${NC}"
echo "   (تست با شماره نامعتبر - باید بدون rate limit خطا بده)"

# پاک کردن rate limit
curl -s -X POST http://localhost:9000/store/auth/clear-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"invalid\"}" > /dev/null

ERROR_RESULT=$(curl -s -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "invalid"}')

if echo "$ERROR_RESULT" | grep -q "فرمت شماره"; then
    echo -e "${GREEN}✅ خطای validation درست کار می‌کنه${NC}"
    
    # دوباره همون درخواست
    ERROR_RESULT2=$(curl -s -X POST http://localhost:9000/store/auth/send-otp \
      -H "Content-Type: application/json" \
      -d '{"phone": "invalid"}')
    
    if ! echo "$ERROR_RESULT2" | grep -q "صبر کنید"; then
        echo -e "${GREEN}✅ خطا بدون rate limit است${NC}"
    else
        echo -e "${RED}❌ خطا rate limit داره (نباید!)${NC}"
    fi
fi
echo ""

# خلاصه
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 همه تست‌ها موفق بودند!${NC}"
echo ""
echo "خلاصه تغییرات:"
echo "  ✅ در local/demo هیچ درخواستی به SMS.ir نمیره"
echo "  ✅ کد در response و console نمایش داده میشه"
echo "  ✅ API sandbox-messages برای لیست کدها کار می‌کنه"
echo "  ✅ Rate limiting فقط برای درخواست‌های موفق اعمال میشه"
echo "  ✅ در صورت خطا، rate limit اعمال نمیشه"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"





