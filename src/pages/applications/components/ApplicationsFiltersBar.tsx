import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover'
import { Chip } from '@/components/ui/Chip'
import { Search, ChevronDown, Check, CalendarDays } from 'lucide-react'

interface ShiftOption {
    id: string
    public_id: string | null
    position_name: string | null
    start_time: string
    end_time: string
    establishments: { name: string } | null
}

interface ApplicationsFiltersBarProps {
    searchQuery: string
    onSearchChange: (value: string) => void
    selectedShiftId: string
    onShiftChange: (value: string) => void
    shifts: ShiftOption[]
    selectedStatus: string
    onStatusChange: (value: string) => void
    selectedType: string
    onTypeChange: (value: string) => void
    sortBy: string
    onSortChange: (value: string) => void
}

function extractTime(isoString: string): string {
    if (!isoString) return '--:--'
    const match = isoString.match(/T(\d{2}:\d{2})/)
    if (match) return match[1]
    try {
        return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return '--:--'
    }
}

function extractDate(isoString: string): string {
    if (!isoString) return '--/--'
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[3]}/${match[2]}`
    try {
        return new Date(isoString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    } catch {
        return '--/--'
    }
}

export function ApplicationsFiltersBar({
    searchQuery,
    onSearchChange,
    selectedShiftId,
    onShiftChange,
    shifts,
    selectedStatus,
    onStatusChange,
    selectedType,
    onTypeChange,
    sortBy,
    onSortChange,
}: ApplicationsFiltersBarProps) {
    const { t } = useTranslation()
    const [shiftPopoverOpen, setShiftPopoverOpen] = useState(false)

    const isEmployeeOnly = selectedType === 'employee'
    const selectedShift = shifts.find((s) => s.id === selectedShiftId)

    return (
        <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
                {/* Row 1: Search + Shift + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                        icon={<Search className="w-4 h-4" />}
                        placeholder={t('applications.filters.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />

                    {/* Custom shift dropdown with badge styling */}
                    <Popover open={shiftPopoverOpen} onOpenChange={setShiftPopoverOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                {selectedShift ? (
                                    <span className="flex items-center gap-2 truncate">
                                        <Chip variant="default" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                                            {selectedShift.public_id || selectedShift.id.substring(0, 8)}
                                        </Chip>
                                        <span className="truncate text-xs">
                                            {selectedShift.position_name || '—'}
                                        </span>
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">
                                        {t('applications.filters.allShifts', { defaultValue: 'Tous les shifts' })}
                                    </span>
                                )}
                                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[400px] p-0 max-h-[300px] overflow-y-auto">
                            {/* Option: All shifts */}
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/50 border-b border-border/50"
                                onClick={() => { onShiftChange(''); setShiftPopoverOpen(false) }}
                            >
                                <span className={`w-4 h-4 flex items-center justify-center shrink-0 ${!selectedShiftId ? 'text-primary' : 'text-transparent'}`}>
                                    <Check className="w-3.5 h-3.5" />
                                </span>
                                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="font-medium">{t('applications.filters.allShifts', { defaultValue: 'Tous les shifts' })}</span>
                            </button>

                            {/* Shift options */}
                            {shifts.map((shift) => {
                                const isSelected = selectedShiftId === shift.id
                                const id = shift.public_id || shift.id.substring(0, 8)
                                const date = extractDate(shift.start_time)
                                const startH = extractTime(shift.start_time)
                                const endH = extractTime(shift.end_time)

                                return (
                                    <button
                                        key={shift.id}
                                        type="button"
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}
                                        onClick={() => { onShiftChange(shift.id); setShiftPopoverOpen(false) }}
                                    >
                                        <span className={`w-4 h-4 flex items-center justify-center shrink-0 ${isSelected ? 'text-primary' : 'text-transparent'}`}>
                                            <Check className="w-3.5 h-3.5" />
                                        </span>
                                        <Chip variant="secondary" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                                            {id}
                                        </Chip>
                                        <span className="truncate">{shift.position_name || '—'}</span>
                                        <span className="text-muted-foreground text-xs ml-auto shrink-0">
                                            {date} · {startH}-{endH}
                                        </span>
                                    </button>
                                )
                            })}

                            {shifts.length === 0 && (
                                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                    {t('common.noResults', { defaultValue: 'Aucun shift' })}
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    <Select
                        value={selectedStatus}
                        onChange={(e) => onStatusChange(e.target.value)}
                        options={[
                            { value: '', label: t('applications.filters.allStatuses') },
                            { value: 'pending', label: t('applications.status.pending') },
                            { value: 'accepted', label: t('applications.status.accepted') },
                        ]}
                    />
                </div>

                {/* Row 2: Type + Sort */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        value={selectedType}
                        onChange={(e) => onTypeChange(e.target.value)}
                        options={[
                            { value: '', label: t('applications.filters.allTypes', { defaultValue: 'Tous les candidats' }) },
                            { value: 'employee', label: t('applications.filters.employees', { defaultValue: 'Employés' }) },
                            { value: 'freelancer', label: t('applications.filters.freelancers', { defaultValue: 'Freelances' }) },
                        ]}
                    />

                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="date">{t('applications.sort.date', { defaultValue: 'Trier par date' })}</option>
                        <option value="name">{t('applications.sort.name', { defaultValue: 'Trier par nom' })}</option>
                        <option value="compatibility" disabled={isEmployeeOnly}>
                            {t('applications.sort.compatibility', { defaultValue: 'Trier par compatibilité' })}{isEmployeeOnly ? ' (freelances uniquement)' : ''}
                        </option>
                        <option value="rating" disabled={isEmployeeOnly}>
                            {t('applications.sort.rating', { defaultValue: 'Trier par note' })}{isEmployeeOnly ? ' (freelances uniquement)' : ''}
                        </option>
                    </select>
                </div>
            </CardContent>
        </Card>
    )
}
