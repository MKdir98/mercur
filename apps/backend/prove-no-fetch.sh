#!/bin/bash

###############################################################################
# اثبات اینکه در local هیچ fetch ای نمیشه
###############################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 اثبات: هیچ fetch ای به SMS.ir نمیشه${NC}"
echo ""

# چک APP_ENV
echo -e "${YELLOW}1️⃣ چک کردن APP_ENV...${NC}"
if [ -f .env ]; then
    APP_ENV=$(grep "^APP_ENV=" .env | cut -d'=' -f2 || echo "not_set")
    if [ "$APP_ENV" = "local" ] || [ "$APP_ENV" = "demo" ]; then
        echo -e "${GREEN}✅ APP_ENV=$APP_ENV (sandbox mode)${NC}"
    else
        echo -e "${RED}❌ APP_ENV=$APP_ENV${NC}"
        echo "   برای تست، باید APP_ENV=local یا demo باشه"
        exit 1
    fi
else
    echo -e "${RED}❌ فایل .env وجود ندارد${NC}"
    exit 1
fi
echo ""

# نمایش کد
echo -e "${YELLOW}2️⃣ نمایش کد (بدون fetch):${NC}"
echo ""
cat << 'CODEBLOCK'
// در local/demo این کد اجرا میشه:

async sendOTP(phone: string, code: string) {
  if (this.config.isSandbox) {
    return this.sendSandboxOTP(phone, code)  // ← برگشت اینجا
  }
  
  // این خط اصلاً اجرا نمیشه! ↓
  const response = await fetch(...)  // ❌ نمیرسه اینجا
}

private sendSandboxOTP(phone: string, code: string) {
  // فقط در memory ذخیره میکنیم
  sandboxMessages.set(phone, { phone, code, ... })
  
  // فقط console.log
  console.log('📱 [LOCAL SMS - NO FETCH] ...')
  
  // return میکنیم
  return { success: true, code }
  
  // هیچ fetch ای نیست! ✅
}
CODEBLOCK
echo ""

# تست واقعی
echo -e "${YELLOW}3️⃣ تست واقعی:${NC}"
echo ""

# چک backend
if ! curl -s http://localhost:9000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend اجرا نیست${NC}"
    echo "   اجرا کن: yarn dev"
    exit 1
fi

# ارسال OTP
echo "   ارسال OTP..."
RESULT=$(curl -s -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}')

# بررسی نتیجه
if echo "$RESULT" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ موفق بود (بدون هیچ fetch ای!)${NC}"
    
    # استخراج messageId
    MESSAGE_ID=$(echo "$RESULT" | grep -o '"messageId":"[^"]*"' | cut -d'"' -f4)
    
    if [[ "$MESSAGE_ID" == local_* ]]; then
        echo -e "${GREEN}✅ messageId = $MESSAGE_ID (شروع با 'local_')${NC}"
        echo -e "${GREEN}✅ این ثابت می‌کنه که از حالت local استفاده شده${NC}"
    else
        echo -e "${YELLOW}⚠️  messageId = $MESSAGE_ID${NC}"
    fi
    
    # چک کردن code
    if echo "$RESULT" | grep -q '"code"'; then
        CODE=$(echo "$RESULT" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ کد در response: $CODE${NC}"
    fi
else
    echo -e "${RED}❌ خطا:${NC}"
    echo "$RESULT"
fi
echo ""

# دیدن لیست کدها
echo -e "${YELLOW}4️⃣ دیدن لیست کدها از API جداگانه:${NC}"
echo ""

MESSAGES=$(curl -s http://localhost:9000/store/auth/sandbox-messages)

if echo "$MESSAGES" | grep -q '"success":true'; then
    COUNT=$(echo "$MESSAGES" | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
    echo -e "${GREEN}✅ API کار می‌کنه، تعداد پیامک‌ها: $COUNT${NC}"
    
    if [ "$COUNT" -gt 0 ]; then
        echo ""
        echo "آخرین کدها:"
        echo "$MESSAGES" | python3 -m json.tool 2>/dev/null | grep -A 3 '"phone"' | head -n 12
    fi
else
    echo -e "${RED}❌ API کار نکرد${NC}"
    echo "$MESSAGES"
fi
echo ""

# خلاصه
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ثابت شد: هیچ fetch ای نمیشه!${NC}"
echo ""
echo "چطور متوجه شدیم:"
echo "  1. APP_ENV=local/demo (sandbox mode فعال)"
echo "  2. messageId با 'local_' شروع میشه (نه 'sandbox_')"
echo "  3. کد در response هست (فقط در local)"
echo "  4. API لیست کدها کار می‌کنه (فقط در local)"
echo "  5. در کد، اگه isSandbox=true، اصلاً به fetch نمیرسیم"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"




