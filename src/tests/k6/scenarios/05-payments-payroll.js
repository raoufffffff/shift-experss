// اختبار حمل لصفحة "المدفوعات" (/:locale/payroll → PayrollView.tsx، تبويب
// "payroll"): استعلامان ثقيلان بـ join متداخل — رواتب/مستحقات الموظفين
// (shift_applications) ومستحقات الفريلانسرز (shift_freelancer_applications)،
// بالإضافة لقائمة المؤسسات المستخدمة كفلتر في الصفحة.
//
// ملاحظة: عمليات الكتابة الفعلية في هذه الصفحة (شحن المحفظة عبر Stripe
// Checkout، تأكيد/رفض تذكرة دفع، SEPA) تمر عبر apps/api (routes/stripe/*)
// وتُنشئ جلسات Stripe حقيقية — لم تُدرَج هنا عمدًا لتفادي إنشاء عمليات دفع
// وهمية متكررة. إن أردتم تغطيتها لاحقًا يجب أن تكون بحساب/مفتاح Stripe في
// وضع test فقط، وبعدد VUs منخفض جدًا.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { CONFIG, requireConfig } from '../lib/config.js';
import { loginAllTestAccounts, pickSession, supabaseHeaders } from '../lib/auth.js';

requireConfig('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'COMPANY_ID');

const payrollDuration = new Trend('payroll_page_duration', true);

export const options = {
  vus: CONFIG.VUS,
  duration: CONFIG.DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'payroll_page_duration': ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return { sessions: loginAllTestAccounts() };
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

const EMPLOYEE_SHIFTS_SELECT =
  'shift_id,user_id,status,' +
  'shift:shifts!inner(id,start_time,end_time,break_duration_minutes,position_name,status,company_id,establishment_id,' +
  'establishment:establishments(id,name)),' +
  'user:users!shift_applications_user_id_fkey(id,email,first_name,last_name)';

const FREELANCER_SHIFTS_SELECT =
  'id,freelancer_id,status,base_amount,transport_fee,total_charged_to_client,payment_status,' +
  'shift:shifts!inner(id,start_time,end_time,actual_start_time,actual_end_time,actual_break_duration_minutes,break_duration_minutes,' +
  'freelance_hourly_rate,position_name,status,company_id,establishment_id,establishment:establishments(id,name)),' +
  'freelancer:freelancers!inner(id,first_name,last_name,email)';

export default function (data) {
  const session = pickSession(data.sessions);
  const headers = supabaseHeaders(session.accessToken);
  const base = `${CONFIG.SUPABASE_URL}/rest/v1`;
  const { start, end } = currentMonthRange();
  const flowStart = Date.now();

  // 1) فلتر المؤسسات
  const establishmentsRes = http.get(
    `${base}/establishments?select=id,name&company_id=eq.${CONFIG.COMPANY_ID}&status=eq.active&order=name.asc`,
    { headers, tags: { name: 'Payroll:Establishments' } }
  );
  check(establishmentsRes, { 'Payroll:Establishments: 200': (r) => r.status === 200 });

  // 2) مستحقات الموظفين (accepted فقط) خلال الشهر الحالي
  const employeeParams = new URLSearchParams();
  employeeParams.set('select', EMPLOYEE_SHIFTS_SELECT);
  employeeParams.set('status', 'eq.accepted');
  employeeParams.set('shift.company_id', `eq.${CONFIG.COMPANY_ID}`);
  employeeParams.append('shift.start_time', `gte.${start}`);
  employeeParams.append('shift.start_time', `lte.${end}`);
  if (CONFIG.ESTABLISHMENT_ID) {
    employeeParams.set('shift.establishment_id', `eq.${CONFIG.ESTABLISHMENT_ID}`);
  }
  const employeeRes = http.get(`${base}/shift_applications?${employeeParams.toString()}`, {
    headers,
    tags: { name: 'Payroll:EmployeeShifts' },
  });
  check(employeeRes, { 'Payroll:EmployeeShifts: 200': (r) => r.status === 200 });

  // 3) مستحقات الفريلانسرز (accepted فقط) خلال الشهر الحالي
  const freelancerParams = new URLSearchParams();
  freelancerParams.set('select', FREELANCER_SHIFTS_SELECT);
  freelancerParams.set('status', 'eq.accepted');
  freelancerParams.set('shift.company_id', `eq.${CONFIG.COMPANY_ID}`);
  freelancerParams.append('shift.start_time', `gte.${start}`);
  freelancerParams.append('shift.start_time', `lte.${end}`);
  if (CONFIG.ESTABLISHMENT_ID) {
    freelancerParams.set('shift.establishment_id', `eq.${CONFIG.ESTABLISHMENT_ID}`);
  }
  const freelancerRes = http.get(`${base}/shift_freelancer_applications?${freelancerParams.toString()}`, {
    headers,
    tags: { name: 'Payroll:FreelancerShifts' },
  });
  check(freelancerRes, { 'Payroll:FreelancerShifts: 200': (r) => r.status === 200 });

  payrollDuration.add(Date.now() - flowStart);

  sleep(1);
}
