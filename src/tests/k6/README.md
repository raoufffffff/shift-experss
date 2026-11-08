# اختبارات الحمل (k6) — أهم صفحات shift-express

اختبارات [k6](https://k6.io) لأهم صفحات تطبيق الويب (`apps/web`)، مبنية على
الاستعلامات الفعلية الموجودة في الكود (وليست تخمينًا). كل سكريبت مستقل ويمكن
تشغيله بمفرده.

## نقطة مهمة عن البنية

`apps/web` تطبيق React (Vite) وليس Next.js. أغلب بيانات هذه الصفحات تُجلب
**مباشرة من المتصفح إلى Supabase** (PostgREST) وليس عبر `apps/api`. لذلك هذه
الاختبارات تستهدف Supabase مباشرة (تمامًا كما يفعل التطبيق)، باستثناء بعض
عمليات الدفع (شحن المحفظة، تأكيد/رفض تذكرة دفع) التي تمر فعلًا عبر
`apps/api` ولم تُدرَج هنا (راجع التحذير داخل `05-payments-payroll.js`).

| الملف | الصفحة الفعلية | المسار في التطبيق |
|---|---|---|
| `01-shifts-list-calendar.js` | قائمة الورديات / الرزنامة | `/:locale/shifts` |
| `02-create-shift.js` | إنشاء وردية | `/:locale/shifts/new` |
| `03-shift-detail.js` | تفاصيل الوردية | `/:locale/shifts/:id` |
| `04-company-establishments.js` | صفحة الشركة/المؤسسات | `/:locale/establishments` |
| `05-payments-payroll.js` | المدفوعات (الرواتب/المستحقات) | `/:locale/payroll` |

## المتطلبات

1. تثبيت k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
2. **مشروع Supabase اختباري/staging** (وليس الإنتاج) — `02-create-shift.js`
   يكتب صفوفًا حقيقية في جدول `shifts`.
3. حساب مستخدم اختباري بدور `admin` أو `manager` ومرتبط بشركة (company) لديها
   مؤسسة (establishment) واحدة على الأقل نشطة.

## الإعداد

```bash
cp tests/k6/.env.example tests/k6/.env
```

عدّلوا `tests/k6/.env` بالقيم الحقيقية (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
بيانات حساب الاختبار، ثم `COMPANY_ID` و`ESTABLISHMENT_ID` و`SHIFT_ID`). يمكن
الحصول على هذه المعرّفات بتسجيل الدخول يدويًا إلى التطبيق مرة واحدة والنظر في
أدوات المطوّر (Network tab)، أو مباشرة من جداول `companies`/`establishments`/
`shifts` في Supabase.

## التشغيل

### على ويندوز (PowerShell) — الطريقة الموصى بها

`--env-file` غير مدعوم إلا في k6 v0.49+. بدلاً منه استخدموا `run.ps1` المرفق،
الذي يقرأ `tests/k6/.env` ويمرّره كـ `-e KEY=value` (يعمل مع أي إصدار k6):

```bash
.\tests\k6\run.ps1 tests\k6\scenarios\01-shifts-list-calendar.js
```

التحكم بمستوى الحمل:

```bash
.\tests\k6\run.ps1 tests\k6\scenarios\02-create-shift.js -VUS 50 -Duration 3m
```

### إن كان لديكم k6 v0.49 فما فوق (macOS/Linux أو ويندوز محدَّث)

```bash
k6 version   # تحققوا من الإصدار أولاً
k6 run --env-file=tests/k6/.env tests/k6/scenarios/01-shifts-list-calendar.js
```

### تمرير المتغيرات يدويًا (أي إصدار، أي نظام)

```bash
k6 run -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... -e TEST_EMAIL=... -e TEST_PASSWORD=... -e COMPANY_ID=... -e ESTABLISHMENT_ID=... tests/k6/scenarios/01-shifts-list-calendar.js
```

### تشغيل كل الاختبارات القرائية (بدون الكتابة) تباعًا

PowerShell:
```powershell
'01-shifts-list-calendar','03-shift-detail','04-company-establishments','05-payments-payroll' | ForEach-Object {
  .\tests\k6\run.ps1 "tests\k6\scenarios\$_.js"
}
```

bash/macOS/Linux (مع k6 v0.49+):
```bash
for f in tests/k6/scenarios/0{1,3,4,5}-*.js; do
  k6 run --env-file=tests/k6/.env "$f" || break
done
```

## تنظيف بيانات `02-create-shift.js`

هذا السكريبت الوحيد الذي يكتب بيانات (ورديات بعنوان الوظيفة `k6-load-test`).
بعد التشغيل على مشروع staging، نظّفوها بأحد الطريقتين:

- عبر SQL Editor في Supabase:
  ```sql
  delete from shifts
  where company_id = '<COMPANY_ID>'
    and position_name = 'k6-load-test';
  ```
- أو عبر التطبيق نفسه (حذف الورديات يدويًا من صفحة القائمة).

## القيم الافتراضية للحدود (thresholds)

كل سكريبت يضبط حدًا لزمن الاستجابة عند النسبة المئوية 95 (`p(95)`) ونسبة فشل
أقل من 1%، بحسب ثِقَل الاستعلام (من 800 مللي ثانية للصفحات البسيطة إلى 5 ثوانٍ
لتدفّق إنشاء الوردية الكامل — نفس السقف المستخدم في اختبار Playwright الحالي
`tests/e2e/shift-workflow.spec.ts`). عدّلوها حسب أهداف الأداء الخاصة بكم.

## ملاحظات

- `apps/api` يفرض حد معدّل عام 100 طلب/15 دقيقة لكل IP على مسارات `/api/*`
  (`apps/api/src/config/rateLimits.ts`) — إن أضفتم اختبارات تستهدفه مباشرة
  بعدد VUs كبير من نفس الجهاز فستحصلون على `429` بسرعة؛ هذا متوقع وليس خطأ في
  السكريبت.
- لا يوجد ملف ترجمة عربي (`ar.json`) في التطبيق حاليًا (الموجود: fr/en/es/it/zh)،
  لذلك أسماء المسارات والحقول في الكود بالفرنسية/الإنجليزية — استُخدمت أسماء
  الصفحات العربية هنا للتوضيح فقط.
