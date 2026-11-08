import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, eachDayOfInterval, isSameDay, isSameMonth,
  addWeeks, subWeeks, startOfWeek, endOfWeek, isBefore,
  isPast, isToday as dateFnsIsToday, startOfDay,
  getISOWeek, differenceInCalendarDays, Locale,
} from 'date-fns';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';
import {
  ChevronUp, MapPin, Plus, Calendar, CalendarRange, X, Users, Link2,
  Check, Clock, Loader2, Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LocalizedLink as Link } from '@/components/LocalizedLink';
import { useLocale } from '@/hooks/useLocale';
import type { ShiftStatus, Shift } from '@/api/shifts';
import { DEFAULT_PLATFORM_FEE_RATE } from '@shift-express/shared';
import { formatShiftTime, getShiftDurationMinutes } from '@/lib/Shifttime';
import { ShiftTypeBadge } from '@/components/shifts/ShiftTypeBadge';
// ✅ جديد — الأعياد الرسمية الفرنسية (⚠️ عدّل المسار حسب مكان holidays.ts)
import { getHoliday } from '@/pages/shifts/holidays';
import { HolidayIcon } from '@/pages/shifts/holidayIcons';

interface ShiftsCalendarViewProps {
  shifts: Shift[];
  canCreate: boolean
  getDisplayStatus: (shift: Shift) => ShiftStatus;
  statusVariants: Record<ShiftStatus, 'default' | 'secondary' | 'success' | 'danger' | 'warning'>;
}

interface PopoverState {
  day: Date;
  x: number;
  y: number;
}

// ✅ timezone افتراضي إن كانت المؤسسة بدون قيمة بعد (مرحلة انتقالية بعد الـ migration)
const DEFAULT_TZ = 'Europe/Paris';

// ✅ حدود العرض في العمود الأسبوعي
const MAX_VISIBLE_SHIFTS = 6; // أقصى عدد بطاقات في اليوم قبل "+N de plus"
const MAX_VISIBLE_PEOPLE = 3; // أقصى عدد أشخاص داخل البطاقة قبل "+N"

// ✅ جديد — حدود infinite scroll: 3 أشهر تقريباً (~13 أسبوعاً) للأمام وللخلف
const WEEKS_CAP = 13;

function getEstablishmentTz(shift: Pick<Shift, 'establishment'>): string {
  return (shift.establishment as any)?.timezone || DEFAULT_TZ;
}

// ─── 3 couleurs (demande Amine) ──────────────────────────────────────────────
// 🟢 confirmé · 🔴 annulé · 🟠 pas encore assigné
type StatusBucket = 'confirmed' | 'canceled' | 'unassigned';

const STATUS_BUCKET: Record<ShiftStatus, StatusBucket> = {
  filled: 'confirmed',
  completed: 'confirmed',
  canceled: 'canceled',
  closed: 'canceled',
  expired: 'canceled',
  pending: 'unassigned',
  partially_filled: 'unassigned',
  pending_validation: 'unassigned',
};

const BUCKET_STYLE: Record<StatusBucket, {
  pillBg: string; pillText: string; dot: string; legendDot: string;
  cardBorder: string; timeText: string;
}> = {
  confirmed: {
    pillBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    pillText: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    legendDot: 'bg-emerald-500',
    cardBorder: 'border-emerald-200/70 dark:border-emerald-900/60',
    timeText: 'text-emerald-700 dark:text-emerald-300',
  },
  canceled: {
    pillBg: 'bg-red-50 dark:bg-red-950/40',
    pillText: 'text-red-700 dark:text-red-300 line-through decoration-red-400/60',
    dot: 'bg-red-500',
    legendDot: 'bg-red-500',
    cardBorder: 'border-red-200/70 dark:border-red-900/60',
    timeText: 'text-red-700 dark:text-red-300',
  },
  unassigned: {
    pillBg: 'bg-orange-50 dark:bg-orange-950/40',
    pillText: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    legendDot: 'bg-orange-500',
    cardBorder: 'border-orange-200/70 dark:border-orange-900/60',
    timeText: 'text-orange-700 dark:text-orange-300',
  },
};

// ─── Personnes liées à un shift (candidats + affectés) ───────────────────────

interface ShiftPerson {
  key: string;
  name: string;
  avatar: string | null;
  kind: 'freelancer' | 'employee';
  state: 'accepted' | 'pending';
}

// ⚠️ عدّل أسماء الحقول هنا حسب ما يرجعه الـ API فعلياً لصورة المستخدم/الفريلانس
function resolveAvatar(p: any): string | null {
  if (!p) return null;
  return (
    p.avatar_url || p.profile_picture_url || p.profile_picture ||
    p.photo_url || p.image_url || p.avatar || null
  );
}

// ✅ كل من قدّم (applied/pending) أو قُبل (accepted) — المقبولون أولاً
function getShiftPeople(shift: Shift): ShiftPerson[] {
  const build = (apps: any[], listKind: ShiftPerson['kind']): ShiftPerson[] =>
    apps
      .map((a, i): ShiftPerson | null => {
        const state: ShiftPerson['state'] | null =
          a.status === 'accepted' ? 'accepted'
            : (a.status === 'applied' || a.status === 'pending') ? 'pending'
              : null;
        if (!state) return null;

        const fa = a.freelancer;
        const ua = a.user;
        const person = fa || ua;
        const kind: ShiftPerson['kind'] = fa ? 'freelancer' : ua ? 'employee' : listKind;
        const fullName = person
          ? `${person.first_name || ''} ${person.last_name || ''}`.trim()
          : '';
        const name = fullName || ua?.email || (kind === 'freelancer' ? 'Freelance' : 'Employé');

        return {
          key: `${listKind}-${a.id ?? i}`,
          name,
          avatar: resolveAvatar(person),
          kind,
          state,
        };
      })
      .filter(Boolean) as ShiftPerson[];

  const people = [
    ...build((shift.shift_applications || []) as any[], 'employee'),
    ...build((shift.shift_freelancer_applications || []) as any[], 'freelancer'),
  ];

  return people.sort((a, b) => (a.state === b.state ? 0 : a.state === 'accepted' ? -1 : 1));
}

// ✅ ملخص الطلبات لمناوبة واحدة: الإجمالي، المعلّق، وأسماء المُعيَّنين (لبطاقة المعاينة)
function getApplicantsSummary(shift: Shift) {
  const employeeApps = shift.shift_applications || [];
  const freelancerApps = shift.shift_freelancer_applications || [];
  const total = employeeApps.length + freelancerApps.length;

  const people = getShiftPeople(shift);
  const pending = people.filter((p) => p.state === 'pending').length;
  const acceptedNames = people.filter((p) => p.state === 'accepted').map((p) => p.name);

  return { total, pending, acceptedNames };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Avatar (photo → initiales si absente ou cassée) ─────────────────────────

function PersonAvatar({ person }: { person: ShiftPerson }) {
  const [failed, setFailed] = useState(false);
  const ring = person.state === 'accepted'
    ? 'ring-emerald-500'
    : 'ring-orange-400';

  if (person.avatar && !failed) {
    return (
      <img
        src={person.avatar}
        alt={person.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`shrink-0 w-5 h-5 rounded-full object-cover ring-[1.5px] ${ring} bg-muted`}
      />
    );
  }

  return (
    <span
      className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                  text-[8px] font-bold leading-none ring-[1.5px] ${ring}
                  bg-white text-foreground/70 dark:bg-muted dark:text-foreground/80`}
    >
      {getInitials(person.name)}
    </span>
  );
}

const POPOVER_W = 224;
let _portalEl: HTMLDivElement | null = null;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

// ✅ تحسب المدة بتوقيت establishment.timezone
function getShiftQuote(shift: Shift) {
  const rate = shift.freelance_hourly_rate || shift.hourly_rate || 0;
  if (rate === 0) return null;

  const timezone = getEstablishmentTz(shift);
  const diffMinutes = getShiftDurationMinutes(shift.start_time, shift.end_time, timezone);

  const breakMinutes = (shift as any).break_duration_minutes || 0;
  const netHours = (diffMinutes - breakMinutes) / 60;

  if (netHours <= 0) return null;

  const staffCount = Math.max(shift.required_employees || 1, 1);
  const feeRate = (shift as any).platform_fee_rate ?? DEFAULT_PLATFORM_FEE_RATE;

  const baseCost = Math.round(rate * netHours * staffCount * 100) / 100;
  const commission = Math.round(baseCost * (feeRate / 100) * 100) / 100;
  const totalTTC = Math.round((baseCost + commission) * 100) / 100;

  return { rate, baseCost, commission, totalTTC, feeRate, netHours, staffCount };
}

// ─── Portal popover (un jour / plusieurs jours) ──────────────────────────────

function DayPopover({
  state, locale, dateFormat, t, onSingleDay, onMultiDay, onClose,
}: {
  state: PopoverState;
  locale: Locale;
  dateFormat: string;
  t: (k: string, o?: object) => string;
  onSingleDay: () => void;
  onMultiDay: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: state.y + 8, left: state.x - POPOVER_W / 2 });
  // ✅ جديد — تنبيه داخل الـ popover إن كان اليوم المختار عيداً
  const holiday = getHoliday(state.day);

  useEffect(() => {
    _portalEl = ref.current;
    return () => { _portalEl = null; };
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h = ref.current.getBoundingClientRect().height;
    let left = state.x - POPOVER_W / 2;
    let top = state.y + 8;
    if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8;
    if (left < 8) left = 8;
    if (top + h > vh - 8) top = state.y - h - 8;
    if (top < 8) top = 8;
    setPos({ top, left });
  }, [state.x, state.y]);

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      style={{
        position: 'fixed', top: pos.top, left: pos.left,
        width: POPOVER_W, zIndex: 9999,
        boxShadow: '0 12px 32px rgba(0,0,0,0.14), 0 3px 8px rgba(0,0,0,0.08)',
      }}
      className="bg-white dark:bg-card rounded-2xl border border-border/40 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {format(state.day, dateFormat, { locale })}
        </span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="h-px bg-border/40 mx-4" />

      {holiday && (
        <div className="mx-2 mt-2 flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/60 px-2.5 py-2">
          <span className="shrink-0 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
            <HolidayIcon icon={holiday.icon} className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-tight">
              {holiday.name}
            </p>
            <p className="text-[10.5px] text-rose-600/90 dark:text-rose-400 leading-snug mt-0.5">
              {t('shifts.holiday.popoverHint', { defaultValue: 'Jour férié : pensez à proposer un tarif un peu plus élevé.' })}
            </p>
          </div>
        </div>
      )}

      <div className="p-2 space-y-0.5">
        <button
          onClick={onSingleDay}
          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left hover:bg-muted/60 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">
              {t('shifts.calendar.singleDay', { defaultValue: 'Un seul jour' })}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {t('shifts.calendar.singleDayDesc', { defaultValue: 'Créer une vacation' })}
            </p>
          </div>
        </button>

        <button
          onClick={onMultiDay}
          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left hover:bg-muted/60 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <CalendarRange className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">
              {t('shifts.calendar.multiDay', { defaultValue: 'Plusieurs jours' })}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {t('shifts.calendar.multiDayDesc', { defaultValue: 'Choisir une plage' })}
            </p>
          </div>
        </button>
      </div>
    </motion.div>,
    document.body
  );
}

// ─── Carte d'aperçu d'un shift (Portal — jamais coupée) ──────────────────────

interface PreviewState {
  shift: Shift;
  x: number;      // centre horizontal de la carte
  top: number;    // bord supérieur de la carte
  bottom: number; // bord inférieur de la carte
}

const PREVIEW_W = 232;

function ShiftPreviewCard({
  state, getDisplayStatus, t,
}: {
  state: PreviewState;
  getDisplayStatus: (s: Shift) => ShiftStatus;
  t: (k: string, o?: object) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: state.top, left: state.x - PREVIEW_W / 2, placement: 'top',
  });

  const { shift } = state;
  const bucket = STATUS_BUCKET[getDisplayStatus(shift)];
  const st = BUCKET_STYLE[bucket];
  const posName = shift.position_name || shift.position?.title || t('shifts.undefinedPosition', { defaultValue: 'Poste' });
  const required = shift.required_employees || 1;

  const { total: totalApplicants, pending: pendingApplicants, acceptedNames } = getApplicantsSummary(shift);
  const assigned = acceptedNames.length;
  const quote = getShiftQuote(shift);

  const timezone = getEstablishmentTz(shift);
  const startLabel = formatShiftTime(shift.start_time, timezone, { style: 'time-only' });
  const endLabel = formatShiftTime(shift.end_time, timezone, { style: 'time-only' });

  useEffect(() => {
    if (!ref.current) return;
    const h = ref.current.getBoundingClientRect().height;
    const vw = window.innerWidth;
    let left = state.x - PREVIEW_W / 2;
    if (left + PREVIEW_W > vw - 8) left = vw - PREVIEW_W - 8;
    if (left < 8) left = 8;

    let placement: 'top' | 'bottom' = 'top';
    let top = state.top - h - 8;
    if (top < 8) { placement = 'bottom'; top = state.bottom + 8; }
    setPos({ top, left, placement });
  }, [state.x, state.top, state.bottom]);

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: pos.placement === 'top' ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.13, ease: 'easeOut' }}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: PREVIEW_W, zIndex: 10000 }}
      className="pointer-events-none bg-white dark:bg-card rounded-xl border border-border/50 shadow-xl overflow-hidden"
    >
      <div className={`h-1 w-full ${st.dot}`} />
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground leading-snug">{posName}</p>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.pillBg} ${st.pillText}`}>
            {t(`shifts.status.${getDisplayStatus(shift)}`)}
          </span>
        </div>

        {/* ✅ جديد — بادج نوع الشيفت (Freelance / Employé) في بطاقة المعاينة */}
        <ShiftTypeBadge
          publishedToFreelancers={shift.published_to_freelancers}
          targetsEmployees={shift.targets_employees}
          variant="full"
        />

        {shift.establishment && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{shift.establishment.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs">
          <span className="font-medium text-foreground tabular-nums">
            {startLabel} – {endLabel}
          </span>
          <span className={`font-semibold tabular-nums ${assigned >= required ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {assigned}/{required}
          </span>
        </div>

        {quote && (
          <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">
              {formatCurrency(quote.rate)}<span className="text-[10px]">/h</span>
            </span>
            <span className="font-bold text-primary tabular-nums">
              {formatCurrency(quote.totalTTC)}
              <span className="ml-1 text-[9px] font-normal text-muted-foreground uppercase">TTC</span>
            </span>
          </div>
        )}

        {shift.event_id && (
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40 text-[11px] text-blue-600 dark:text-blue-400">
            <Link2 className="w-3 h-3 shrink-0" />
            <span>
              {t('shifts.calendar.partOfExtension', { defaultValue: 'Fait partie d\'une vacation étendue' })}
            </span>
          </div>
        )}

        {totalApplicants > 0 && (
          <div className="pt-1.5 border-t border-border/40 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Users className="w-3 h-3 shrink-0" />
              <span>
                {t('shifts.calendar.applicantsCount', {
                  defaultValue: '{{total}} candidature(s)',
                  total: totalApplicants,
                })}
              </span>
              {pendingApplicants > 0 && (
                <span className="ml-auto font-semibold text-orange-600 dark:text-orange-400">
                  {t('shifts.calendar.pendingCount', {
                    defaultValue: '{{count}} en attente',
                    count: pendingApplicants,
                  })}
                </span>
              )}
            </div>
            {acceptedNames.length > 0 && (
              <p className="text-[11px] text-foreground truncate">
                <span className="text-muted-foreground">
                  {t('shifts.calendar.assignedTo', { defaultValue: 'Affecté :' })}{' '}
                </span>
                {acceptedNames.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  );
}

// ─── Carte de shift (vue semaine) ────────────────────────────────────────────
// Poste · début – fin · établissement · photo + nom des candidats / affectés

function ShiftCard({
  shift, index, status, isLinked, t, onEnter, onLeave,
}: {
  shift: Shift;
  index: number;
  status: ShiftStatus;
  isLinked: boolean;
  t: (k: string, o?: object) => string;
  onEnter: (shift: Shift, e: React.MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
}) {
  const bucket = STATUS_BUCKET[status];
  const st = BUCKET_STYLE[bucket];
  const isCanceled = bucket === 'canceled';

  const posName = shift.position_name || shift.position?.title || t('shifts.undefinedPosition', { defaultValue: 'Poste' });
  const timezone = getEstablishmentTz(shift);
  const startLabel = formatShiftTime(shift.start_time, timezone, { style: 'time-only' });
  const endLabel = formatShiftTime(shift.end_time, timezone, { style: 'time-only' });

  const people = getShiftPeople(shift);
  const assigned = people.filter((p) => p.state === 'accepted').length;
  const hasPending = people.some((p) => p.state === 'pending');
  const required = shift.required_employees || 1;
  const visiblePeople = people.slice(0, MAX_VISIBLE_PEOPLE);
  const hiddenPeople = people.length - visiblePeople.length;

  const kindLabel = (p: ShiftPerson) => p.kind === 'freelancer'
    ? t('shifts.calendar.kindFreelancer', { defaultValue: 'Freelance' })
    : t('shifts.calendar.kindEmployee', { defaultValue: 'Employé' });
  const stateLabel = (p: ShiftPerson) => p.state === 'accepted'
    ? t('shifts.calendar.personAccepted', { defaultValue: 'Accepté' })
    : t('shifts.calendar.personPending', { defaultValue: 'En attente' });

  return (
    <Link to={`/shifts/${shift.id}`} onClick={(e) => e.stopPropagation()}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0, scale: isLinked ? 1.02 : 1 }}
        transition={{ delay: index * 0.03, duration: 0.18 }}
        onMouseEnter={(e) => onEnter(shift, e)}
        onMouseLeave={onLeave}
        className={`relative rounded-lg border pl-3 pr-2 py-2 space-y-1
                    ${st.pillBg} ${st.cardBorder}
                    hover:brightness-[0.97] dark:hover:brightness-110 hover:shadow-sm
                    transition-[filter,box-shadow] duration-150
                    ${hasPending && !isLinked ? 'ring-1 ring-primary/40' : ''}
                    ${isLinked ? 'ring-2 ring-blue-400 shadow-md z-10' : ''}
                    ${isCanceled ? 'opacity-75' : ''}`}
      >
        {/* Barre de statut */}
        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${st.dot}`} />

        {/* Horaires + affectés/requis */}
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[11px] font-bold tabular-nums whitespace-nowrap ${st.timeText}`}>
            {startLabel} – {endLabel}
          </span>
          <span
            className={`shrink-0 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-black/20
                        ${assigned >= required ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'}`}
          >
            {assigned}/{required}
          </span>
        </div>

        {/* Poste + badge type de shift */}
        <div className="flex items-start gap-1">
          <p
            className={`flex-1 min-w-0 text-[12.5px] font-semibold text-foreground leading-snug line-clamp-2 break-words
                        ${isCanceled ? 'line-through decoration-red-400/60' : ''}`}
            title={posName}
          >
            {posName}
          </p>
          {/* ✅ جديد — بادج نوع الشيفت (أيقونة مضغوطة: أمبر=فريلانس / أزرق=موظف) */}
          <ShiftTypeBadge
            publishedToFreelancers={shift.published_to_freelancers}
            targetsEmployees={shift.targets_employees}
            variant="icon"
            className="shrink-0 mt-0.5"
          />
          {shift.event_id && (
            <Link2
              className={`shrink-0 mt-0.5 w-3 h-3 transition-colors
                          ${isLinked ? 'text-blue-500 dark:text-blue-400' : 'text-foreground/30'}`}
            />
          )}
        </div>

        {/* Établissement */}
        {shift.establishment?.name && (
          <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{shift.establishment.name}</span>
          </div>
        )}

        {/* Personnes : affectés d'abord, puis candidats en attente */}
        {people.length > 0 ? (
          <div className="pt-1.5 mt-0.5 border-t border-black/[0.06] dark:border-white/10 space-y-1">
            {visiblePeople.map((p) => (
              <div
                key={p.key}
                className="flex items-center gap-1.5 min-w-0"
                title={`${p.name} · ${kindLabel(p)} · ${stateLabel(p)}`}
              >
                <PersonAvatar person={p} />
                <span
                  className={`flex-1 min-w-0 truncate text-[11px] leading-tight
                              ${p.state === 'accepted' ? 'font-semibold text-foreground' : 'font-medium text-foreground/70'}`}
                >
                  {p.name}
                </span>
                {p.state === 'accepted' ? (
                  <Check className="shrink-0 w-3 h-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                ) : (
                  <Clock className="shrink-0 w-3 h-3 text-orange-500 dark:text-orange-400" strokeWidth={2.5} />
                )}
              </div>
            ))}
            {hiddenPeople > 0 && (
              <p className="text-[10px] font-medium text-muted-foreground pl-[26px]">
                +{hiddenPeople} {t('shifts.calendar.morePeople', { defaultValue: 'autre(s)' })}
              </p>
            )}
          </div>
        ) : !isCanceled && (
          <p className="pt-1.5 mt-0.5 border-t border-black/[0.06] dark:border-white/10 text-[10px] italic text-muted-foreground/70">
            {t('shifts.calendar.noApplicants', { defaultValue: 'Aucune candidature' })}
          </p>
        )}

        {/* Pastille : candidatures en attente */}
        {hasPending && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        )}
      </motion.div>
    </Link>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// ✅ إعادة هيكلة كاملة: من "أسبوع واحد نشط + أسهم" إلى قائمة أسابيع متراكمة
// عمودياً (infinite scroll ثنائي الاتجاه)، بحد 3 أشهر للأمام وللخلف.
// بدل الأسهم: قائمتان منسدلتان "اذهب إلى أسبوع/شهر" + زر "اليوم".

export function ShiftsCalendarView({ shifts, getDisplayStatus, canCreate }: ShiftsCalendarViewProps) {
  const { t, i18n } = useTranslation();
  const { navigate } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);

  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const weekBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isLoadingPastRef = useRef(false);
  const isLoadingFutureRef = useRef(false);
  const [isLoadingPast, setIsLoadingPast] = useState(false);

  const today = new Date();
  const todayWeekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const minWeekStart = useMemo(() => subWeeks(todayWeekStart, WEEKS_CAP), [todayWeekStart]);
  const maxWeekStart = useMemo(() => addWeeks(todayWeekStart, WEEKS_CAP), [todayWeekStart]);

  // ✅ الأسبوعان المعروضان مبدئياً: الحالي + القادم
  const [weekStarts, setWeekStarts] = useState<Date[]>(() => [
    todayWeekStart,
    addWeeks(todayWeekStart, 1),
  ]);

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [hoverEnd, setHoverEnd] = useState<Date | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  // ✅ event_id du shift survolé — met en évidence toutes les vacations liées
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const getLocale = (): Locale => {
    const map: Record<string, Locale> = { fr, en: enUS, es, it, zh: zhCN };
    return map[i18n.language] || enUS;
  };

  const getDateFormat = () => {
    const map: Record<string, string> = {
      en: 'MMM dd, yyyy', fr: 'dd MMM yyyy', es: 'dd MMM yyyy',
      it: 'dd MMM yyyy', zh: 'yyyy年MM月dd日',
    };
    return map[i18n.language] || 'dd MMM yyyy';
  };

  const isDayPast = (d: Date) => isPast(startOfDay(d)) && !dateFnsIsToday(d);

  const isInPreviewRange = (day: Date): boolean => {
    if (!rangeStart || !hoverEnd) return false;
    if (isBefore(hoverEnd, rangeStart)) return false;
    return !isBefore(day, rangeStart) && !isBefore(hoverEnd, day);
  };

  // ✅ عدد الأيام في النطاق — يعمل حتى لو امتد النطاق عبر عدة أسابيع
  const rangeDayCount = rangeStart && hoverEnd && !isBefore(hoverEnd, rangeStart)
    ? differenceInCalendarDays(hoverEnd, rangeStart) + 1
    : 0;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  // يبقى بدون تعديل عمداً: يستخرج "اليوم" فقط لتجميع الشيفتات بأعمدة الأسبوع
  const extractDate = (dt: string): Date => {
    const [p] = dt.split('T');
    const [y, m, d] = p.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const shiftsByDay = shifts.reduce((acc, s) => {
    const k = format(extractDate(s.start_time), 'yyyy-MM-dd');
    if (!acc[k]) acc[k] = [];
    acc[k].push(s);
    return acc;
  }, {} as Record<string, Shift[]>);

  // ─── Infinite scroll : chargement de semaines futures/passées ──────────────

  const loadMoreFuture = useCallback(() => {
    if (isLoadingFutureRef.current) return;
    isLoadingFutureRef.current = true;

    setWeekStarts((prev) => {
      const last = prev[prev.length - 1];
      const next = addWeeks(last, 1);
      // ✅ توقف صامت عند الحد الأقصى — بدون أي رسالة
      if (next.getTime() > maxWeekStart.getTime()) return prev;
      return [...prev, next];
    });

    requestAnimationFrame(() => { isLoadingFutureRef.current = false; });
  }, [maxWeekStart]);

  // ✅ العودة للأسابيع السابقة لم تعد تلقائية بالسكرول — فقط بضغطة الزر (يدوي بالكامل)
  const loadMorePast = useCallback(() => {
    if (isLoadingPastRef.current) return;

    const scroller = document.scrollingElement || document.documentElement;
    const first = weekStarts[0];
    if (first.getTime() <= minWeekStart.getTime()) return; // توقف صامت عند الحد الأقصى

    isLoadingPastRef.current = true;
    setIsLoadingPast(true);
    const prevScrollHeight = scroller.scrollHeight;
    const prevScrollTop = scroller.scrollTop;

    setWeekStarts((prev) => [subWeeks(prev[0], 1), ...prev]);

    // ✅ نعوّض ارتفاع المحتوى المُضاف أعلى القائمة حتى لا "يقفز" العرض المرئي
    requestAnimationFrame(() => {
      const newScrollHeight = scroller.scrollHeight;
      scroller.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
      isLoadingPastRef.current = false;
      setIsLoadingPast(false);
    });
  }, [weekStarts, minWeekStart]);

  // ✅ التمرير للأسفل يبقى تلقائياً (infinite scroll) لتحميل الأسابيع القادمة فقط
  useEffect(() => {
    const bottomEl = bottomSentinelRef.current;
    if (!bottomEl) return;

    const bottomObserver = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMoreFuture(); },
      { root: null, rootMargin: '600px 0px' },
    );

    bottomObserver.observe(bottomEl);

    return () => {
      bottomObserver.disconnect();
    };
  }, [loadMoreFuture]);

  const canLoadPast = weekStarts[0].getTime() > minWeekStart.getTime();

  // ─── القفز السريع إلى أسبوع محدد (أزرار "أسبوع" / "شهر" بدل الأسهم) ────────

  const scrollToWeek = useCallback((targetWeekStart: Date) => {
    const clamped = targetWeekStart.getTime() < minWeekStart.getTime() ? minWeekStart
      : targetWeekStart.getTime() > maxWeekStart.getTime() ? maxWeekStart
      : targetWeekStart;
    const key = format(clamped, 'yyyy-MM-dd');

    setWeekStarts((prev) => {
      if (prev.some((w) => isSameDay(w, clamped))) return prev;
      // ✅ نملأ كل الأسابيع الوسيطة بين ما هو محمَّل حالياً والهدف، حتى لا تظهر فجوة
      const merged = [...prev, clamped].sort((a, b) => a.getTime() - b.getTime());
      const filled: Date[] = [];
      for (let i = 0; i < merged.length; i++) {
        filled.push(merged[i]);
        if (i < merged.length - 1) {
          let cursor = addWeeks(merged[i], 1);
          while (cursor.getTime() < merged[i + 1].getTime()) {
            filled.push(cursor);
            cursor = addWeeks(cursor, 1);
          }
        }
      }
      return filled;
    });

    // ننتظر رسم البلوك الجديد قبل التمرير إليه
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        weekBlockRefs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, [minWeekStart, maxWeekStart]);

  const goToToday = () => scrollToWeek(todayWeekStart);

  // ✅ خيارات القائمتين المنسدلتين (± 3 أشهر) — تولَّد مرة واحدة فقط
  const weekOptions = useMemo(() => {
    const opts: { value: string; label: string; date: Date }[] = [];
    let cursor = minWeekStart;
    while (cursor.getTime() <= maxWeekStart.getTime()) {
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      opts.push({
        value: format(cursor, 'yyyy-MM-dd'),
        label: `${t('shifts.calendar.weekShort', { defaultValue: 'Sem.' })} ${getISOWeek(cursor)} · ${format(cursor, 'd MMM', { locale: getLocale() })}–${format(end, 'd MMM', { locale: getLocale() })}`,
        date: cursor,
      });
      cursor = addWeeks(cursor, 1);
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minWeekStart, maxWeekStart, i18n.language]);

  const monthOptions = useMemo(() => {
    const map = new Map<string, Date>();
    let cursor = minWeekStart;
    while (cursor.getTime() <= maxWeekStart.getTime()) {
      const key = format(cursor, 'yyyy-MM');
      if (!map.has(key)) map.set(key, cursor);
      cursor = addWeeks(cursor, 1);
    }
    return Array.from(map.entries()).map(([value, date]) => ({
      value,
      label: format(date, 'MMMM yyyy', { locale: getLocale() }),
      date,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minWeekStart, maxWeekStart, i18n.language]);

  // ─── Close popover on outside click / scroll ──────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (_portalEl && _portalEl.contains(target)) return;
      if (containerRef.current && containerRef.current.contains(target)) return;
      setPopover(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const close = () => { setPopover(null); setPreview(null); setHoveredEventId(null); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);

  // Escape annule le mode plage
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setRangeStart(null); setHoverEnd(null); setPopover(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── Open popover ──────────────────────────────────────────────────────────

  // ✅ في العرض الأسبوعي العمود طويل، لذا نموضع الـ popover عند نقطة النقر
  // بدل أسفل العنصر (وإلا ظهر بعيداً أسفل العمود)
  const openPopover = useCallback((day: Date, x: number, y: number) => {
    setPopover({ day, x, y });
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDayClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (isDayPast(day)) return;

    if (rangeStart) {
      if (isBefore(day, rangeStart) && !isSameDay(day, rangeStart)) return;
      const s = format(rangeStart, 'yyyy-MM-dd');
      const end = format(day, 'yyyy-MM-dd');
      navigate(`/shifts/new?startDate=${s}&endDate=${end}`);
      setRangeStart(null);
      setHoverEnd(null);
      return;
    }
    openPopover(day, e.clientX, e.clientY);
  };

  const handlePlusClick = (day: Date, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    openPopover(day, rect.left + rect.width / 2, rect.bottom);
  };

  const handleSingleDay = () => {
    if (!canCreate) {
      navigate(`/subscription`);
      setPopover(null);
      return;
    }
    if (!popover) return;
    navigate(`/shifts/new?date=${format(popover.day, 'yyyy-MM-dd')}`);
    setPopover(null);
  };

  const handleMultiDay = () => {
    if (!canCreate) {
      navigate(`/subscription`);
      setPopover(null);
      return;
    }
    if (!popover) return;
    setRangeStart(popover.day);
    setPopover(null);
  };

  const handleCancelRange = () => {
    setRangeStart(null);
    setPopover(null);
    setHoverEnd(null);
  };

  const handleShiftMouseEnter = (shift: Shift, e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPreview({ shift, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
    if (shift.event_id) setHoveredEventId(shift.event_id);
  };

  const handleShiftMouseLeave = () => {
    setPreview(null);
    setHoveredEventId(null);
  };

  // ─── Day column renderer ───────────────────────────────────────────────────

  const DAY_NAMES = [
    t('dashboard.monday'), t('dashboard.tuesday'), t('dashboard.wednesday'),
    t('dashboard.thursday'), t('dashboard.friday'), t('dashboard.saturday'), t('dashboard.sunday'),
  ];

  const renderColumn = (day: Date, idx: number) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const isToday = isSameDay(day, today);
    const past = isDayPast(day);
    const isWeekend = idx >= 5;
    const canInteract = !past;
    // ✅ جديد — عيد رسمي في هذا اليوم؟
    const holiday = getHoliday(day);

    const dayShifts = [...(shiftsByDay[dateKey] || [])].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
    const visibleShifts = dayShifts.slice(0, MAX_VISIBLE_SHIFTS);
    const hiddenShifts = dayShifts.length - visibleShifts.length;

    const isRangeStart = !!rangeStart && isSameDay(day, rangeStart);
    const isValidRangeEnd = !!rangeStart && !past &&
      !isBefore(day, rangeStart) && !isSameDay(day, rangeStart);
    const isHoverEnd = !!rangeStart && !!hoverEnd && isSameDay(day, hoverEnd);
    const inRange = isInPreviewRange(day);

    let bg = '';
    if (past) bg = 'bg-muted/15 dark:bg-muted/5';
    else if (isToday) bg = 'bg-primary/[0.03] dark:bg-primary/[0.05]';
    else if (isWeekend) bg = 'bg-muted/[0.04] dark:bg-muted/[0.03]';
    else bg = 'bg-white dark:bg-card';
    // ✅ لون خفيف لليوم المميز (لا يطغى على اليوم الحالي ولا الأيام الماضية)
    if (holiday && !past && !isToday) bg = 'bg-rose-50/60 dark:bg-rose-950/20';
    if (isRangeStart || isHoverEnd) bg = '!bg-primary/15';
    else if (inRange) bg = '!bg-primary/[0.07]';

    const highlighted = isToday || isRangeStart || isHoverEnd;

    return (
      <div
        key={dateKey}
        className={[
          'group/cell relative flex flex-col min-w-0 lg:min-h-[460px] transition-colors duration-150',
          bg,
          canInteract ? 'cursor-pointer' : 'cursor-default',
          isValidRangeEnd && !inRange ? 'hover:!bg-primary/[0.07]' : '',
          canInteract && !rangeStart ? 'hover:bg-muted/30 dark:hover:bg-muted/20' : '',
        ].filter(Boolean).join(' ')}
        onClick={(e) => handleDayClick(day, e)}
        onMouseEnter={() => { if (rangeStart && canInteract && !isSameDay(day, rangeStart)) setHoverEnd(day); }}
        onMouseLeave={() => { if (rangeStart) setHoverEnd(null); }}
      >
        {/* En-tête du jour : numéro + nom + bouton + */}
        <div className={`relative flex items-center justify-between gap-1.5 px-2.5 py-2.5 border-b border-border/30
                         ${holiday && !past && !isToday
                           ? 'bg-rose-100/70 dark:bg-rose-950/40'
                           : isToday ? 'bg-primary/[0.06]' : 'bg-muted/20'}`}>
          {/* ✅ شريط علوي ملوّن يميّز اليوم الرسمي من بعيد */}
          {holiday && (
            <span className={`absolute top-0 left-0 right-0 h-1 ${past ? 'bg-rose-300/40' : 'bg-rose-500'}`} />
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className={[
              'shrink-0 text-[15px] font-semibold w-8 h-8 flex items-center justify-center rounded-full leading-none tabular-nums',
              highlighted ? 'bg-primary text-white shadow-sm' : '',
              !highlighted && past ? 'text-muted-foreground/40' : '',
              !highlighted && !past && holiday ? 'bg-rose-500 text-white shadow-sm' : '',
              !highlighted && !past && !holiday ? 'text-foreground' : '',
            ].filter(Boolean).join(' ')}>
              {format(day, 'd')}
            </span>
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-wider truncate leading-tight
                             ${isToday ? 'text-primary' : isWeekend || past ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                {DAY_NAMES[idx]}
              </p>
              {holiday && (
                <span
                  className={`inline-flex items-center gap-1 max-w-full mt-1 pl-0.5 pr-2 py-0.5 rounded-full
                              text-[10.5px] font-bold leading-tight
                              ${past
                                ? 'bg-rose-100/50 text-rose-400/70 dark:bg-rose-950/20'
                                : 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'}`}
                  title={`${holiday.name} — ${t('shifts.holiday.calendarTip', { defaultValue: 'jour férié : pensez à proposer un tarif un peu plus élevé' })}`}
                >
                  <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center
                                    ${past ? 'bg-rose-300/50 text-white' : 'bg-rose-500 text-white'}`}>
                    <HolidayIcon icon={holiday.icon} className="w-2.5 h-2.5" />
                  </span>
                  <span className="truncate">{holiday.name}</span>
                </span>
              )}
              <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                {dayShifts.length > 0
                  ? t('shifts.calendar.shiftCount', { defaultValue: '{{count}} vacation(s)', count: dayShifts.length })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Bouton + */}
          {!rangeStart && canInteract && (
            <motion.button
              type="button"
              onClick={(e) => handlePlusClick(day, e)}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              aria-label={t('shifts.calendar.addShift', { defaultValue: 'Ajouter un shift' })}
              title={t('shifts.calendar.addShift', { defaultValue: 'Ajouter un shift' })}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg
                         border border-border text-muted-foreground/70 bg-background/60
                         opacity-60 group-hover/cell:opacity-100
                         hover:!bg-foreground hover:!text-background hover:!border-foreground
                         transition-[background-color,color,border-color,opacity,transform] duration-150"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </motion.button>
          )}

          {/* Badge début */}
          {isRangeStart && (
            <span className="shrink-0 text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full leading-none uppercase tracking-wide">
              {t('shifts.calendar.start', { defaultValue: 'Début' })}
            </span>
          )}

          {/* Mode plage : indicateur sur le jour survolé (= fin) */}
          {isHoverEnd && isValidRangeEnd && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none shrink-0 flex items-center gap-1
                         px-2 py-1 rounded-lg bg-primary text-white text-[10px] font-semibold shadow-md whitespace-nowrap"
            >
              <Plus className="w-3 h-3" strokeWidth={3} />
              {t('shifts.calendar.clickToEnd', { defaultValue: 'Terminer ici' })}
            </motion.div>
          )}
        </div>

        {/* Cartes des shifts */}
        <div className="flex-1 p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 content-start">
          {visibleShifts.map((shift, i) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              index={i}
              status={getDisplayStatus(shift)}
              isLinked={!!shift.event_id && shift.event_id === hoveredEventId}
              t={t}
              onEnter={handleShiftMouseEnter}
              onLeave={handleShiftMouseLeave}
            />
          ))}

          {hiddenShifts > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/shifts?date=${dateKey}`); }}
              className="text-left text-[11px] font-medium text-muted-foreground hover:text-foreground px-1 py-1 transition-colors"
            >
              +{hiddenShifts} {t('common.more', { defaultValue: 'de plus' })}
            </button>
          )}

          {/* ✅ جديد — علامة مائية كبيرة خفيفة على يوم العيد الفارغ */}
          {holiday && dayShifts.length === 0 && (
            <div className="pointer-events-none hidden lg:flex flex-1 items-center justify-center pt-8">
              <HolidayIcon
                icon={holiday.icon}
                className={`w-14 h-14 ${past ? 'text-rose-300/20' : 'text-rose-400/25 dark:text-rose-400/20'}`}
              />
            </div>
          )}

          {/* Hint discret sur un jour vide */}
          {dayShifts.length === 0 && canInteract && !rangeStart && (
            <span className="pointer-events-none hidden lg:block text-center text-[10px] font-medium pt-6
                             text-muted-foreground/0 group-hover/cell:text-muted-foreground/50
                             transition-colors duration-200">
              {t('shifts.calendar.addHint', { defaultValue: '+ shift' })}
            </span>
          )}
        </div>
      </div>
    );
  };

  // ─── Week block renderer (بلوك أسبوع كامل ضمن القائمة العمودية) ────────────

  const renderWeekHeader = (weekStart: Date, weekEnd: Date, weekDaysArr: Date[]) => {
    const locale = getLocale();
    const isCurrentWeek = isSameDay(weekStart, todayWeekStart);
    const weekShiftCount = weekDaysArr.reduce(
      (sum, d) => sum + (shiftsByDay[format(d, 'yyyy-MM-dd')]?.length || 0), 0,
    );

    // ✅ جديد — أعياد هذا الأسبوع (تظهر كشارات في عنوان الأسبوع)
    const weekHolidays = weekDaysArr
      .map((d) => getHoliday(d))
      .filter((h): h is NonNullable<ReturnType<typeof getHoliday>> => !!h);

    const title = i18n.language === 'zh'
      ? `${format(weekStart, 'M月d日')} – ${format(weekEnd, 'M月d日')}`
      : isSameMonth(weekStart, weekEnd)
        ? `${format(weekStart, 'd')} – ${format(weekEnd, 'd MMMM yyyy', { locale })}`
        : `${format(weekStart, 'd MMM', { locale })} – ${format(weekEnd, 'd MMM yyyy', { locale })}`;

    return (
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-1">
        <h3 className={`text-lg font-bold capitalize tracking-tight ${isCurrentWeek ? 'text-primary' : 'text-foreground'}`}>
          {title}
        </h3>
        <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">
          {t('shifts.calendar.weekShort', { defaultValue: 'Sem. {{week}}', week: getISOWeek(weekStart) })}
        </span>
        {isCurrentWeek && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-primary px-2 py-0.5 rounded-full">
            {t('shifts.calendar.thisWeek', { defaultValue: 'Cette semaine' })}
          </span>
        )}
        {weekShiftCount > 0 && (
          <span className="text-xs text-muted-foreground">
            · {t('shifts.calendar.shiftCount', { defaultValue: '{{count}} vacation(s)', count: weekShiftCount })}
          </span>
        )}
        {weekHolidays.map((h) => (
          <span
            key={h.date}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full"
          >
            <HolidayIcon icon={h.icon} className="w-3 h-3" />
            {h.name}
          </span>
        ))}
      </div>
    );
  };

  const renderWeekBlock = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekDaysArr = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    return (
      <motion.div
        key={weekKey}
        ref={(el) => {
          if (el) weekBlockRefs.current.set(weekKey, el);
          else weekBlockRefs.current.delete(weekKey);
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="space-y-2.5 scroll-mt-4"
      >
        {renderWeekHeader(weekStart, weekEnd, weekDaysArr)}
        <div className="rounded-2xl border border-border/50 overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-border/30">
            {weekDaysArr.map((day, idx) => renderColumn(day, idx))}
          </div>
        </div>
      </motion.div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-5 space-y-4" ref={containerRef}>

      {/* En-tête global : Aujourd'hui + sélecteurs Semaine / Mois (remplacent ◀ ▶) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {t('shifts.calendar.title', { defaultValue: 'Calendrier des vacations' })}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t('dashboard.today')}
          </Button>

          {/* ✅ جديد — قفز سريع لأسبوع محدد، بديل الأسهم */}
          <select
            value=""
            onChange={(e) => {
              const opt = weekOptions.find((o) => o.value === e.target.value);
              if (opt) scrollToWeek(opt.date);
            }}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background hover:bg-muted/40 transition-colors cursor-pointer max-w-[180px]"
          >
            <option value="" disabled>
              {t('shifts.calendar.jumpToWeek', { defaultValue: 'Aller à une semaine…' })}
            </option>
            {weekOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* ✅ جديد — قفز سريع لشهر محدد */}
          <select
            value=""
            onChange={(e) => {
              const opt = monthOptions.find((o) => o.value === e.target.value);
              if (opt) scrollToWeek(opt.date);
            }}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background hover:bg-muted/40 transition-colors cursor-pointer capitalize max-w-[160px]"
          >
            <option value="" disabled>
              {t('shifts.calendar.jumpToMonth', { defaultValue: 'Aller à un mois…' })}
            </option>
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value} className="capitalize">{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bandeau mode plage — reste global, un shift peut s'étendre sur plusieurs semaines */}
      <AnimatePresence>
        {rangeStart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/[0.07] border border-primary/20">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <CalendarRange className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t('shifts.calendar.rangeStarted', { defaultValue: 'Sélection de la plage' })} ·{' '}
                  <span className="text-primary font-semibold">
                    {format(rangeStart, getDateFormat(), { locale: getLocale() })}
                  </span>
                  {hoverEnd && !isBefore(hoverEnd, rangeStart) && (
                    <>
                      {' → '}
                      <span className="text-primary font-semibold">
                        {format(hoverEnd, getDateFormat(), { locale: getLocale() })}
                      </span>
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({rangeDayCount} {rangeDayCount > 1
                          ? t('shifts.calendar.days', { defaultValue: 'jours' })
                          : t('shifts.calendar.day', { defaultValue: 'jour' })})
                      </span>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('shifts.calendar.clickEndDayScroll', {
                    defaultValue: 'Cliquez sur le dernier jour — faites défiler pour changer de semaine',
                  })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelRange}
                className="shrink-0 border-border hover:bg-muted/50"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                {t('common.cancel', { defaultValue: 'Annuler' })}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Liste verticale des semaines — le scroll ne charge que les semaines futures.
          Les semaines passées se chargent uniquement via ce bouton (jamais au scroll). */}
      <div className="space-y-6">
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMorePast}
            disabled={!canLoadPast || isLoadingPast}
            className="gap-1.5"
          >
            {isLoadingPast ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
            {t('shifts.calendar.loadPreviousWeek', { defaultValue: 'Semaine précédente' })}
          </Button>
        </div>

        {weekStarts.map((weekStart) => renderWeekBlock(weekStart))}

        {/* Sentinel bas — déclenche le chargement de semaines futures (silencieux au-delà de 3 mois) */}
        <div ref={bottomSentinelRef} aria-hidden className="h-px" />
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1">
        {([
          ['confirmed', t('shifts.calendar.legendConfirmed', { defaultValue: 'Confirmé' })],
          ['unassigned', t('shifts.calendar.legendUnassigned', { defaultValue: 'Pas encore assigné' })],
          ['canceled', t('shifts.calendar.legendCanceled', { defaultValue: 'Annulé' })],
        ] as const).map(([bucket, label]) => (
          <div key={bucket} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${BUCKET_STYLE[bucket].legendDot}`} />
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
          <span className="text-xs text-muted-foreground font-medium">
            {t('shifts.calendar.personAccepted', { defaultValue: 'Accepté' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-orange-500 dark:text-orange-400" strokeWidth={2.5} />
          <span className="text-xs text-muted-foreground font-medium">
            {t('shifts.calendar.personPending', { defaultValue: 'En attente' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link2 className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
          <span className="text-xs text-muted-foreground font-medium">
            {t('shifts.calendar.legendLinked', { defaultValue: 'Vacation étendue (survol = groupe lié)' })}
          </span>
        </div>
        {/* ✅ جديد — légende du badge type de shift */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {t('shifts.calendar.legendFreelance', { defaultValue: 'Freelance' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {t('shifts.calendar.legendEmployee', { defaultValue: 'Employé' })}
          </span>
        </div>
        {/* ✅ جديد — légende jour férié */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-rose-500 text-white">
            <Flag className="w-2 h-2" />
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {t('shifts.calendar.legendHoliday', { defaultValue: 'Jour férié' })}
          </span>
        </div>
      </div>

      {/* Portal popover */}
      <AnimatePresence>
        {popover && (
          <DayPopover
            state={popover}
            locale={getLocale()}
            dateFormat={getDateFormat()}
            t={t}
            onSingleDay={handleSingleDay}
            onMultiDay={handleMultiDay}
            onClose={() => setPopover(null)}
          />
        )}
      </AnimatePresence>

      {/* Portal aperçu shift */}
      <AnimatePresence>
        {preview && (
          <ShiftPreviewCard
            state={preview}
            getDisplayStatus={getDisplayStatus}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}