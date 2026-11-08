// اختبار حمل لتدفّق "إنشاء وردية" (/:locale/shifts/new) — يُعيد إنتاج نفس
// سلسلة الاستعلامات التي يقوم بها useCreateShift.ts عند فتح الصفحة (تحقق
// SIRET، قائمة المؤسسات، الفئات، المسمّيات الوظيفية، حصّة الفترة الفوترية،
// الموظفون) ثم إدراج الوردية فعليًا (POST /rest/v1/shifts).
//
// تحذير: هذا الاختبار يكتب بيانات حقيقية (صفوف shifts جديدة). استخدمه فقط
// على مشروع Supabase اختباري/staging منفصل عن الإنتاج. راجع README.md لطريقة
// تنظيف البيانات بعد التشغيل.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { CONFIG, requireConfig } from '../lib/config.js';
import { loginAllTestAccounts, pickSession, supabaseHeaders } from '../lib/auth.js';

requireConfig('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'COMPANY_ID', 'ESTABLISHMENT_ID');

const createShiftDuration = new Trend('create_shift_full_flow_duration', true);
const shiftsCreated = new Counter('shifts_created_total');

export const options = {
  vus: CONFIG.VUS,
  duration: CONFIG.DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    // نفس سقف الـ5 ثوانٍ المستخدم في اختبار Playwright الحالي
    // (tests/e2e/shift-workflow.spec.ts: "should create shift in under 5 seconds")
    'create_shift_full_flow_duration': ['p(95)<5000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return { sessions: loginAllTestAccounts() };
}

function billingPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

function get(url, headers, name) {
  const res = http.get(url, { headers, tags: { name } });
  check(res, { [`${name}: 200`]: (r) => r.status === 200 }, { name });
  return res;
}

export default function (data) {
  const session = pickSession(data.sessions);
  const headers = supabaseHeaders(session.accessToken);
  const base = `${CONFIG.SUPABASE_URL}/rest/v1`;
  const flowStart = Date.now();

  // 1) حالة وثيقة SIRET
  get(
    `${base}/company_documents?select=*&company_id=eq.${CONFIG.COMPANY_ID}&type=eq.siret`,
    headers,
    'CreateShift:SiretStatus'
  );

  // 2) قائمة المؤسسات النشطة
  get(
    `${base}/establishments?select=id,name,address,city,postal_code,timezone&company_id=eq.${CONFIG.COMPANY_ID}&status=eq.active&order=name.asc`,
    headers,
    'CreateShift:Establishments'
  );

  // 3) فئات المؤسسة
  get(
    `${base}/establishment_categories?select=*&active=eq.true&order=display_order.asc`,
    headers,
    'CreateShift:Categories'
  );

  // 4) المسمّيات الوظيفية
  const jobPositionsRes = get(
    `${base}/job_positions?select=*&active=eq.true&order=display_order.asc`,
    headers,
    'CreateShift:JobPositions'
  );

  let jobPositionId = CONFIG.JOB_POSITION_ID;
  if (!jobPositionId) {
    try {
      const positions = jobPositionsRes.json();
      if (Array.isArray(positions) && positions.length > 0) jobPositionId = positions[0].id;
    } catch (e) {
      // نتابع بدون job_position_id إن تعذّر التحليل
    }
  }

  // 5) نطاق الأجر لهذه المؤسسة/الوظيفة
  if (jobPositionId) {
    get(
      `${base}/establishment_job_rates?select=min_rate,max_rate&establishment_id=eq.${CONFIG.ESTABLISHMENT_ID}&job_position_id=eq.${jobPositionId}`,
      headers,
      'CreateShift:JobRate'
    );
  }

  // 6) حصّة الفترة الفوترية الحالية (count فقط — HEAD request كما يفعل supabase-js)
  const { start: periodStart, end: periodEnd } = billingPeriod();
  const quotaUrl = `${base}/shifts?select=*&company_id=eq.${CONFIG.COMPANY_ID}&targets_employees=eq.true&created_at=gte.${periodStart}&created_at=lte.${periodEnd}`;
  const quotaRes = http.request('HEAD', quotaUrl, null, {
    headers: Object.assign({}, headers, { Prefer: 'count=exact' }),
    tags: { name: 'CreateShift:BillingPeriodQuota' },
  });
  check(quotaRes, { 'CreateShift:BillingPeriodQuota: 200': (r) => r.status === 200 });

  // 7) الموظفون المتاحون لهذه المؤسسة
  get(
    `${base}/employees?select=*,user:users(email,first_name,last_name)&company_id=eq.${CONFIG.COMPANY_ID}&active=eq.true&or=(establishment_id.eq.${CONFIG.ESTABLISHMENT_ID},establishment_id.is.null)`,
    headers,
    'CreateShift:Employees'
  );

  // 8) إدراج الوردية فعليًا — نفس شكل shiftData في useCreateShift.ts:363-374
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // غدًا
  start.setHours(8, 0, 0, 0);
  const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);

  const shiftPayload = {
    company_id: CONFIG.COMPANY_ID,
    establishment_id: CONFIG.ESTABLISHMENT_ID,
    position_name: 'k6-load-test',
    job_position_id: jobPositionId || null,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    break_duration_minutes: 30,
    address: null,
    description: 'Créé par un test de charge k6 — à ignorer/supprimer',
    private_note: null,
    private_attachment_url: null,
    status: 'pending',
    targets_employees: false,
    published_to_freelancers: false,
    published_to_freelancers_at: null,
    auto_publish_to_freelancers: false,
    auto_publish_delay_minutes: null,
    auto_accept_favorite_freelancers: false,
    platform_fee_rate: 15,
    freelance_hourly_rate: null,
    required_languages: null,
  };

  const insertRes = http.post(`${base}/shifts`, JSON.stringify(shiftPayload), {
    headers: Object.assign({}, headers, { Prefer: 'return=representation' }),
    tags: { name: 'CreateShift:InsertShift' },
  });

  const inserted = check(insertRes, {
    'CreateShift:InsertShift: 201': (r) => r.status === 201,
  });
  if (inserted) shiftsCreated.add(1);

  createShiftDuration.add(Date.now() - flowStart);

  sleep(1);
}
