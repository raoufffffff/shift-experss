// اختبار حمل لصفحة "الرزنامة" / قائمة الورديات (/:locale/shifts، بما فيها عرض
// الكالندر — نفس نداء fetchShifts في apps/web/src/api/shifts.ts:73-147، وهو
// أثقل استعلام في الصفحة: join على establishment + shift_applications +
// shift_freelancer_applications + shift_required_pms.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { CONFIG, requireConfig } from '../lib/config.js';
import { loginAllTestAccounts, pickSession, supabaseHeaders } from '../lib/auth.js';

requireConfig('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'COMPANY_ID');

const shiftsListDuration = new Trend('shifts_list_duration', true);

export const options = {
  vus: CONFIG.VUS,
  duration: CONFIG.DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'shifts_list_duration': ['p(95)<1200'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return { sessions: loginAllTestAccounts() };
}

const SHIFT_SELECT =
  '*,establishment:establishments(id,name),' +
  'shift_applications(id,status,user:users!shift_applications_user_id_fkey(id,first_name,last_name,email)),' +
  'shift_freelancer_applications(id,status,freelancer_id,freelancer:freelancers!freelancer_id(id,first_name,last_name,profile_photo_url)),' +
  'shift_required_pms(id,pms:pms(id,name,type))';

function monthRange(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function (data) {
  const session = pickSession(data.sessions);
  const headers = supabaseHeaders(session.accessToken);

  // نتناوب بين عرض "الرزنامة" (نطاق شهر كامل) وعرض "القائمة" (فلترة بحالة معيّنة)
  const isCalendarView = __ITER % 2 === 0;
  const { start, end } = monthRange(0);

  const params = new URLSearchParams();
  params.set('select', SHIFT_SELECT);
  params.set('order', 'created_at.desc');
  params.set('company_id', `eq.${CONFIG.COMPANY_ID}`);
  if (CONFIG.ESTABLISHMENT_ID) {
    params.set('establishment_id', `eq.${CONFIG.ESTABLISHMENT_ID}`);
  }
  params.append('start_time', `gte.${start}`);
  params.append('start_time', `lt.${end}`);
  if (!isCalendarView) {
    params.set('status', 'eq.pending');
  }

  const url = `${CONFIG.SUPABASE_URL}/rest/v1/shifts?${params.toString()}`;
  const res = http.get(url, {
    headers,
    tags: { name: isCalendarView ? 'ShiftsCalendarView' : 'ShiftsListView' },
  });

  shiftsListDuration.add(res.timings.duration);

  check(res, {
    'قائمة الورديات: 200': (r) => r.status === 200,
    'قائمة الورديات: رد بصيغة مصفوفة': (r) => {
      try {
        return Array.isArray(r.json());
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}
