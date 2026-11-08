
export type ShiftTimeFormatOptions = {
  /** 'short' => "14:30" | 'full' => "16 juil. 2026, 14:30" */
  style?: 'short' | 'full' | 'date-only' | 'time-only';
  locale?: string; // افتراضي 'fr-FR'
};

/**
 * ترجع الوقت المحلي للمؤسسة كنص جاهز للعرض.
 *
 * @param isoString  القيمة الخام من DB, مثال: "2026-07-16T16:00:00+00:00"
 * @param timezone   IANA timezone الخاص بالـ establishment, مثال: "Europe/Paris"
 * @param opts       خيارات التنسيق
 */
export function formatShiftTime(
  isoString: string,
  timezone: string,
  opts: ShiftTimeFormatOptions = {}
): string {
  if (!timezone) {
    // fail-safe: تفادي انهيار العرض لو establishment بلا timezone بعد
    console.warn('[formatShiftTime] missing timezone, falling back to UTC');
    timezone = 'UTC';
  }

  const date = new Date(isoString);
  const locale = opts.locale ?? 'fr-FR';
  const style = opts.style ?? 'short';

  const baseOptions: Intl.DateTimeFormatOptions = { timeZone: timezone };

  switch (style) {
    case 'time-only':
      return date.toLocaleTimeString(locale, {
        ...baseOptions,
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'date-only':
      return date.toLocaleDateString(locale, {
        ...baseOptions,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    case 'full':
      return date.toLocaleString(locale, {
        ...baseOptions,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'short':
    default:
      return date.toLocaleString(locale, {
        ...baseOptions,
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
  }
}

/**
 * ترجع الساعة والدقيقة (كأرقام) لقيمة ISO، محسوبة بتوقيت establishment.timezone —
 * وليس بتوقيت جهاز المستخدم. استعملها بدل `new Date(iso).getHours()/.getMinutes()`
 * في أي حساب (quote, duration, ترتيب) وليس فقط في نص العرض.
 *
 * مثال: getShiftHourMinute("2026-07-16T16:00:00+00:00", "Europe/Paris") // صيفاً => { hour: 18, minute: 0 }
 */
export function getShiftHourMinute(
  isoString: string,
  timezone: string
): { hour: number; minute: number } {
  const tz = timezone || 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(isoString));

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

/**
 * فرق الدقائق بين ساعتي بداية/نهاية بتوقيت establishment، مع مراعاة العبور لليوم التالي.
 * يجب استعمالها بدل الحساب اليدوي المكرر في getShiftQuote/renderShiftCard.
 */
export function getShiftDurationMinutes(
  startIso: string,
  endIso: string,
  timezone: string
): number {
  const start = getShiftHourMinute(startIso, timezone);
  const end = getShiftHourMinute(endIso, timezone);
  const startTotal = start.hour * 60 + start.minute;
  const endTotal = end.hour * 60 + end.minute;
  let diff = endTotal - startTotal;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/**
 * ترجع الفرق بالدقائق بين وقتين ISO (مثلاً لحساب مدة الشيفت) —
 * محايدة تماماً عن أي timezone، لأنها تعتمد على قيم UTC الخام.
 * لا تستعمل timezone هنا إطلاقاً، الفرق بين لحظتين ثابت بغض النظر عن أي منطقة عرض.
 */
export function diffInMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.round((end - start) / 60000);
}

/**
 * Helper لجلب اسم المنطقة الزمنية الحالي المعروض للمستخدم (لأغراض debug فقط).
 */
export function getDisplayedOffsetLabel(isoString: string, timezone: string, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date(isoString))
    .find((p) => p.type === 'timeZoneName')?.value ?? '';
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * دوال الإدخال (Form <-> UTC) — لاستعمال ShiftForm.tsx حصراً
 * ═══════════════════════════════════════════════════════════════════════
 * هذا هو المصدر الحقيقي لمشكلة "00:00 تظهر 02:00" — القيمة كانت تُخزن
 * كـ UTC مباشرة بدون تحويل من توقيت establishment، مو مشكلة عرض فقط.
 */

/**
 * تحوّل القيمة المكتوبة في input[type=datetime-local] (بتوقيت establishment)
 * إلى ISO string بتوقيت UTC، جاهزة للتخزين في DB.
 *
 * مثال: localDateTimeToUTC("2026-07-16T20:00", "Europe/Paris")
 *   صيفاً (UTC+2) => "2026-07-16T18:00:00.000Z"
 *
 * ⚠️ الطريقة: نحسب الأوفست الفعلي للـ timezone في نفس اللحظة المقصودة
 * (يتعامل صح مع DST تلقائياً)، ثم نطرحه.
 */
export function localDateTimeToUTC(dateTimeLocal: string, timezone: string): string | null {
  if (!dateTimeLocal) return null;
  const tz = timezone || 'UTC';

  const [datePart, timePart] = dateTimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  // خطوة 1: نبني تاريخ "تقريبي" بافتراض إنه UTC، فقط عشان نستخرج الأوفست الفعلي لهذا اليوم/الساعة
  const approxUTC = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

  // خطوة 2: نجيب الأوفست الفعلي للـ timezone في هذي اللحظة تحديداً (يراعي DST تلقائياً)
  const offsetMinutes = getTimezoneOffsetMinutes(approxUTC, tz);

  // خطوة 3: نطرح الأوفست عشان نحول من "وقت محلي" إلى "وقت UTC فعلي"
  const realUTC = approxUTC - offsetMinutes * 60_000;

  return new Date(realUTC).toISOString();
}

/**
 * تحوّل قيمة UTC من DB إلى نص جاهز لتعبئة input[type=datetime-local]،
 * معروضة بتوقيت establishment (مو UTC خام كما كانت formatDateTimeLocal القديمة).
 *
 * مثال: utcToLocalDateTimeInput("2026-07-16T18:00:00.000Z", "Europe/Paris")
 *   صيفاً => "2026-07-16T20:00"
 */
export function utcToLocalDateTimeInput(isoString: string, timezone: string): string {
  if (!isoString) return '';
  const tz = timezone || 'UTC';
  const date = new Date(isoString);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * الأوفست الفعلي بالدقائق لـ timezone في لحظة UTC معينة (موجب شرقاً، سالب غرباً).
 * يُستعمل داخلياً في localDateTimeToUTC، ويحسب DST تلقائياً لأنه يعتمد على
 * التاريخ الفعلي المطلوب، مو أوفست ثابت.
 */
function getTimezoneOffsetMinutes(utcMillis: number, timezone: string): number {
  const date = new Date(utcMillis);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUTC = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour'), get('minute'), get('second')
  );
  return (asUTC - utcMillis) / 60_000;
}