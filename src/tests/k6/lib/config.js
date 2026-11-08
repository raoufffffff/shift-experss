// إعدادات مشتركة لكل سكريبتات k6 — تُقرأ من متغيرات البيئة (انظر tests/k6/.env.example)
function parseAccounts() {
  const raw = __ENV.TEST_ACCOUNTS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('TEST_ACCOUNTS ليس JSON صالحًا، سيتم تجاهله: ' + e.message);
    }
  }
  if (__ENV.TEST_EMAIL && __ENV.TEST_PASSWORD) {
    return [{ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD }];
  }
  return [];
}

export const CONFIG = {
  // Supabase — الطريقة الأساسية التي تُحمَّل بها كل الصفحات الخمس بياناتها
  SUPABASE_URL: (__ENV.SUPABASE_URL || '').replace(/\/+$/, ''),
  SUPABASE_ANON_KEY: __ENV.SUPABASE_ANON_KEY || '',

  // apps/api (Express) — تُستخدم فقط لعمليات محددة: shift boost/validate،
  // تأكيد/رفض تذاكر الدفع، شحن المحفظة (wallet top-up)، SEPA
  API_URL: (__ENV.API_URL || 'http://localhost:3001').replace(/\/+$/, ''),
  // مطلوب من apps/api عند عدم وجود Origin مسموح به في CORS (انظر index.ts)
  MOBILE_APP_ID: __ENV.MOBILE_APP_ID || 'shift-express-mobile-app',

  // معرّفات بيانات اختبار حقيقية يجب توفيرها من مستأجر (tenant) اختباري
  COMPANY_ID: __ENV.COMPANY_ID || '',
  ESTABLISHMENT_ID: __ENV.ESTABLISHMENT_ID || '',
  JOB_POSITION_ID: __ENV.JOB_POSITION_ID || '',
  SHIFT_ID: __ENV.SHIFT_ID || '',

  // إعدادات الحمل (يمكن تجاوزها بـ -e VUS=50 -e DURATION=2m)
  VUS: Number(__ENV.VUS || 10),
  DURATION: __ENV.DURATION || '1m',

  get TEST_ACCOUNTS() {
    const accounts = parseAccounts();
    if (accounts.length === 0) {
      throw new Error(
        'لم يتم تعيين حسابات اختبار: عرّف TEST_ACCOUNTS (JSON array) أو TEST_EMAIL/TEST_PASSWORD — انظر tests/k6/.env.example'
      );
    }
    return accounts;
  },
};

export function requireConfig(...keys) {
  const missing = keys.filter((k) => !CONFIG[k]);
  if (missing.length > 0) {
    throw new Error(`متغيرات بيئة ناقصة لهذا الاختبار: ${missing.join(', ')} — انظر tests/k6/.env.example`);
  }
}
