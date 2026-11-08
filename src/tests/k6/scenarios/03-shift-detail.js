// اختبار حمل لصفحة "تفاصيل الوردية" (/:locale/shifts/:id) — يُعيد إنتاج
// استعلامات useShiftDetail.ts (apps/web/src/pages/shifts/hooks/useShiftDetail.ts):
// الوردية نفسها + طلبات الموظفين + طلبات الفريلانسر.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { CONFIG, requireConfig } from '../lib/config.js';
import { loginAllTestAccounts, pickSession, supabaseHeaders } from '../lib/auth.js';

requireConfig('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SHIFT_ID');

const shiftDetailDuration = new Trend('shift_detail_duration', true);

export const options = {
  vus: CONFIG.VUS,
  duration: CONFIG.DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'shift_detail_duration': ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return { sessions: loginAllTestAccounts() };
}

const SHIFT_DETAIL_SELECT =
  '*,freelance_hourly_rate,' +
  'establishment:establishments(id,name,address,city,timezone),' +
  'shift_required_pms(id,pms:pms(id,name,type)),' +
  'shift_applications(id,shift_id,user_id,status,applied_at,reviewed_at,reviewed_by,no_show,no_show_reported_by,no_show_reported_at,' +
  'user:users!shift_applications_user_id_fkey(id,email,first_name,last_name))';

const FREELANCER_APPLICATIONS_SELECT =
  'id,shift_id,freelancer_id,status,applied_at,responded_at,freelance_hourly_rate,' +
  'freelancer:freelancers(id,first_name,last_name,email,phone,city,profile_photo_url)';

export default function (data) {
  const session = pickSession(data.sessions);
  const headers = supabaseHeaders(session.accessToken);
  const singleHeaders = Object.assign({}, headers, { Accept: 'application/vnd.pgrst.object+json' });
  const base = `${CONFIG.SUPABASE_URL}/rest/v1`;
  const flowStart = Date.now();

  // 1) الوردية + المؤسسة + PMS المطلوبة + طلبات الموظفين
  const shiftRes = http.get(
    `${base}/shifts?select=${encodeURIComponent(SHIFT_DETAIL_SELECT)}&id=eq.${CONFIG.SHIFT_ID}`,
    { headers: singleHeaders, tags: { name: 'ShiftDetail:Shift' } }
  );
  check(shiftRes, { 'ShiftDetail:Shift: 200': (r) => r.status === 200 });

  let userIds = [];
  try {
    const shift = shiftRes.json();
    if (Array.isArray(shift.shift_applications)) {
      userIds = shift.shift_applications.map((a) => a.user_id).filter(Boolean);
    }
  } catch (e) {
    // لا شيء — نتابع بدون بيانات الموظفين إن تعذّر التحليل
  }

  // 2) بيانات الموظفين المرتبطين بطلبات هذه الوردية (إن وُجدت)
  if (userIds.length > 0) {
    const inList = userIds.map((id) => `"${id}"`).join(',');
    const empRes = http.get(`${base}/employees?select=*&user_id=in.(${inList})`, {
      headers,
      tags: { name: 'ShiftDetail:Employees' },
    });
    check(empRes, { 'ShiftDetail:Employees: 200': (r) => r.status === 200 });
  }

  // 3) طلبات الفريلانسرز على هذه الوردية
  const freelancerRes = http.get(
    `${base}/shift_freelancer_applications?select=${encodeURIComponent(
      FREELANCER_APPLICATIONS_SELECT
    )}&shift_id=eq.${CONFIG.SHIFT_ID}&order=applied_at.desc`,
    { headers, tags: { name: 'ShiftDetail:FreelancerApplications' } }
  );
  check(freelancerRes, { 'ShiftDetail:FreelancerApplications: 200': (r) => r.status === 200 });

  shiftDetailDuration.add(Date.now() - flowStart);

  sleep(1);
}
