# 🔍 بررسی سرویس‌های مورد نیاز (Redis & Elasticsearch)

## تغییرات جدید

اسکریپت `deploy.sh` حالا **قبل از شروع دیپلوی**، سرویس‌های مورد نیاز را چک می‌کند.

---

## 🎯 سرویس‌های مورد نیاز

### 1️⃣ Redis
- **کاربرد**: Cache, Session Storage, Queue Management
- **پورت پیش‌فرض**: 6379
- **URL پیش‌فرض**: `redis://localhost:6379`

### 2️⃣ Elasticsearch
- **کاربرد**: Search Engine, Product Search
- **پورت پیش‌فرض**: 9200
- **URL پیش‌فرض**: `http://localhost:9200`

---

## ⚙️ Configuration

این آدرس‌ها در فایل `.properties` تنظیم می‌شوند:

```properties
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
```

---

## 🚨 رفتار بر اساس MODE

### Production Mode
اگر Redis یا Elasticsearch نصب نباشند یا در حال اجرا نباشند:
- ❌ **دیپلوی متوقف می‌شود**
- ❌ **پیغام خطای واضح نمایش داده می‌شود**
- ℹ️ **دستورات نصب و راه‌اندازی نمایش داده می‌شوند**

```bash
sudo bash deploy.sh production.properties deploy
```

**خروجی در صورت مشکل:**
```
✗ CRITICAL: Required services are not running!

For PRODUCTION deployment, you MUST have:

✗ Redis (In-memory cache & session store)
  Install: sudo apt-get install redis-server
  Start:   sudo systemctl start redis-server
  Enable:  sudo systemctl enable redis-server

✗ Elasticsearch (Search engine)
  Install guide: https://www.elastic.co/guide/en/elasticsearch/...
  Quick install (Ubuntu/Debian):
    wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
    ...
```

### Demo/Staging Mode
اگر سرویس‌ها نباشند:
- ⚠️ **هشدار نمایش داده می‌شود**
- ⚠️ **به کاربر اختیار ادامه داده می‌شود**
- ✅ **دیپلوی ادامه پیدا می‌کند (با تایید کاربر)**

```bash
sudo bash deploy.sh demo.properties deploy
```

**خروجی در صورت مشکل:**
```
⚠ WARNING: Some services are not running

Mode: demo
Deployment will continue, but some features may not work:

⚠ Redis - Caching and sessions will not work
⚠ Elasticsearch - Search functionality will not work

Continue anyway? (y/n)
```

---

## 📦 نصب Redis

### Ubuntu/Debian
```bash
# نصب
sudo apt-get update
sudo apt-get install redis-server

# راه‌اندازی
sudo systemctl start redis-server
sudo systemctl enable redis-server

# بررسی وضعیت
sudo systemctl status redis-server

# تست اتصال
redis-cli ping
# باید "PONG" برگرداند
```

### تنظیم پسورد (اختیاری، برای production توصیه می‌شود)
```bash
# ویرایش config
sudo nano /etc/redis/redis.conf

# پیدا کردن و uncommnet کردن:
requirepass your_secure_password

# Restart
sudo systemctl restart redis-server
```

اگر پسورد تنظیم کردید، در `.properties` به این صورت استفاده کنید:
```properties
REDIS_URL=redis://:your_secure_password@localhost:6379
```

---

## 📦 نصب Elasticsearch

### روش سریع (Ubuntu/Debian - روش جدید برای Ubuntu 22.04+)

```bash
# 1. اضافه کردن GPG Key (روش جدید - apt-key deprecated شده)
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# 2. اضافه کردن repository
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# 3. نصب
sudo apt-get update
sudo apt-get install elasticsearch

# 4. تنظیمات اولیه (برای local development)
# غیرفعال کردن security برای استفاده ساده
echo 'xpack.security.enabled: false' | sudo tee -a /etc/elasticsearch/elasticsearch.yml
echo 'network.host: localhost' | sudo tee -a /etc/elasticsearch/elasticsearch.yml
echo 'http.port: 9200' | sudo tee -a /etc/elasticsearch/elasticsearch.yml

# 5. راه‌اندازی
sudo systemctl daemon-reload
sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch

# 6. صبر کنید تا بالا بیاد (30-60 ثانیه)
echo "Waiting for Elasticsearch to start..."
sleep 45

# 7. بررسی
curl -X GET "localhost:9200/"
```

**نکته برای Ubuntu 20.04 و قبل‌تر:**
اگر از Ubuntu 20.04 یا پایین‌تر استفاده می‌کنید، می‌تونید از روش قدیمی با `apt-key` استفاده کنید:
```bash
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
sudo sh -c 'echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" > /etc/apt/sources.list.d/elastic-8.x.list'
sudo apt-get update
sudo apt-get install elasticsearch
```

**خروجی موفق:**
```json
{
  "name" : "node-1",
  "cluster_name" : "marketplace-cluster",
  "cluster_uuid" : "...",
  "version" : {
    "number" : "8.x.x",
    ...
  },
  "tagline" : "You Know, for Search"
}
```

### روش جایگزین: Docker

اگر Docker دارید:

```bash
# اجرای Elasticsearch با Docker
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# بررسی
curl localhost:9200
```

برای production، در `production.properties`:
```properties
ELASTICSEARCH_URL=http://localhost:9200
```

---

## 🔍 بررسی دستی سرویس‌ها

### Redis
```bash
# بررسی وضعیت
sudo systemctl status redis-server

# تست اتصال
redis-cli ping

# بررسی Port
sudo lsof -i :6379
```

### Elasticsearch
```bash
# بررسی وضعیت
sudo systemctl status elasticsearch

# تست اتصال
curl -X GET "localhost:9200/"

# بررسی Port
sudo lsof -i :9200
```

---

## 🛠️ Troubleshooting

### Redis نمی‌افتد بالا
```bash
# بررسی لاگ‌ها
sudo journalctl -u redis-server -n 50

# بررسی config
sudo redis-server /etc/redis/redis.conf --test

# Restart
sudo systemctl restart redis-server
```

### Elasticsearch نمی‌افتد بالا
```bash
# بررسی لاگ‌ها
sudo journalctl -u elasticsearch -n 50

# یا
sudo tail -f /var/log/elasticsearch/elasticsearch.log

# بررسی memory (Elasticsearch نیاز به حداقل 2GB RAM دارد)
free -h

# اگر memory کم است، heap size رو کم کنید:
sudo nano /etc/elasticsearch/jvm.options
# تغییر:
-Xms1g
-Xmx1g

# Restart
sudo systemctl restart elasticsearch
```

### خطای "Connection refused"
```bash
# مطمئن شوید سرویس در حال اجراست
sudo systemctl status redis-server
sudo systemctl status elasticsearch

# بررسی firewall
sudo ufw status

# اگر فایروال مشکل دارد (فقط برای localhost مشکلی نیست)
sudo ufw allow 6379/tcp
sudo ufw allow 9200/tcp
```

---

## 📝 نکات مهم

### 1. Production Requirements
برای production، **حتماً** باید این سرویس‌ها نصب و در حال اجرا باشند. بدون این‌ها:
- ❌ کش کار نمی‌کنه → سایت کند می‌شه
- ❌ Session کار نمی‌کنه → کاربرها نمی‌تونن login کنن
- ❌ Search کار نمی‌کنه → کاربرها نمی‌تونن محصول پیدا کنن

### 2. Demo/Test Environment
برای demo، می‌تونی بدون این سرویس‌ها هم ادامه بدی (ولی توصیه نمی‌شه)

### 3. Resource Requirements
- **Redis**: خیلی سبک، حدود 50-100 MB RAM
- **Elasticsearch**: سنگین‌تر، حداقل 2GB RAM توصیه می‌شه

### 4. Security
برای production:
- Redis: حتماً پسورد بذارید
- Elasticsearch: فقط روی localhost گوش بده یا authentication فعال کنید

---

## 🔄 جریان کار اسکریپت

```
1. check_root()
2. install_system_dependencies()
3. setup_database()
4. ✨ check_required_services()    ← جدید!
   ├─ Redis check
   ├─ Elasticsearch check
   └─ Production: خطا اگر نباشند
      Demo: هشدار و ادامه
5. clone_or_update_project()
6. build_projects()
7. setup_nginx()
8. setup_pm2()
9. start_services()
```

---

## 📋 Checklist قبل از Deploy

### Production
- [ ] Redis نصب و در حال اجراست
- [ ] Elasticsearch نصب و در حال اجراست
- [ ] Redis پسورد دارد (توصیه می‌شود)
- [ ] Elasticsearch روی localhost گوش می‌دهد
- [ ] آدرس‌ها در `production.properties` صحیح هستند

### Demo
- [ ] حداقل Redis نصب باشه (برای عملکرد بهتر)
- [ ] Elasticsearch اختیاری

---

## 🎯 خلاصه

با این تغییرات:
✅ اسکریپت قبل از deploy سرویس‌های مورد نیاز را چک می‌کند
✅ در production، deploy متوقف می‌شود اگر سرویس‌ها نباشند
✅ راهنمای نصب واضح نمایش داده می‌شود
✅ در demo، به کاربر هشدار داده می‌شود ولی ادامه پیدا می‌کند

**نتیجه:** کمتر خطا، deploy مطمئن‌تر! 🚀

