// مصادقة Supabase (GoTrue) — نفس الاستدعاء الذي يقوم به authStore.ts في التطبيق
// عبر supabase.auth.signInWithPassword(). يتم تسجيل الدخول مرة واحدة لكل حساب
// داخل setup() (وليس في كل تكرار)، ثم يُعاد توزيع التوكن على الـ VUs.
import http from 'k6/http';
import { check } from 'k6';
import { CONFIG } from './config.js';

export function loginAndGetToken(email, password) {
  requireAnonKey();
  const url = `${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const res = http.post(url, JSON.stringify({ email, password }), {
    headers: {
      'Content-Type': 'application/json',
      apikey: CONFIG.SUPABASE_ANON_KEY,
    },
    tags: { name: 'AuthLogin' },
  });

  const ok = check(res, {
    'تسجيل الدخول نجح (200)': (r) => r.status === 200,
    'تم استلام access_token': (r) => {
      try {
        return !!r.json('access_token');
      } catch (e) {
        return false;
      }
    },
  });

  if (!ok) {
    throw new Error(`فشل تسجيل الدخول لـ ${email}: HTTP ${res.status} — ${res.body}`);
  }

  const body = res.json();
  return {
    email,
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    userId: body.user && body.user.id,
  };
}

// يُستدعى مرة واحدة داخل setup() لكل سكريبت
export function loginAllTestAccounts() {
  return CONFIG.TEST_ACCOUNTS.map((acc) => loginAndGetToken(acc.email, acc.password));
}

// كل VU يختار جلسته بالتناوب (round-robin) من الجلسات التي أنشأها setup()
export function pickSession(sessions) {
  if (!sessions || sessions.length === 0) {
    throw new Error('لا توجد جلسات مصادقة متاحة (تحقق من setup())');
  }
  const idx = (__VU - 1) % sessions.length;
  return sessions[idx];
}

export function supabaseHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    apikey: CONFIG.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };
}

// apps/api يرفض أي طلب بدون Origin مسموح به ما لم يحمل X-App-Id (انظر
// apps/api/src/index.ts — CORS allow-list)
export function apiHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-App-Id': CONFIG.MOBILE_APP_ID,
  };
}

function requireAnonKey() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL و SUPABASE_ANON_KEY مطلوبان — انظر tests/k6/.env.example');
  }
}
