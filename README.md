# نظام تحديث بيانات العملاء — IDTC

- `index.html` ← نموذج العميل (الرابط العام)
- `index.html#admin` ← لوحة إدارة المبيعات (تحتاج رمز دخول)
- `config.js` ← رابط التخزين السحابي
- `apps-script/Code.gs` ← الخلفية على Google Drive

## 1) النشر على GitHub Pages
1. أنشئ مستودعاً جديداً وارفع محتويات هذا المجلد (باستثناء `apps-script` إن رغبت).
2. Settings ← Pages ← Branch: `main` / root ← Save.
3. الرابط: `https://USERNAME.github.io/REPO/`

## 2) الربط مع Google Drive
1. افتح script.google.com ← مشروع جديد ← الصق `Code.gs`.
2. شغّل الدالة `setup()` مرة واحدة ووافق على الصلاحيات (تنشئ مجلداً وملف Excel/Sheets في Drive).
3. Project Settings ← Script properties ← غيّر `ADMIN_CODE` إلى رمز طويل وسري.
4. Deploy ← New deployment ← Web app ← Execute as: **Me** ← Who has access: **Anyone**.
5. انسخ رابط `/exec` إلى `config.js` ثم ارفع التعديل.

يُنشأ لكل عميل: مجلد باسمه فيه المرفقات وملف `.xlsx`، إضافة إلى سجل مجمّع (Customers / Contacts / Branches) يمكن تنزيله بصيغة Excel.

## 3) الربط مع OneDrive (Power Automate)
1. Flow جديد: **When an HTTP request is received** (Anyone).
2. **Create file** (OneDrive): المحتوى `base64ToBinary(triggerBody()?['xlsx'])`، والاسم `@{triggerBody()?['d']?['vat']}.xlsx`.
3. **Response**: الحالة 200، الترويسة `Access-Control-Allow-Origin: *`، والمحتوى `{"ok":true,"id":"@{triggerBody()?['d']?['vat']}"}`.
4. ضع رابط الـ HTTP في `config.js`.

> لوحة الإدارة تعمل مع Google Drive فقط. مع OneDrive يتم حفظ الطلبات كملفات Excel دون لوحة مراجعة.

## ملاحظات أمان
- رمز الإدارة حماية بسيطة؛ استخدم رمزاً طويلاً ولا تشاركه.
- حجم المرفق الواحد حتى 4MB (PDF أو صورة).
