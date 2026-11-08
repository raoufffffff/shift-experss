import { ArrowLeft, Clock, MapPin, Send, XCircle, CalendarClock, UserRoundCheck, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import type { Shift, ShiftStatus } from '../../../components/shifts/shift-detail/types';

interface ShiftHeaderProps {
    shift: Shift;
    displayStatus: ShiftStatus;
    onBack: () => void;
    statusLabel: string;
    statusVariant: 'default' | 'secondary' | 'success' | 'danger' | 'warning' | 'purple';
    isAdminOrManager: boolean;
    isBoostable: boolean;
    onExtend: () => void;
    onSendReminder: () => void;
    onCloseShift: () => void;
    onBoost: () => void;
    canReschedule: boolean;
    onReschedule: () => void;
    // ✅ جديد — true إذا كان هناك فريلانس أو موظف مقبول؛ يمنع إظهار زر الإلغاء
    hasAcceptedApplicant: boolean;
    // ✅ جديد — تحويل الشيفت الموجّه للفريلانس (دون قبول أحد) إلى موظفي الفرع
    canConvertToEmployees: boolean;
    onConvertToEmployees: () => void;
    // ✅ جديد — Relance par appel: يظهر الزر فقط إذا الميزة متاحة وإما قابلة للتفعيل أو مفعّلة
    autoCallVisible: boolean;
    autoCallEnabled: boolean;
    onAutoCall: () => void;
    t: (key: string, options?: Record<string, unknown>) => string;
}

export function ShiftHeader({
    shift,
    onExtend,
    displayStatus,
    onBack,
    statusLabel,
    statusVariant,
    isAdminOrManager,
    isBoostable,
    onSendReminder,
    onCloseShift,
    onBoost,
    canReschedule,
    onReschedule,
    hasAcceptedApplicant,
    canConvertToEmployees,
    onConvertToEmployees,
    autoCallVisible,
    autoCallEnabled,
    onAutoCall,
    t
}: ShiftHeaderProps) {

    return (
        <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-8 px-2 hover:bg-muted"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('common.back')}
                </Button>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            {shift.position_name || shift.position?.title || t('shifts.noPosition')}
                            {shift.public_id && (
                                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/50 uppercase tracking-wider">
                                    {shift.public_id}
                                </span>
                            )}
                        </h1>
                        <Chip variant={statusVariant}>
                            {statusLabel}
                        </Chip>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        {shift.establishment && (
                            <div className="flex items-center gap-1.5 text-sm">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="font-medium">
                                    {shift.establishment.name}
                                </span>
                                {shift.establishment.city && (
                                    <span className="opacity-70">
                                        • {shift.establishment.city}
                                    </span>
                                )}
                                <span className="text-xs opacity-50">•</span>
                                <div className="text-xs text-muted-foreground">
                                    {t('shifts.createdAt', { date: new Date(shift.created_at).toLocaleDateString(), defaultValue: 'Créé le {{date}}' })}
                                </div>
                            </div>
                        )}
                        {!shift.establishment && shift.created_at && (
                            <div className="flex items-center gap-1.5 text-sm">
                                <div className="text-xs text-muted-foreground">
                                    {t('shifts.createdAt', { date: new Date(shift.created_at).toLocaleDateString(), defaultValue: 'Créé le {{date}}' })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isAdminOrManager && (
                        <>
                            {isBoostable && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl border-amber-200 bg-amber-50/50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                    onClick={onBoost}
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {t('shifts.boost.button', { defaultValue: 'Booster' })}
                                </Button>
                            )}
                            {autoCallVisible && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`rounded-xl ${autoCallEnabled
                                        ? 'border-emerald-300 bg-emerald-100/70 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                                        : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}
                                    onClick={onAutoCall}
                                >
                                    <PhoneCall className="w-4 h-4 mr-2" />
                                    {autoCallEnabled
                                        ? t('shifts.autoCalls.buttonActive', { defaultValue: 'Relance par appel · active' })
                                        : t('shifts.autoCalls.button', { defaultValue: 'Relancer par appel' })}
                                </Button>
                            )}
                            {canConvertToEmployees && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl border-blue-200 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                    onClick={onConvertToEmployees}
                                >
                                    <UserRoundCheck className="w-4 h-4 mr-2" />
                                    {t('shifts.convert.button', { defaultValue: 'Confier à mes employés' })}
                                </Button>
                            )}
                            {canReschedule && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                                    onClick={onReschedule}
                                >
                                    <CalendarClock className="w-4 h-4 mr-2" />
                                    {t('shifts.reschedule.button', { defaultValue: 'Replanifier' })}
                                </Button>
                            )}
                            {/* <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={onSendReminder}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {t('shifts.sendReminder', { defaultValue: 'Relancer' })}
                            </Button> */}
                            {/* ✅ معدّل — أُضيف شرط !hasAcceptedApplicant: لا يظهر زر الإلغاء إذا
                                كان هناك فريلانس أو موظف مقبول على الوردية (أو السلسلة كاملة) */}
                            {(shift.status === 'pending' || shift.status === 'partially_filled') && !hasAcceptedApplicant && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl"
                                    onClick={onCloseShift}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    {t('shifts.cancelShift', { defaultValue: 'Annuler le shift' })}
                                </Button>
                            )}
                            {shift.status === 'completed' && !shift.is_extended && (
  <Button
    variant="outline"
    size="sm"
    className="rounded-xl border-blue-200 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
    onClick={onExtend}
  >
    <Clock className="w-4 h-4 mr-2" />
    {t('shifts.extend.button', { defaultValue: 'Prolonger' })}
  </Button>
)}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}