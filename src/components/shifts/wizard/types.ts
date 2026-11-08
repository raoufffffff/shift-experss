import { JobPosition } from '@shared/types';
import { DayShiftException } from '@/components/shifts/MultiDayShiftConfig';

// Re-export for convenience
export type { DayShiftException };

export interface WizardFormData {
    // Step 1: Date & Time
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
    isMultiDay: boolean;
    publishMode: 'event' | 'separate';
    // Single day time settings
    startTime: string;
    endTime: string;
    breakDurationMinutes: number;
    // Multi-day settings
    excludedDays: Set<string>;
    defaultStartTime: string;
    defaultEndTime: string;
    defaultBreakMinutes: number;
    defaultRequiredEmployees: number;
    shiftExceptions: Map<string, DayShiftException>;

    // Step 2: Location
    establishmentId: string;
    shiftAddress: string;

    // Step 3: Position & Details
    categoryId: string;
    positionName: string;
    jobPositionId: string;
    description: string;
    privateNote: string;
    privateAttachmentFile: File | null;
    requiredPmsIds: string[];
    requiredLanguages: string[];

    // Step 4: Recipients
    selectedEmployees: string[];
    publishToFreelancers: boolean;
    autoPublishToFreelancers: boolean;
    autoPublishDelayMinutes: number;
    autoAcceptFavorites: boolean;
    autoAcceptApplications: boolean;
    freelanceHourlyRate: string;
}

export interface StepProps {
    formData: WizardFormData;
    updateFormData: (updates: Partial<WizardFormData>) => void;
    onNext: () => void;
    onPrevious: () => void;
    isFirstStep?: boolean;
    isLastStep?: boolean;
}

export interface Establishment {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    auto_accept_applications: boolean;
}

export interface Employee {
    id: string;
    user_id: string;
    user?: {
        email: string;
        first_name: string | null;
        last_name: string | null;
        avatar_url?: string | null;
        hourly_rate?: number | null;
    };
}

export const WIZARD_STEPS = [
    { key: 'datetime', icon: 'CalendarDays', titleKey: 'shifts.wizard.step1Title' },
    { key: 'location', icon: 'MapPin', titleKey: 'shifts.wizard.step2Title' },
    { key: 'details', icon: 'FileText', titleKey: 'shifts.wizard.step3Title' },
    { key: 'recipients', icon: 'Users', titleKey: 'shifts.wizard.step4Title' },
    { key: 'summary', icon: 'CheckCircle', titleKey: 'shifts.wizard.step5Title' },
] as const;

export const getInitialFormData = (): WizardFormData => ({
    // Step 1
    dateRangeStart: null,
    dateRangeEnd: null,
    isMultiDay: false,
    publishMode: 'separate',
    startTime: '',
    endTime: '',
    breakDurationMinutes: 0,
    excludedDays: new Set(),
    defaultStartTime: '09:00',
    defaultEndTime: '18:00',
    defaultBreakMinutes: 0,
    defaultRequiredEmployees: 1,
    shiftExceptions: new Map(),

    // Step 2
    establishmentId: '',
    shiftAddress: '',

    // Step 3
    categoryId: '',
    positionName: '',
    jobPositionId: '',
    description: '',
    privateNote: '',
    privateAttachmentFile: null,
    requiredPmsIds: [],
    requiredLanguages: [],

    // Step 4
    selectedEmployees: [],
    publishToFreelancers: false,
    autoPublishToFreelancers: false,
    autoPublishDelayMinutes: 30,
    autoAcceptFavorites: false,
    autoAcceptApplications: false,
    freelanceHourlyRate: '',
});

// Storage key for draft persistence
export const WIZARD_DRAFT_KEY = 'shift_wizard_draft';
export const WIZARD_STEP_KEY = 'shift_wizard_step';
export const WIZARD_DRAFT_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Serialize form data for localStorage (handles Set, Map, Date)
export const serializeFormData = (data: WizardFormData): string => {
    return JSON.stringify({
        ...data,
        dateRangeStart: data.dateRangeStart?.toISOString() || null,
        dateRangeEnd: data.dateRangeEnd?.toISOString() || null,
        excludedDays: Array.from(data.excludedDays),
        shiftExceptions: Array.from(data.shiftExceptions.entries()).map(([key, val]) => [
            key,
            { ...val, date: val.date.toISOString() }
        ]),
        // Don't persist file - can't serialize
        privateAttachmentFile: null,
        // Add timestamp for expiration check
        _savedAt: Date.now(),
    });
};

// Deserialize form data from localStorage
export const deserializeFormData = (json: string): WizardFormData | null => {
    try {
        const parsed = JSON.parse(json);

        // Check if draft has expired (10 minutes)
        if (parsed._savedAt && Date.now() - parsed._savedAt > WIZARD_DRAFT_EXPIRY_MS) {
            return null; // Draft expired
        }

        return {
            ...parsed,
            dateRangeStart: parsed.dateRangeStart ? new Date(parsed.dateRangeStart) : null,
            dateRangeEnd: parsed.dateRangeEnd ? new Date(parsed.dateRangeEnd) : null,
            excludedDays: new Set(parsed.excludedDays || []),
            shiftExceptions: new Map(
                (parsed.shiftExceptions || []).map(([key, val]: [string, Record<string, unknown>]) => [
                    key,
                    { ...val, date: new Date(val.date as string) }
                ])
            ),
            privateAttachmentFile: null, // Can't restore file
        };
    } catch {
        return null;
    }
};