import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { EmployeeStatus, Establishment, JobPosition } from '../types';

interface EmployeeEditDialogsProps {
  // Establishment dialog
  isEditingEstablishment: boolean;
  setIsEditingEstablishment: (open: boolean) => void;
  selectedEstablishmentId: string;
  setSelectedEstablishmentId: (id: string) => void;
  establishments: Establishment[];
  updateEmployeeEstablishmentMutation: UseMutationResult<void, Error, string>;

  // Hourly rate dialog
  isEditingHourlyRate: boolean;
  setIsEditingHourlyRate: (open: boolean) => void;
  hourlyRateValue: string;
  setHourlyRateValue: (value: string) => void;
  updateHourlyRateMutation: UseMutationResult<void, Error, number | null>;

  // Status dialog
  isEditingStatus: boolean;
  setIsEditingStatus: (open: boolean) => void;
  selectedStatus: EmployeeStatus;
  setSelectedStatus: (status: EmployeeStatus) => void;
  updateStatusMutation: UseMutationResult<void, Error, EmployeeStatus>;

  // Job positions (métiers) dialog
  isEditingJobPositions: boolean;
  setIsEditingJobPositions: (open: boolean) => void;
  jobPositions: JobPosition[];
  selectedJobPositionIds: string[];
  setSelectedJobPositionIds: (ids: string[]) => void;
  updateJobPositionsMutation: UseMutationResult<void, Error, string[]>;
}

export function EmployeeEditDialogs({
  isEditingEstablishment,
  setIsEditingEstablishment,
  selectedEstablishmentId,
  setSelectedEstablishmentId,
  establishments,
  updateEmployeeEstablishmentMutation,
  isEditingHourlyRate,
  setIsEditingHourlyRate,
  hourlyRateValue,
  setHourlyRateValue,
  updateHourlyRateMutation,
  isEditingStatus,
  setIsEditingStatus,
  selectedStatus,
  setSelectedStatus,
  updateStatusMutation,
  isEditingJobPositions,
  setIsEditingJobPositions,
  jobPositions,
  selectedJobPositionIds,
  setSelectedJobPositionIds,
  updateJobPositionsMutation,
}: EmployeeEditDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Edit Establishment Dialog */}
      <Dialog open={isEditingEstablishment} onOpenChange={setIsEditingEstablishment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('employees.editEstablishment')}</DialogTitle>
            <DialogDescription>
              {t('employees.editEstablishmentDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select
              value={selectedEstablishmentId}
              onChange={(e) => setSelectedEstablishmentId(e.target.value)}
              options={[
                { value: '', label: t('employees.notAssigned') },
                ...establishments.map((est) => ({
                  value: est.id,
                  label: est.name,
                })),
              ]}
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditingEstablishment(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => updateEmployeeEstablishmentMutation.mutate(selectedEstablishmentId)}
              disabled={updateEmployeeEstablishmentMutation.isPending}
            >
              {updateEmployeeEstablishmentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Hourly Rate Dialog */}
      <Dialog open={isEditingHourlyRate} onOpenChange={setIsEditingHourlyRate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('employees.editHourlyRate')}</DialogTitle>
            <DialogDescription>
              {t('employees.editHourlyRateDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              {t('employees.hourlyRate')}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={hourlyRateValue}
              onChange={(e) => setHourlyRateValue(e.target.value)}
              placeholder="25.50"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground border-input"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t('employees.hourlyRateHint')}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditingHourlyRate(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                const rate = hourlyRateValue ? parseFloat(hourlyRateValue) : null;
                if (rate !== null && (isNaN(rate) || rate < 0)) {
                  toast.error(t('employees.csv.invalidHourlyRate'));
                  return;
                }
                updateHourlyRateMutation.mutate(rate);
              }}
              disabled={updateHourlyRateMutation.isPending}
            >
              {updateHourlyRateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={isEditingStatus} onOpenChange={setIsEditingStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('employees.editStatus')}</DialogTitle>
            <DialogDescription>
              {t('employees.editStatusDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as EmployeeStatus)}
              options={[
                { value: 'not_invited', label: t('employees.notInvited') },
                { value: 'active', label: t('employees.active') },
                { value: 'inactive', label: t('employees.inactive') },
              ]}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t('employees.statusHint')}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditingStatus(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => updateStatusMutation.mutate(selectedStatus)}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Job Positions Dialog */}
      <Dialog open={isEditingJobPositions} onOpenChange={setIsEditingJobPositions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('employees.editJobPositions', { defaultValue: "Métiers de l'employé" })}</DialogTitle>
            <DialogDescription>
              {t('employees.editJobPositionsDescription', {
                defaultValue: "Sélectionnez les métiers que cet employé peut exercer. Lors de la publication d'un shift, vous verrez en priorité les employés dont le métier correspond.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="max-h-72 overflow-y-auto space-y-1 border rounded-md p-2">
              {jobPositions.map((jp) => {
                const checked = selectedJobPositionIds.includes(jp.id);
                return (
                  <label
                    key={jp.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedJobPositionIds(
                          checked
                            ? selectedJobPositionIds.filter((x) => x !== jp.id)
                            : [...selectedJobPositionIds, jp.id]
                        )
                      }
                      className="cursor-pointer"
                    />
                    {jp.label}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('employees.jobPositionsSelectedCount', {
                defaultValue: '{{count}} métier(s) sélectionné(s)',
                count: selectedJobPositionIds.length,
              })}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditingJobPositions(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => updateJobPositionsMutation.mutate(selectedJobPositionIds)}
              disabled={updateJobPositionsMutation.isPending}
            >
              {updateJobPositionsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}