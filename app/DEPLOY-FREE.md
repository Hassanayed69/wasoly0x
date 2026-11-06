# نشر «وصولي» مجانًا (Render + TiDB Cloud)

الخطة دي بتشغّل الموقع كامل مجانًا:

| الجزء | الخدمة | الحدود |
|---|---|---|
| السيرفر | **Render Free Web Service** | 512MB، بينام بعد ١٥ دقيقة خمول، 750 ساعة/شهر، بدون كارت |
| قاعدة البيانات | **TiDB Cloud Starter** (متوافقة مع MySQL) | 5GB + 50 مليون Request Unit شهريًا، بدون كارت |
| الدومين | `*.onrender.com` | مجاني |

النتيجة: الموقع يفتح على رابط زي `https://wasoly.onrender.com` بدون أي دفع.

> العيب الوحيد: أول زائر بعد ١٥ دقيقة خمول يستنى حوالي دقيقة لحد ما السيرفر يصحى. باقي الزوار بعد كده سريعين.

---

## الخطوة ١ — قاعدة بيانات MySQL مجانية (TiDB Cloud)

1. ادخل <https://tidbcloud.com> واعمل حساب (GitHub أو Google، بدون كارت).
2. **Create Cluster → Starter**.
3. اختار **MySQL Compatible**، ومنطقة قريبة من Render: **AWS / Oregon (us-west-2)**.
4. بعد الإنشاء، اضغط **Connect** وانسخ Connection String. شكله هيكون قريب من:

```
mysql://3pTAoNNegb47Uc8.root:YOUR_PASSWORD@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}
```

مهم:
- اسم المستخدم لازم يكون فيه البادئة: `xxxxx.root` — مش `root` لوحدها.
- سيب `?ssl={"rejectUnauthorized":true}` في آخر الرابط كما هو.
- لو الباسورد فيه رموز خاصة (`@`, `#`, `%`)، اعمللها URL encoding.

### إنشاء الجداول

من جهازك:

```bash
cd app
# حط الرابط في .env
DATABASE_URL='mysql://....root:....@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}'
npx drizzle-kit push
```

لو ظهرت رسالة نجاح، الجداول اتعملت. للتأكد تقدر تفتح **SQL Editor** في TiDB وتشغّل:

```sql
SHOW TABLES;
```

---

## الخطوة ٢ — النشر على Render

1. ادخل <https://render.com> وسجّل بحساب GitHub (بدون كارت).
2. **New → Blueprint**.
3. اختار ريبو `Hassanayed69/wasoly0x`.
4. Render هيلاقي ملف `render.yaml` في جذر الريبو ويجهّز الخدمة تلقائيًا. اضغط **Apply**.
5. بعد ما تبدأ الخدمة، افتح **Environment** وضيف:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط TiDB من الخطوة ١ |
| `GOOGLE_CLIENT_ID` | اختياري — من Google Cloud |
| `GOOGLE_CLIENT_SECRET` | اختياري — من Google Cloud |

`APP_SECRET` و`NODE_ENV` Render بيضبطهم تلقائيًا من `render.yaml`.

6. استنى أول Build (حوالي ٣–٦ دقائق). لما يخلص، الرابط هيبقى:
   `https://wasoly.onrender.com`

> لو اسم `wasoly` محجوز على Render، غيّر `name` في `render.yaml` لأي اسم تاني واعمل Push.

### التأكد

- `https://wasoly.onrender.com/api/health` → `{"ok":true,...}`
- `https://wasoly.onrender.com/` → الصفحة الرئيسية
- `/login` → تسجيل الدخول

---

## الخطوة ٣ — Google Sign-In (اختياري)

الموقع شغال بوضع «متابعة كضيف» من غير Google. لو عايز الحساب والمزامنة:

1. <https://console.cloud.google.com> → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**:
   `https://wasoly.onrender.com`
4. **Authorized redirect URIs**:
   `https://wasoly.onrender.com/api/auth/google/callback`
5. حط الـ Client ID و Secret في Render → Environment، واعمل **Manual Deploy → Deploy latest commit**.

---

## اختياري — منع النوم (Keep-awake)

Render بيدي 750 ساعة شهريًا، والشهر حوالي 730 ساعة. تقدر تخلي الموقع صاحي طول الشهر:

1. اعمل حساب مجاني على <https://uptimerobot.com>.
2. **Add New Monitor → HTTP(s)**.
3. الرابط: `https://wasoly.onrender.com/api/health`
4. كل **5 دقائق**.

كده السيرفر مش هينام، ومش هتستهلك أكتر من 750 ساعة. لو Render عمل restart مفاجئ، الـ Monitor هيرجّعه.

---

## بديل: Oracle Cloud Always Free (بدون نوم)

لو مش عايز قصة النوم خالص وعايز سيرفر شغال 24/7 مجانًا:

- **Oracle Cloud Always Free**: VM ARM بـ 4 أنوية و24GB رام مجانًا للأبد (محتاج كارت للتحقق فقط، مش هيتخصم منه).
- تركّب Node + MySQL + Nginx + HTTPS بنفس خطوات `DEPLOY.md` (قسم VPS).
- المميزات: سرعة ثابتة، مفيش Cold Start، مساحة كبيرة.
- العيوب: التسجيل والتحقق بياخد وقت، وإعداد السيرفر يدوي.

---

## ملاحظات مهمة

- **ماترفعش `.env`** على GitHub.
- Render Free بيستخدم ملفات مؤقتة، لكن التطبيق مش بيكتب أي ملفات — كل البيانات في TiDB.
- بعد أي تعديل في `db/schema.ts`: شغّل `npx drizzle-kit push` محليًا، وبعدها اعمل Push.
- لو البناء فشل بسبب الذاكرة (512MB)، جرّب تشغّل البناء محليًا وترفع `dist` — أو استخدم Oracle Cloud.
- Render بيقول في التوثيق إن الخطة المجانية للهابي والتجربة، مش لتطبيق إنتاجي كبير. لو الموقع كبر، الترقية لأقل خطة ($7/شهر) بتشيل النوم.
