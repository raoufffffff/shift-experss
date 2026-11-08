import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/hooks/useLocale';
import { ArrowLeft, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmployeeDetailSkeleton } from '@/components/skeletons/EmployeeDetailSkeleton';
import { useEmployeeDetail } from './hooks/useEmployeeDetail';
import { EmployeeDetailHeader } from './components/EmployeeDetailHeader';
import { EmployeeInfoCard } from './components/EmployeeInfoCard';
import { EmployeeShiftHistory } from './components/EmployeeShiftHistory';
import { EmployeeEditDialogs } from './components/EmployeeEditDialogs';


export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { navigate } = useLocale();
  const { t } = useTranslation();

  const {
    employee,
    establishments,
    jobPositions,
    stats,
    isLoading,
    employeeError,
    employeeFetchError,
    dateFnsLocale,

    // Dialog state
    isEditingEstablishment,
    setIsEditingEstablishment,
    selectedEstablishmentId,
    setSelectedEstablishmentId,
    isEditingHourlyRate,
    setIsEditingHourlyRate,
    hourlyRateValue,
    setHourlyRateValue,
    isEditingStatus,
    setIsEditingStatus,
    selectedStatus,
    setSelectedStatus,
    isEditingJobPositions,
    setIsEditingJobPositions,
    selectedJobPositionIds,
    setSelectedJobPositionIds,

    // Dialog openers
    openEstablishmentDialog,
    openHourlyRateDialog,
    openStatusDialog,
    openJobPositionsDialog,

    // Mutations
    updateEmployeeEstablishmentMutation,
    updateHourlyRateMutation,
    updateStatusMutation,
    updateJobPositionsMutation,
  } = useEmployeeDetail(id);

  // Handle employee fetch error
  if (employeeError && employeeFetchError) {
    toast.error(employeeFetchError.message);
    return (
      <div className="px-4 md:px-6">
        <div className="text-center py-12">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">{t('common.error')}</p>
          <p className="text-gray-500 mb-4">{employeeFetchError.message}</p>
          <Button onClick={() => navigate('/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <EmployeeDetailSkeleton />;
  }

  if (!employee || !stats) {
    return (
      <div className="px-4 md:px-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{t('employees.notFound')}</p>
          <Button onClick={() => navigate('/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-6">
      <EmployeeDetailHeader
        employee={employee}
        onEditStatus={openStatusDialog}
      />

      <EmployeeInfoCard
        employee={employee}
        stats={stats}
        dateFnsLocale={dateFnsLocale}
        onEditEstablishment={openEstablishmentDialog}
        onEditHourlyRate={openHourlyRateDialog}
        onEditJobPositions={openJobPositionsDialog}
      />

      <EmployeeShiftHistory
        stats={stats}
        dateFnsLocale={dateFnsLocale}
      />

      <EmployeeEditDialogs
        isEditingEstablishment={isEditingEstablishment}
        setIsEditingEstablishment={setIsEditingEstablishment}
        selectedEstablishmentId={selectedEstablishmentId}
        setSelectedEstablishmentId={setSelectedEstablishmentId}
        establishments={establishments}
        updateEmployeeEstablishmentMutation={updateEmployeeEstablishmentMutation}
        isEditingHourlyRate={isEditingHourlyRate}
        setIsEditingHourlyRate={setIsEditingHourlyRate}
        hourlyRateValue={hourlyRateValue}
        setHourlyRateValue={setHourlyRateValue}
        updateHourlyRateMutation={updateHourlyRateMutation}
        isEditingStatus={isEditingStatus}
        setIsEditingStatus={setIsEditingStatus}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        updateStatusMutation={updateStatusMutation}
        isEditingJobPositions={isEditingJobPositions}
        setIsEditingJobPositions={setIsEditingJobPositions}
        jobPositions={jobPositions}
        selectedJobPositionIds={selectedJobPositionIds}
        setSelectedJobPositionIds={setSelectedJobPositionIds}
        updateJobPositionsMutation={updateJobPositionsMutation}
      />
    </div>
  );
}