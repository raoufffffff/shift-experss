// اختبار حمل لـ"صفحة الشركة": لا توجد صفحة باسم company.tsx حرفيًا في الكود —
// أقرب صفحتين فعليتين هما /:locale/establishments (EstablishmentsPage.tsx:
// إدارة المؤسسات/الفروع التابعة للشركة) و GET على جدول companies نفسه (يُستخدم
// في SettingsPage/authStore لعرض ملف الشركة). كلاهما مغطّى هنا.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { CONFIG, requireConfig } from '../lib/config.js';
import { loginAllTestAccounts, pickSession, supabaseHeaders } from '../lib/auth.js';

requireConfig('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'COMPANY_ID');

const pageDuration = new Trend('company_establishments_page_duration', true);

export const options = {
  vus: CONFIG.VUS,
  duration: CONFIG.DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'company_establishments_page_duration': ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return { sessions: loginAllTestAccounts() };
}

function headCount(url, headers, name) {
  const res = http.request('HEAD', url, null, {
    headers: Object.assign({}, headers, { Prefer: 'count=exact' }),
    tags: { name },
  });
  check(res, { [`${name}: 200`]: (r) => r.status === 200 });
  return res;
}

function monthStartISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default function (data) {
  const session = pickSession(data.sessions);
  const headers = supabaseHeaders(session.accessToken);
  const base = `${CONFIG.SUPABASE_URL}/rest/v1`;
  const flowStart = Date.now();

  // 1) ملف الشركة نفسه (يُستخدم في الإعدادات/الهيدر عبر authStore)
  const singleHeaders = Object.assign({}, headers, { Accept: 'application/vnd.pgrst.object+json' });
  const companyRes = http.get(`${base}/companies?select=*&id=eq.${CONFIG.COMPANY_ID}`, {
    headers: singleHeaders,
    tags: { name: 'Company:Profile' },
  });
  check(companyRes, { 'Company:Profile: 200': (r) => r.status === 200 });

  // 2-4) ودجة استهلاك الخطة (count فقط، مطابقة لِـ EstablishmentsPage.tsx:34-69)
  headCount(
    `${base}/establishments?select=*&company_id=eq.${CONFIG.COMPANY_ID}&status=eq.active`,
    headers,
    'Company:UsageEstablishmentsCount'
  );
  headCount(
    `${base}/shifts?select=*&company_id=eq.${CONFIG.COMPANY_ID}&created_at=gte.${monthStartISO()}`,
    headers,
    'Company:UsageShiftsCount'
  );
  headCount(`${base}/employees?select=*&company_id=eq.${CONFIG.COMPANY_ID}`, headers, 'Company:UsageEmployeesCount');

  // 5) قائمة المؤسسات الكاملة (الجدول المعروض في الصفحة)
  const listRes = http.get(
    `${base}/establishments?select=id,name,status,created_at,company_id,address,city,postal_code,latitude,longitude,logo_url&company_id=eq.${CONFIG.COMPANY_ID}&order=created_at.desc`,
    { headers, tags: { name: 'Company:EstablishmentsList' } }
  );
  check(listRes, {
    'Company:EstablishmentsList: 200': (r) => r.status === 200,
    'Company:EstablishmentsList: مصفوفة': (r) => {
      try {
        return Array.isArray(r.json());
      } catch (e) {
        return false;
      }
    },
  });

  pageDuration.add(Date.now() - flowStart);

  sleep(1);
}
