# نشر «وصولي» كموقع حقيقي

التطبيق Node.js واحد يقدّم الواجهة والـ API معًا. البناء ينتج:

- `dist/public` — ملفات الواجهة (HTML/CSS/JS/الصور)
- `dist/boot.js` — السيرفر (Hono + tRPC) الذي يقدّم الملفات و`/api/*`

المطلوب للنشر: **استضافة Node.js** + **قاعدة MySQL** + (اختياري لكن مفضّل) **Google OAuth** لتسجيل الدخول.

---

## الخيار الأول (الأسهل): Railway

### 1) ارفع الكود على GitHub

الريبو الحالي: `https://github.com/Hassanayed69/wasoly0x`
وتأكد أن آخر نسخة مدفوعة:

```bash
git add .
git commit -m "deploy: production config"
git push
```

### 2) أنشئ مشروعًا في Railway

1. ادخل على <https://railway.app> وسجّل بحساب GitHub.
2. **New Project → Deploy from GitHub repo** واختر `wasoly0x`.
3. من إعدادات الخدمة (Service → Settings):
   - **Root Directory** = `app`
   - Railway سيتعرف على `Dockerfile` تلقائيًا (أو من `railway.json`).
4. أضف قاعدة بيانات: **New → Database → MySQL**.
5. في خدمة التطبيق → **Variables** أضف المتغيرات التالية:

| المتغير | القيمة |
|---|---|
| `APP_SECRET` | نص عشوائي طويل — ولّده بالأمر أدناه |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` (مرجع لمتغير قاعدة البيانات) |
| `GOOGLE_CLIENT_ID` | من Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | من Google Cloud Console |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Railway يضبطه تلقائيًا عادةً، اتركه إن ظهر) |

توليد `APP_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ملاحظة: لو قالب MySQL أعطى اسمًا مختلفًا للمتغير، استخدم `MYSQL_URL` أو انسخ القيمة يدويًا إلى `DATABASE_URL`. يجب أن تبدأ بـ `mysql://`.

6. **Settings → Networking → Generate Domain** لتحصل على رابط مثل:
   `https://wasoly0x-production.up.railway.app`

### 3) جهّز جداول قاعدة البيانات

من جهازك، وبعد أن تنسخ `DATABASE_URL` من Railway إلى ملف `.env` محلي:

```bash
cd app
npx drizzle-kit push
```

هذا ينشئ كل الجداول في قاعدة البيانات المستضافة (مرة واحدة، أو بعد أي تعديل في `db/schema.ts`).

### 4) فعّل Google Sign-In

1. <https://console.cloud.google.com> → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**:
   `https://your-domain.up.railway.app`
4. **Authorized redirect URIs**:
   `https://your-domain.up.railway.app/api/auth/google/callback`
5. انسخ الـ Client ID و Secret إلى متغيرات Railway، ثم أعد النشر (Redeploy).

> بدون Google credentials التطبيق يعمل بوضع «متابعة كضيف»، لكن الحساب والمزامنة لن يعملوا.

### 5) تأكد أن الموقع شغّال

- الصفحة الرئيسية: `https://your-domain/`
- فحص السيرفر: `https://your-domain/api/health` → يجب أن يرجع `{"ok":true,...}`
- تسجيل الدخول: `https://your-domain/login`

---

## الخيار الثاني: VPS (Contabo / Hetzner / DigitalOcean)

على سيرفر Ubuntu 22/24:

```bash
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx

# قاعدة البيانات
sudo mysql -e "CREATE DATABASE wasoly CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'wasoly'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';"
sudo mysql -e "GRANT ALL ON wasoly.* TO 'wasoly'@'localhost'; FLUSH PRIVILEGES;"

# الكود
cd /var/www
git clone https://github.com/Hassanayed69/wasoly0x.git
cd wasoly0x/app

# المتغيرات
cp .env.example .env
nano .env   # APP_SECRET, DATABASE_URL=mysql://wasoly:STRONG_PASSWORD@localhost:3306/wasoly, GOOGLE_*

# التثبيت والبناء
npm ci
npm run build
npx drizzle-kit push

# تشغيل دائم
sudo npm i -g pm2
NODE_ENV=production pm2 start dist/boot.js --name wasoly
pm2 save && pm2 startup
```

### Nginx + HTTPS

`/etc/nginx/sites-available/wasoly`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/wasoly /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

ثم أضف `https://your-domain.com/api/auth/google/callback` في Google Console.

---

## متغيرات البيئة — المرجع

| المتغير | مطلوب؟ | الاستخدام |
|---|---|---|
| `APP_SECRET` | ✅ | توقيع كوكي الجلسة (JWT) |
| `DATABASE_URL` | ✅ | اتصال MySQL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | اختياري | تسجيل الدخول بـ Google |
| `NODE_ENV` | مفضّل | `production` |
| `PORT` | لا | يضبطه المنصة عادةً |
| `APP_ID`, `KIMI_AUTH_URL`, `KIMI_OPEN_URL` | ❌ غير مستخدمة | بقايا تكامل Kimi القديم — لا تضبطها |
| `OWNER_UNION_ID` | ❌ | يمنح مستخدمًا بعينه صلاحية admin عند أول دخول |

---

## ملاحظات مهمة

- **لا ترفع ملف `.env`** إلى GitHub. استخدم متغيرات المنصة.
- كل الصور والملفات الثابتة تُقدّم من نفس السيرفر، لا تحتاج CDN.
- مواقيت الصلاة والقرآن تعتمد على APIs خارجية عبر `/api/proxy`؛ لا تحتاج مفاتيح.
- إن ظهر خطأ `Missing required environment variable` في اللوج، فالمتغير ناقص في إعدادات المنصة.
- بعد أي تغيير في `db/schema.ts`: `npx drizzle-kit push` ثم Redeploy.
- لتشغيل النسخة الإنتاجية محليًا:

```bash
npm run build
npm start          # Linux/macOS
# أو على Windows:
$env:NODE_ENV="production"; node dist/boot.js
```
