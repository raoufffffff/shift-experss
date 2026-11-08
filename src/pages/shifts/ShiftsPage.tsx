import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShiftsSkeleton } from '@/components/skeletons/ShiftsSkeleton';
import { UpgradeBanner } from '@/components/subscription/UpgradeBanner';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
 import { formatShiftTime, getShiftDurationMinutes } from '@/lib/Shifttime'

// Sub-components
import { ShiftsPageHeader } from '@/components/shifts/ShiftsPageHeader';
import { ShiftsTabsNavigation } from '@/components/shifts/ShiftsTabsNavigation';
import { ShiftsListView } from '@/components/shifts/ShiftsListView';
import { ShiftTypeFilterBar } from '@/components/shifts/ShiftTypeFilterBar';

// Hooks 
import { useShiftsPage } from './hooks/useShiftsPage';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/Button';
import { ShiftStatus } from '@/api/shifts';

// ✅ timezone افتراضي إن كانت المؤسسة بدون قيمة بعد (مرحلة انتقالية بعد الـ migration)
const DEFAULT_TZ = 'Europe/Paris';

export function ShiftsPage() {
  const {
    t,
    i18n,
    usage,
    isAdminOrManager,
    activeTab,
    setActiveTab,
    // ✅ جديد
    shiftTypeFilter,
    setShiftTypeFilter,
    selectedEmployeeId,
    setSelectedEmployeeId,
    filterableEmployees,
    viewMode,
    setViewMode,
    selectedShiftId,
    setSelectedShiftId,
    isLoading,
    error,
    filteredShifts,
    displayedShifts,
    displayedItems,
    tabCounts,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    ITEMS_PER_PAGE,
    getDisplayStatus,
    getAssignedStaffCount,
    getDateLocale,
    getDateFormat,
  } = useShiftsPage();

  const navigate = useNavigate();
  const { getLocalizedPath } = useLocale();

  const navigateToApplicants = useCallback((shiftId: string) => {
    navigate(`${getLocalizedPath('/applications')}?shiftId=${shiftId}`);
  }, [navigate, getLocalizedPath]);

  const statusVariants: Record<ShiftStatus, 'default' | 'secondary' | 'success' | 'danger' | 'warning'> = {
    pending: 'secondary',
    partially_filled: 'warning',
    filled: 'success',
    pending_validation: 'warning',
    completed: 'default',
    canceled: 'danger',
    closed: 'danger',
    expired: 'danger',
  };

  // ✅ معاد بناؤها بالكامل: تحسب المدة بتوقيت establishment.timezone،
  // بدل new Date(startTime).getHours() اللي كانت تعتمد على جهاز المتصفح.
  // establishmentTimezone: مرّرها من الشيفت نفسه (shift.establishment?.timezone)،
  // فالمصدر الحقيقي هو establishments.timezone في DB، مو قيمة ثابتة هنا.
  function calculateShiftNetHours(
    startTime: string,
    endTime: string,
    breakMinutes: number | null | undefined,
    establishmentTimezone: string | null | undefined
  ): number {
    const timezone = establishmentTimezone || DEFAULT_TZ;
    const diffMinutes = getShiftDurationMinutes(startTime, endTime, timezone);

    const totalHours = diffMinutes / 60;
    const breakHours = (breakMinutes || 0) / 60;

    return Math.max(0, totalHours - breakHours);
  }

  function formatShiftHours(durationInHours: number): string {
    const h = Math.floor(durationInHours);
    const m = Math.round((durationInHours - h) * 60);

    if (m === 60) {
      return `${h + 1}h`;
    }

    if (m === 0) return `${h}h`;

    return `${h}h${m.toString().padStart(2, '0')}`;
  }

  // ✅ إضافة establishmentTimezone كمعامل رابع — لازم يُمرَّر من الشيفت المعني
  // (shift.establishment?.timezone) عند كل استدعاء في ShiftsListView/ShiftsCalendarView
  const calculateDuration = useCallback((
    start: string,
    end: string,
    breakMinutes: number,
    establishmentTimezone?: string | null
  ) => {
    return formatShiftHours(calculateShiftNetHours(start, end, breakMinutes, establishmentTimezone));
  }, []);

  // ✅ بدل formatTimeUTC (كانت تعرض UTC خام دايماً) — الآن بتوقيت establishment
  // establishmentTimezone: مرّرها من الشيفت المعني (shift.establishment?.timezone)
  const extractTime = useCallback((dt: string, establishmentTimezone?: string | null) => {
    return formatShiftTime(dt, establishmentTimezone || DEFAULT_TZ, { style: 'time-only' });
  }, []);

  const extractDate = useCallback((dt: string) => {
    const [datePart] = dt.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, []);

  if (isLoading) return <ShiftsSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-lg font-medium">{t('shifts.errorLoading') || 'Error loading shifts'}</p>
          <Button onClick={() => window.location.reload()}>{t('common.retry')}</Button>
        </div>
      </div>
    );
  }

const  canCreate = usage?.shifts.canCreate

  return (
    <div className="space-y-6">
     {canCreate && <ShiftsPageHeader

        isAdminOrManager={isAdminOrManager}
        usage={usage ?? null}
      />}

      {isAdminOrManager && usage?.shifts && !usage.shifts.canCreate && !usage.shifts.isUnlimited && (
        <UpgradeBanner
          limitType="shifts"
          current={usage.shifts.current}
          max={usage.shifts.max}
        />
      )}

      <ShiftsTabsNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabCounts={tabCounts}
      />

      {/* ✅ جديد — فلتر نوع الشيفت (Freelance / Employé) + فلتر فرعي بالموظف */}
      {isAdminOrManager && (
        <ShiftTypeFilterBar
          shiftTypeFilter={shiftTypeFilter}
          setShiftTypeFilter={setShiftTypeFilter}
          selectedEmployeeId={selectedEmployeeId}
          setSelectedEmployeeId={setSelectedEmployeeId}
          filterableEmployees={filterableEmployees}
        />
      )}

      <ShiftsListView
      canCreate={canCreate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filteredShifts={filteredShifts}
        displayedShifts={displayedShifts}
        displayItems={displayedItems}
        getDisplayStatus={getDisplayStatus}
        getAssignedStaffCount={getAssignedStaffCount}
        getDateFormat={getDateFormat}
        getDateLocale={getDateLocale}
        calculateDuration={calculateDuration}
        extractTime={extractTime}
        extractDate={extractDate}
        setSelectedApplicantsShiftId={navigateToApplicants}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        ITEMS_PER_PAGE={ITEMS_PER_PAGE}
        statusVariants={statusVariants}
      />
    </div>
  );
}