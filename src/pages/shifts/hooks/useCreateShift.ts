import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { canCreateShift, getBillingPeriod } from '@shared/subscription-limits';
import {
    SubscriptionPlanEnum,
    JobPosition,
    EstablishmentCategory,
} from '@shared/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { handleSupabaseError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useLocale } from '@/hooks/useLocale';
import {
    WizardFormData,
    getInitialFormData,
    Establishment,
    Employee,
    WIZARD_DRAFT_KEY,
    WIZARD_STEP_KEY,
    serializeFormData,
    deserializeFormData,
} from '@/components/shifts/wizard';
import { useSearchParams } from 'react-router-dom';
import { parseISO, isValid } from 'date-fns';
// ✅ جديد — عدّل المسار حسب مكان shiftTime.ts في هذا المشروع
import { localDateTimeToUTC } from '@/lib/Shifttime';

/**
 * ✅ تحوّل Date (مبنية بتوقيت المتصفح عبر .setHours()) إلى نص "yyyy-MM-ddTHH:mm"
 * يمثّل نفس الأرقام (سنة/شهر/يوم/ساعة/دقيقة) كما كتبها المستخدم — بدون تفسير
 * أي timezone. هذا النص الخام هو ما ندخله بعدين على localDateTimeToUTC مع
 * establishment.timezone الصحيح.
 */
function toLocalDateTimeString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
}

export function useCreateShift() {
    const { navigate } = useLocale();
    const { company, refreshCompany } = useAuthStore();
     const { t, i18n } = useTranslation();
    const currentLang = i18n.language.split('-')[0] || 'fr';
    const queryClient = useQueryClient();

    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [maxStepReached, setMaxStepReached] = useState(1);
    const [formData, setFormData] = useState<WizardFormData>(getInitialFormData());
    const [dismissedLowReadiness, setDismissedLowReadiness] = useState(false);
    // Frais de déplacement : le shift propose-t-il un remboursement de transport ? (réservé aux freelances :
    // ils envoient un montant global + justificatif, le client valide). Plafond optionnel par shift.
    // Gardé hors de WizardFormData (donc hors brouillon) pour ne pas toucher à types.ts.
    const [offersTransportFee, setOffersTransportFee] = useState(false);
    const [transportFeeCap, setTransportFeeCap] = useState('');
    const [searchParams] = useSearchParams();
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');



    // Fetch SIRET document status
    const { data: siretDocument, isLoading: isSiretLoading } = useQuery({
        queryKey: ['company-siret-status', company?.id],
        queryFn: async () => {
            if (!company?.id) return null;
            const { data, error } = await supabase
                .from('company_documents')
                .select('*')
                .eq('company_id', company.id)
                .eq('type', 'siret')
                .maybeSingle();

            if (error) return null;
            return data as { status: string; rejection_reason?: string } | null;
        },
        enabled: !!company?.id
    });

    // Refresh company data on mount to get latest has_configured_rib / sepa status
    useEffect(() => {
        refreshCompany();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { shiftReadinessScore, activeEmployeesCount, minimumEmployees } = useOnboardingProgress();

    const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    }, []);

    const hasFreelanceStep = formData.publishToFreelancers || formData.autoPublishToFreelancers;
    // Le tarif horaire du shift concerne aussi les employés désormais (même
    // champ que pour les freelances — une valeur unique pour tout le shift),
    // donc l'étape "tarif" s'affiche dès qu'il y a des employés OU des
    // freelances, pas seulement pour ces derniers.
    const hasRateStep = hasFreelanceStep || formData.selectedEmployees.length > 0;
    const totalSteps = hasRateStep ? 6 : 5;

    const handleNext = useCallback(() => {
        setCurrentStep((prev) => {
            const nextStep = Math.min(prev + 1, totalSteps);
            setMaxStepReached((max) => Math.max(max, nextStep));
            return nextStep;
        });
    }, [totalSteps]);

    const handlePrevious = useCallback(() => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    }, []);

    const handleGoToStep = useCallback((step: number) => {
        if (step >= 1 && step <= maxStepReached) {
            setCurrentStep(step);
        }
    }, [maxStepReached]);

    // Load draft from localStorage on mount
    useEffect(() => {
        try {
            const savedDraft = localStorage.getItem(WIZARD_DRAFT_KEY);
            const savedStep = localStorage.getItem(WIZARD_STEP_KEY);

             if (savedDraft && (!date || !startDate )) {
                const restored = deserializeFormData(savedDraft);
                if (restored) {
                    setFormData(restored);
                    toast.info(t('shifts.wizard.draftRestored', { defaultValue: 'Brouillon restauré' }));
                }
            }
            if (savedStep  && (!date || startDate )) {
                const step = parseInt(savedStep, 10);
                if (step >= 1 && step <= 5) {
                    setCurrentStep(step);
                    setMaxStepReached(step);
                }
            }
        } catch {
            // Ignore errors
        }
    }, [t, date, startDate]);

    // Save draft
    useEffect(() => {
        try {
            localStorage.setItem(WIZARD_DRAFT_KEY, serializeFormData(formData));
            localStorage.setItem(WIZARD_STEP_KEY, currentStep.toString());
        } catch {
            // Ignore errors
        }
    }, [formData, currentStep]);
useEffect(() => {
  const date      = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate   = searchParams.get('endDate');

  if (startDate && endDate) {
    const start = parseISO(startDate);
    const end   = parseISO(endDate);
    if (!isValid(start) || !isValid(end)) return;

    // ضع الساعات الافتراضية على البداية والنهاية
    start.setHours(9, 0, 0, 0);
    end.setHours(18, 0, 0, 0);

    updateFormData({
      dateRangeStart: start,
      dateRangeEnd:   end,
      isMultiDay:     true,
      // defaultStartTime/defaultEndTime يُستخدمان في multi-day mode
      defaultStartTime: '09:00',
      defaultEndTime:   '18:00',
    });

  } else if (date) {
    const day = parseISO(date);
    if (!isValid(day)) return;

    // يوم واحد: startTime و endTime بتاريخ ذلك اليوم
    const startDt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0, 0);
    const endDt   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18, 0, 0, 0);

    updateFormData({
      dateRangeStart: day,
      dateRangeEnd:   day,
      isMultiDay:     false,
      startTime:      startDt.toISOString(),
      endTime:        endDt.toISOString(),
    });
  }

  // مرة واحدة فقط عند mount — لا نضع searchParams في deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
    const clearDraft = useCallback(() => {
        localStorage.removeItem(WIZARD_DRAFT_KEY);
        localStorage.removeItem(WIZARD_STEP_KEY);
    }, []);

    const handleResetWizard = useCallback(() => {
        clearDraft();
        setFormData(getInitialFormData());
        setCurrentStep(1);
        setMaxStepReached(1);
        setDismissedLowReadiness(false);
        setOffersTransportFee(false);
        setTransportFeeCap('');
        toast.success(t('shifts.wizard.reset', { defaultValue: 'Formulaire réinitialisé' }));
    }, [clearDraft, t]);


    const { data: establishmentJobRate } = useQuery({
    queryKey: ['establishment-job-rate', formData.establishmentId, formData.jobPositionId],
    queryFn: async () => {
        if (!formData.establishmentId || !formData.jobPositionId) return null;
        const { data, error } = await supabase
            .from('establishment_job_rates')
            .select('min_rate, max_rate')
            .eq('establishment_id', formData.establishmentId)
            .eq('job_position_id', formData.jobPositionId)
            .maybeSingle();

        if (error) {
            logger.error('Error fetching establishment job rate:', error);
            return null;
        }
        return data;
    },
    enabled: !!formData.establishmentId && !!formData.jobPositionId,
});
    const { data: establishments = [] } = useQuery({
        queryKey: ['establishments-with-address', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const { data, error } = await supabase
                .from('establishments')
                // ✅ إضافة timezone — ضرورية للتحويل الصحيح عند الإرسال (انظر الـ mutations أدناه)
                // auto_accept_applications — يُستخدم لتعبئة القيمة الافتراضية لكل شفت جديد (انظر الـ useEffect أدناه)
                .select('id, name, address, city, postal_code, timezone, auto_accept_applications')
                .eq('company_id', company.id)
                .eq('status', 'active')
                .order('name');

            if (error) throw new Error(handleSupabaseError(error, { context: 'CreateShiftPage', operation: 'query' }));
            return data as unknown as Establishment[];
        },
        enabled: !!company?.id,
    });

    // Pre-fill (and reset) the shift-level auto-accept override whenever the
    // establishment selection changes, using its default as the starting point.
    useEffect(() => {
        if (!formData.establishmentId) return;
        const est = establishments.find((e) => e.id === formData.establishmentId);
        if (est) {
            updateFormData({ autoAcceptApplications: est.auto_accept_applications });
        }
    }, [formData.establishmentId, establishments, updateFormData]);

    const { data: categories = [] } = useQuery({
        queryKey: ['establishment-categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('establishment_categories')
                .select('*')
                .eq('active', true)
                .order('display_order', { ascending: true });

            if (error) throw new Error(handleSupabaseError(error, { context: 'CreateShiftPage', operation: 'query' }));
            return data as unknown as EstablishmentCategory[];
        },
    });

    const { data: jobPositions = [] } = useQuery({
        queryKey: ['job-positions-all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_positions')
                .select('*')
                .eq('active', true)
                .order('display_order', { ascending: true });

            if (error) throw new Error(handleSupabaseError(error, { context: 'CreateShiftPage', operation: 'query' }));
            return data as unknown as JobPosition[];
        },
    });

    const { data: shiftsThisPeriod = 0 } = useQuery({
        queryKey: ['shifts-count-billing-period', company?.id, formData.establishmentId, company?.subscription_plan, company?.subscription_current_period_start],
        queryFn: async () => {
            if (!company?.id) return 0;
            const billingPeriod = getBillingPeriod(company);
            let query = supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('targets_employees', true).gte('created_at', billingPeriod.start).lte('created_at', billingPeriod.end);
            const hasUnlimitedShifts = company.subscription_plan === SubscriptionPlanEnum.STARTER || company.subscription_plan === SubscriptionPlanEnum.PRO;
            if (hasUnlimitedShifts && formData.establishmentId) query = query.eq('establishment_id', formData.establishmentId);
            const { count } = await query;
            return count || 0;
        },
        enabled: !!company?.id,
    });

    const { data: employees = [], isLoading: loadingEmployees, error: employeesError } = useQuery({
        queryKey: ['employees', company?.id, formData.establishmentId],
        queryFn: async () => {
            if (!company?.id) return [];
            // avatar_url + hourly_rate — l'employé les définit lui-même sur son compte ;
            // affichés dans RecipientsStep pour que le client voie sa photo et son tarif
            // avant de l'inviter (l'invitation vaut acceptation de son tarif).
            let query = supabase.from('employees').select('*, user:users(email, first_name, last_name, avatar_url)').eq('company_id', company.id).eq('active', true);
            if (formData.establishmentId) query = query.or(`establishment_id.eq.${formData.establishmentId},establishment_id.is.null`);
            const { data, error } = await query;
            if (error) throw new Error(handleSupabaseError(error, { context: 'CreateShiftPage', operation: 'query' }));
            return (data || []) as Employee[];
        },
        enabled: !!formData.establishmentId && !!company?.id,
    });

    // ─────────────────────────────────────────────────────────────
    // 📊 Statistiques par employé, à l'échelle de la company (toutes
    // établissements confondus) — demandées pour que le client voie,
    // avant de choisir un employé : combien de shifts il a déjà faits
    // (accepted) et combien de fois il s'est désisté (withdrawn) avec
    // cette entreprise. On requête shift_applications jointes à shifts
    // (company_id) plutôt que de filtrer par establishment_id, pour
    // couvrir tout l'historique avec la company, pas juste cet
    // établissement précis.
    // ─────────────────────────────────────────────────────────────
    const employeeUserIds = useMemo(
        () => (employees as Employee[]).map((e) => e.user_id).filter(Boolean),
        [employees]
    );

    const { data: employeeStatsMap = {} } = useQuery({
        queryKey: ['employee-shift-stats', company?.id, employeeUserIds],
        queryFn: async () => {
            if (!company?.id || employeeUserIds.length === 0) return {};

            const { data, error } = await supabase
                .from('shift_applications')
                .select('user_id, status, shift:shifts!inner(company_id)')
                .eq('shift.company_id', company.id)
                .in('user_id', employeeUserIds);

            if (error) {
                logger.error('Error fetching employee shift stats:', error);
                return {};
            }

            const map: Record<string, { completed: number; withdrawn: number }> = {};
            for (const uid of employeeUserIds) map[uid] = { completed: 0, withdrawn: 0 };

            for (const row of (data || []) as Array<{ user_id: string; status: string | null }>) {
                if (!map[row.user_id]) map[row.user_id] = { completed: 0, withdrawn: 0 };
                if (row.status === 'accepted') map[row.user_id].completed += 1;
                else if (row.status === 'withdrawn') map[row.user_id].withdrawn += 1;
            }

            return map;
        },
        enabled: !!company?.id && employeeUserIds.length > 0,
    });

    const hasUnlimitedShifts = company?.subscription_plan === SubscriptionPlanEnum.STARTER || company?.subscription_plan === SubscriptionPlanEnum.PRO;
    const hasSelectedEmployees = formData.selectedEmployees.length > 0;
    // Shift limits only apply to employee-targeted shifts — freelancer-only shifts are always unlimited
    const limitCheck = company && company.subscription_plan && hasSelectedEmployees ? (hasUnlimitedShifts && !formData.establishmentId ? null : canCreateShift(shiftsThisPeriod, company.subscription_plan, formData.establishmentId)) : null;
    const canCreate = hasSelectedEmployees ? (limitCheck?.allowed ?? (hasUnlimitedShifts ? true : false)) : true;

    const uploadFile = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${company?.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('shift-attachments').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('shift-attachments').getPublicUrl(filePath);
        return data.publicUrl;
    };

    // ─────────────────────────────────────────────────────────────
    // 💰 Tarif horaire obligatoire pour TOUT shift, employés ou
    // freelances — plus seulement les freelances. Un shift ne peut
    // plus être publié sans un freelance_hourly_rate valide (> 0).
    // ─────────────────────────────────────────────────────────────
    function assertHourlyRateProvided() {
        if (!formData.freelanceHourlyRate || parseFloat(formData.freelanceHourlyRate) <= 0) {
            throw new Error(t('shifts.hourlyRateRequired', {
                defaultValue: "Le taux horaire est obligatoire pour publier un shift, qu'il soit destiné aux employés ou aux freelances."
            }));
        }
    }

    // Colonnes shifts.offers_transport_fee / transport_fee_cap. Seuls les freelances réclament des frais de
    // déplacement : un shift réservé aux employés ne les propose jamais, même si la case était cochée avant.
    const transportFeeFields = (publishedToFreelancers: boolean) => {
        const enabled = publishedToFreelancers && offersTransportFee;
        const cap = parseFloat(transportFeeCap.replace(',', '.'));
        return {
            offers_transport_fee: enabled,
            transport_fee_cap: enabled && !isNaN(cap) && cap > 0 ? cap : null,
        };
    };

    const createShiftMutation = useMutation({
        mutationFn: async () => {
        if (!company?.id) throw new Error('Company ID not found');
        const hasEmployees = formData.selectedEmployees.length > 0;
        const willPublishToFreelancers = formData.publishToFreelancers || formData.autoPublishToFreelancers;
        if (!hasEmployees && !willPublishToFreelancers) throw new Error(t('shifts.selectRecipientError'));
        // ⛔ Aucun shift ne peut être publié sans taux horaire — employés ET freelances
        assertHourlyRateProvided();
        if (!canCreate && limitCheck?.message) throw new Error(limitCheck.message);

         if (willPublishToFreelancers && formData.establishmentId && formData.jobPositionId) {
            const { data: rateLimit } = await supabase
                .from('establishment_job_rates')
                .select('min_rate, max_rate')
                .eq('establishment_id', formData.establishmentId)
                .eq('job_position_id', formData.jobPositionId)
                .maybeSingle();

            if (rateLimit) {
                const enteredRate = parseFloat(formData.freelanceHourlyRate);
                if (enteredRate < rateLimit.min_rate || enteredRate > rateLimit.max_rate) {
                    throw new Error(t('shifts.freelancers.rateOutOfRange', {
                        min: rateLimit.min_rate,
                        max: rateLimit.max_rate,
                        defaultValue: `Le taux horaire doit être entre ${rateLimit.min_rate}€ et ${rateLimit.max_rate}€`
                    }));
                }
            }
        }

        // ✅ التصحيح الوحيد المطلوب هنا: formData.startTime/endTime بُنيا في DateTimeStep
        // عبر .setHours() ثم .toISOString() — أي بتوقيت جهاز المتصفح، مو establishment.
        // بما إن establishmentId غير معروف وقت DateTimeStep (step1 قبل step2)، نُبقي
        // العرض/الحسابات الداخلية للويزارد كما هي (فروقات نسبية، لا تتأثر)، ونعيد بناء
        // start_time/end_time الصحيحين هنا فقط — نفس الأرقام (سنة/شهر/يوم/ساعة/دقيقة)
        // التي اختارها المستخدم، محوّلة عبر establishment.timezone الفعلي.
        const establishment = establishments.find(e => e.id === formData.establishmentId);
        const timezone = establishment?.timezone || 'Europe/Paris';
        const correctedStartUTC = localDateTimeToUTC(toLocalDateTimeString(new Date(formData.startTime)), timezone)!;
        const correctedEndUTC = localDateTimeToUTC(toLocalDateTimeString(new Date(formData.endTime)), timezone)!;

        // Validate start time is in the future
        const shiftStart = new Date(correctedStartUTC);
        if (shiftStart <= new Date()) throw new Error(t('shifts.startTimeInPast', { defaultValue: 'L\'heure de début du shift doit être dans le futur' }));

            let attachmentUrl = null;
            if (formData.privateAttachmentFile) attachmentUrl = await uploadFile(formData.privateAttachmentFile);

            const shiftData = {
                company_id: company.id, establishment_id: formData.establishmentId, position_name: formData.positionName, job_position_id: formData.jobPositionId,
                start_time: correctedStartUTC, end_time: correctedEndUTC, break_duration_minutes: formData.breakDurationMinutes || 0,
                address: formData.shiftAddress || null, description: formData.description || null, private_note: formData.privateNote || null,
                private_attachment_url: attachmentUrl, status: 'pending' as const, targets_employees: hasEmployees, published_to_freelancers: formData.publishToFreelancers,
                published_to_freelancers_at: formData.publishToFreelancers ? new Date().toISOString() : null,
                auto_publish_to_freelancers: formData.autoPublishToFreelancers, auto_publish_delay_minutes: formData.autoPublishToFreelancers ? formData.autoPublishDelayMinutes : null,
                auto_accept_favorite_freelancers: formData.autoAcceptFavorites,
                auto_accept_applications: formData.autoAcceptApplications,
                platform_fee_rate: company.platform_fee_rate,
                // Tarif horaire unique du shift — obligatoire désormais pour tout shift
                // (employés ET freelances) : voir assertHourlyRateProvided() plus haut.
                freelance_hourly_rate: parseFloat(formData.freelanceHourlyRate),
                required_languages: formData.requiredLanguages.length > 0 ? formData.requiredLanguages : null,
                ...transportFeeFields(willPublishToFreelancers),
            };

            const { data: shift, error: shiftError } = await supabase.from('shifts').insert(shiftData).select().single();
            if (shiftError) throw shiftError;

            // Save required PMS/POS for this shift
            if (formData.requiredPmsIds && formData.requiredPmsIds.length > 0) {
                const pmsRows = formData.requiredPmsIds.map((pmsId) => ({ shift_id: shift.id, pms_id: pmsId }));
                await (supabase as any).from('shift_required_pms').insert(pmsRows);
            }

            if (hasEmployees) {
                const { data: selectedEmps } = await supabase.from('employees').select('user_id').in('id', formData.selectedEmployees);
                if (selectedEmps && selectedEmps.length > 0) {
                    const applications = selectedEmps.map((emp) => ({ shift_id: shift.id, user_id: emp.user_id, status: 'pending' as const }));
                    await supabase.from('shift_applications').insert(applications);

                    // Notify employees directly — don't rely on DB trigger (hardcoded URL mismatch dev/prod)
                    const userIds = selectedEmps.map((emp) => emp.user_id);
                    supabase.functions.invoke('send-push-notification', {
                        body: { shiftId: shift.id, userIds }
                    }).catch((err) => {
                        logger.error('Failed to notify employees (new shift):', err instanceof Error ? err : String(err))
                    });
                }
            }
            // Notify freelancers directly — don't rely on DB trigger (app.settings.* not configurable in Supabase prod)
            if (formData.publishToFreelancers) {
                const establishmentInfo = establishments.find(e => e.id === formData.establishmentId);
                supabase.functions.invoke('send-freelancer-shift-available', {
                    body: {
                        shift_id: shift.id,
                        position_name: formData.positionName,
                        // ✅ نستعمل shift.start_time/end_time المُرجَعين من DB (نفس القيم المصحَّحة)
                        // بدل formData.startTime/endTime الخام — لتفادي إرسال الوقت الخاطئ في الإشعار
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        establishment_name: establishmentInfo?.name || '',
                        establishment_city: establishmentInfo?.city || '',
                    }
                }).catch((err) => {
                    logger.error('Failed to notify freelancers (shift available):', err instanceof Error ? err : String(err))
                });
            }
            return shift;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            clearDraft();
            toast.success(t('shifts.createSuccess', { defaultValue: 'Shift créé avec succès' }));
            navigate('/shifts');
        },
        onError: (error: Error) => toast.error(error.message, { duration: 5000 }),
    });

    const createMultiDayShiftsMutation = useMutation({
        mutationFn: async () => {
            if (!company?.id) throw new Error('Company ID not found');
            if (!formData.dateRangeStart || !formData.dateRangeEnd) throw new Error('Date range not selected');
            const hasEmployees = formData.selectedEmployees.length > 0;
            const willPublishToFreelancers = formData.publishToFreelancers || formData.autoPublishToFreelancers;
            if (!hasEmployees && !willPublishToFreelancers) throw new Error(t('shifts.selectRecipientError'));
            // ⛔ Aucun shift ne peut être publié sans taux horaire — employés ET freelances
            assertHourlyRateProvided();

            // ✅ timezone الموحّدة لكل أيام هذا الـ batch — نفس establishment للجميع
            const establishment = establishments.find(e => e.id === formData.establishmentId);
            const timezone = establishment?.timezone || 'Europe/Paris';

            let attachmentUrl = null;
            if (formData.privateAttachmentFile) attachmentUrl = await uploadFile(formData.privateAttachmentFile);

            const includedDays: Date[] = [];
            const current = new Date(formData.dateRangeStart);
            while (current <= formData.dateRangeEnd) {
                const isoKey = current.toISOString().split('T')[0];
                if (!formData.excludedDays.has(isoKey)) includedDays.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
            if (includedDays.length === 0) throw new Error(t('shifts.noDaysSelected', { defaultValue: 'Veuillez sélectionner au moins une date' }));

            // Filter out days whose start time is already in the past
            // ✅ نستعمل localDateTimeToUTC هنا بردو (بدل بناء Date بتوقيت المتصفح ثم مقارنته)
            // عشان نقارن اللحظة الصحيحة الفعلية بتوقيت establishment
            const now = new Date();
            const futureDays = includedDays.filter((day) => {
                const isoKey = day.toISOString().split('T')[0];
                const exception = formData.shiftExceptions.get(isoKey);
                const st = exception?.startTime || formData.defaultStartTime;
                const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                const correctedUTC = localDateTimeToUTC(`${dateStr}T${st}`, timezone)!;
                return new Date(correctedUTC) > now;
            });
            if (futureDays.length === 0) throw new Error(t('shifts.startTimeInPast', { defaultValue: 'L\'heure de début du shift doit être dans le futur' }));

            // Generate a shared event_id when publishing as a complete event
            const eventId = formData.publishMode === 'event' ? crypto.randomUUID() : null;

            // Resolve employee.id → user_id once for shift_applications + push notifications
            let employeeUserIds: string[] = [];
            if (formData.selectedEmployees.length > 0) {
                const { data: selectedEmps } = await supabase
                    .from('employees')
                    .select('user_id')
                    .in('id', formData.selectedEmployees);
                employeeUserIds = (selectedEmps || []).map((emp) => emp.user_id);
            }

            const results = await Promise.allSettled(futureDays.map(async (day) => {
                const isoKey = day.toISOString().split('T')[0];
                const exception = formData.shiftExceptions.get(isoKey);
                const startTime = exception?.startTime || formData.defaultStartTime;
                const endTime = exception?.endTime || formData.defaultEndTime;
                const breakMins = exception?.breakMinutes ?? formData.defaultBreakMinutes;
                const reqEmployees = exception?.requiredEmployees ?? formData.defaultRequiredEmployees;
                const hourlyRate = exception?.hourlyRate || formData.freelanceHourlyRate;

                const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

                // ✅ بدل بناء Date بتوقيت المتصفح (new Date(y,m,d,h,min)) ثم .toISOString() —
                // الآن تحويل صريح عبر establishment.timezone لكل يوم من أيام الـ batch
                const correctedStartUTC = localDateTimeToUTC(`${dateStr}T${startTime}`, timezone)!;
                const correctedEndUTC = localDateTimeToUTC(`${dateStr}T${endTime}`, timezone)!;

                const shiftData = {
                    company_id: company.id, establishment_id: formData.establishmentId, position_name: formData.positionName,
                    job_position_id: formData.jobPositionId,
                    start_time: correctedStartUTC, end_time: correctedEndUTC, break_duration_minutes: breakMins,
                    required_employees: reqEmployees, address: formData.shiftAddress || '', description: formData.description || null,
                    private_note: formData.privateNote || null, private_attachment_url: attachmentUrl,
                    targets_employees: hasEmployees, published_to_freelancers: willPublishToFreelancers, auto_publish_to_freelancers: formData.autoPublishToFreelancers,
                    auto_publish_delay_minutes: formData.autoPublishToFreelancers ? formData.autoPublishDelayMinutes : null,
                    auto_accept_favorite_freelancers: formData.autoAcceptFavorites,
                    auto_accept_applications: formData.autoAcceptApplications,
                    platform_fee_rate: company.platform_fee_rate,
                    // Tarif horaire unique du shift — obligatoire désormais (voir
                    // assertHourlyRateProvided() plus haut, appelé avant la boucle).
                    freelance_hourly_rate: parseFloat(hourlyRate),
                    event_id: eventId,
                    required_languages: formData.requiredLanguages.length > 0 ? formData.requiredLanguages : null,
                    ...transportFeeFields(willPublishToFreelancers),
                };

                const { data: shift, error: shiftError } = await supabase.from('shifts').insert(shiftData).select().single();
                if (shiftError) throw shiftError;

                // Save required PMS/POS for this shift
                if (formData.requiredPmsIds && formData.requiredPmsIds.length > 0) {
                    const pmsRows = formData.requiredPmsIds.map((pmsId) => ({ shift_id: shift.id, pms_id: pmsId }));
                    await (supabase as any).from('shift_required_pms').insert(pmsRows);
                }

                if (employeeUserIds.length > 0) {
                    const applications = employeeUserIds.map((userId) => ({ shift_id: shift.id, user_id: userId, status: 'pending' as const }));
                    await supabase.from('shift_applications').insert(applications);
                }
                return shift;
            }));

            // Notify employees — one notification per shift for all selected employees
            if (employeeUserIds.length > 0) {
                const succeededShiftsForNotif = results
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value);

                for (const shift of succeededShiftsForNotif) {
                    supabase.functions.invoke('send-push-notification', {
                        body: { shiftId: shift.id, userIds: employeeUserIds }
                    }).catch((err) => {
                        logger.error('Failed to notify employees (multi-day shift):', err instanceof Error ? err : String(err))
                    });
                }
            }

            // Notify freelancers — one notification per shift (separate) or one for the whole event
            if (formData.publishToFreelancers) {
                const establishmentInfo = establishments.find(e => e.id === formData.establishmentId);
                const succeededShifts = results
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value);

                if (formData.publishMode === 'event' && succeededShifts.length > 0) {
                    // Event mode: single notification for the first shift
                    const first = succeededShifts[0];
                    supabase.functions.invoke('send-freelancer-shift-available', {
                        body: {
                            shift_id: first.id,
                            position_name: formData.positionName,
                            start_time: first.start_time,
                            end_time: first.end_time,
                            establishment_name: establishmentInfo?.name || '',
                            establishment_city: establishmentInfo?.city || '',
                            event_days: succeededShifts.length,
                        }
                    }).catch((err) => {
                        logger.error('Failed to notify freelancers (event shift available):', err instanceof Error ? err : String(err))
                    });
                } else {
                    // Separate mode: one notification per shift
                    for (const shift of succeededShifts) {
                        supabase.functions.invoke('send-freelancer-shift-available', {
                            body: {
                                shift_id: shift.id,
                                position_name: formData.positionName,
                                start_time: shift.start_time,
                                end_time: shift.end_time,
                                establishment_name: establishmentInfo?.name || '',
                                establishment_city: establishmentInfo?.city || '',
                            }
                        }).catch((err) => {
                            logger.error('Failed to notify freelancers (multi-day shift available):', err instanceof Error ? err : String(err))
                        });
                    }
                }
            }

            const succeeded = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;
            if (succeeded === 0 && failed > 0) {
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    const reason = firstError?.reason as { message?: string } | undefined
    throw new Error(reason?.message || t('shifts.createError'))
}
            return { succeeded, failed, total: results.length };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            clearDraft();
            if (data.failed > 0) toast.warning(`${data.succeeded}/${data.total} shifts créés avec succès`);
            else toast.success(`${data.succeeded} shifts créés avec succès`);
            navigate('/shifts');
        },
        onError: (error: Error) => toast.error(error.message || t('shifts.createError')),
    });

    const handleSubmit = useCallback(() => {
        if (formData.isMultiDay) createMultiDayShiftsMutation.mutate();
        else createShiftMutation.mutate();
    }, [formData.isMultiDay, createMultiDayShiftsMutation, createShiftMutation]);

    const isSubmitting = createShiftMutation.isPending || createMultiDayShiftsMutation.isPending;

    const limitMessage = useMemo(() => {
        if (!limitCheck?.message) return null;
        if (limitCheck.messageKey) {
            return t(limitCheck.messageKey, {
                ...limitCheck.messageParams,
                scope: limitCheck.messageParams?.scope ? t(`limits.scope.${limitCheck.messageParams.scope}`) : '',
                count: limitCheck.max,
            });
        }
        return limitCheck.message;
    }, [limitCheck, t]);

    return {
        t, currentLang, navigate, formData, currentStep, maxStepReached,
        dismissedLowReadiness, setDismissedLowReadiness, siretDocument, isSiretLoading,
        shiftReadinessScore, activeEmployeesCount, minimumEmployees, updateFormData,
        handleNext, handlePrevious, handleGoToStep, handleResetWizard,
        establishments, categories, jobPositions, employees, loadingEmployees, employeesError,
        canCreate, isSubmitting, handleSubmit, limitMessage, hasFreelanceStep, hasRateStep, company, establishmentJobRate,
        // 📊 إحصائيات الموظفين (عدد المهام المقبولة / الانسحابات) مع نفس الشركة
        employeeStatsMap,
        // 🚗 Frais de déplacement
        offersTransportFee, setOffersTransportFee, transportFeeCap, setTransportFeeCap,
    };
}