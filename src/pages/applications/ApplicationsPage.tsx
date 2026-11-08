import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Users, RefreshCw, Loader2, History, ChevronDown, ChevronLeft, ChevronRight, CalendarRange, UserCheck, UserX, Briefcase, MapPin, Calendar, Clock, Eye, Banknote, Star } from 'lucide-react'
import { format } from 'date-fns'
import { formatTimeUTC } from '@/utils/formatTime'
import { useLocale } from '@/hooks/useLocale'
import { useApplicationsData } from './hooks/useApplicationsData'
import { ApplicationStatsCards } from './components/ApplicationStatsCards'
import { ApplicationsFiltersBar } from './components/ApplicationsFiltersBar'
import { ApplicationCard } from './components/ApplicationCard'
import { ApplicationDetailModal } from './components/ApplicationDetailModal'
import { FreelancerProfilePanel } from '@/components/shifts/applicants/FreelancerProfilePanel'
 
export function ApplicationsPage() {
    const { t } = useTranslation()
    const { navigate } = useLocale()
    const [viewingFreelancerId, setViewingFreelancerId] = useState<string | null>(null)
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 5

    const toggleEvent = (key: string) => {
        setExpandedEvents(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const {
        // Data
        shifts,
        allApplications,
        displayItems,
        stats,
        isLoading,

        // Filters
        searchQuery,
        setSearchQuery,
        selectedShiftId,
        setSelectedShiftId,
        selectedStatus,
        setSelectedStatus,
        selectedType,
        setSelectedType,
        sortBy,
        setSortBy,

        // Selected application (modal)
        selectedApplication,
        setSelectedApplication,

        // Confirm dialog
        confirmDialog,
        setConfirmDialog,

        // Mutation
        updateStatusMutation,

        // Actions
        handleRefresh,
        handleAccept,
        handleReject,
        handleAcceptAll,
        handleRejectAll,
        handleConfirm,
        handleRequestAttestation,

        // Locale helper
        getDateFnsLocale,

        // i18n
        i18n,
    } = useApplicationsData()

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedShiftId, selectedStatus, selectedType, sortBy])

    // Pagination
    const totalPages = Math.max(1, Math.ceil(displayItems.length / ITEMS_PER_PAGE))
    const paginatedItems = displayItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('applications.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('applications.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/applications/history')}
                    >
                        <History className="w-4 h-4 mr-2" />
                        {t('applications.history')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                        {t('applications.refresh')}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <ApplicationStatsCards stats={stats} selectedStatus={selectedStatus} onStatusClick={(status) => setSelectedStatus(selectedStatus === status ? '' : status)} />

            {/* Filters */}
            <ApplicationsFiltersBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedShiftId={selectedShiftId}
                onShiftChange={setSelectedShiftId}
                shifts={shifts || []}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                selectedType={selectedType}
                onTypeChange={setSelectedType}
                sortBy={sortBy}
                onSortChange={setSortBy}
            />

            {/* Applications List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : paginatedItems.length === 0 ? (
                <Card className="border-border/60">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                            <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {t('applications.empty.title')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t('applications.empty.description')}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {paginatedItems.map((item) => {
                        if (item.type === 'single') {
                            return (
                                <ApplicationCard
                                    key={`${item.app.type}-${item.app.id}`}
                                    app={item.app}
                                    onSelect={setSelectedApplication}
                                    onAccept={handleAccept}
                                    onReject={handleReject}
                                    onRequestAttestation={handleRequestAttestation}
                                    onViewProfile={setViewingFreelancerId}
                                    isMutating={updateStatusMutation.isPending}
                                    getDateFnsLocale={getDateFnsLocale}
                                    language={i18n.language}
                                />
                            )
                        }

                        // Event group
                        const groupKey = `${item.candidateId}__${item.eventId}`
                        const isExpanded = expandedEvents.has(groupKey)
                        const firstApp = item.apps[0]
                        const lastApp = item.apps[item.apps.length - 1]
                        const candidateName = firstApp.type === 'employee'
                            ? `${firstApp.user?.first_name || ''} ${firstApp.user?.last_name || ''}`
                            : firstApp.freelancer?.full_name || `${firstApp.freelancer?.first_name || ''} ${firstApp.freelancer?.last_name || ''}`
                        const photoUrl = firstApp.type === 'freelancer' ? firstApp.freelancer?.profile_photo_url : null
                        const city = firstApp.type === 'freelancer' ? firstApp.freelancer?.city : null
                        const rating = firstApp.freelancer_rating
                        const allPending = item.apps.every(a => a.status === 'pending' || a.status === 'applied')
                        const hourlyRate = firstApp.type === 'employee'
                            ? firstApp.user?.employee?.verified_hourly_rate
                            : firstApp.shift?.freelance_hourly_rate
                        const totalQuote = item.apps.reduce((sum, app) => {
                            const rate = app.type === 'employee'
                                ? app.user?.employee?.verified_hourly_rate
                                : app.shift?.freelance_hourly_rate
                            if (!rate || !app.shift?.start_time || !app.shift?.end_time) return sum
                            const dur = (new Date(app.shift.end_time).getTime() - new Date(app.shift.start_time).getTime()) / (1000 * 60 * 60)
                            return sum + Math.max(0, dur) * rate
                        }, 0)
                        const currencyFmt = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' })

                        return (
                            <div key={groupKey}>
                                {/* Event group header — same structure as CRM ShiftsPage */}
                                <div
                                    className="cursor-pointer"
                                    onClick={() => toggleEvent(groupKey)}
                                >
                                    <div className="flex gap-4 p-4 bg-card border border-indigo-200 dark:border-indigo-800 rounded-2xl hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300">
                                        <div className="flex-1 min-w-0 space-y-2">
                                            {/* Row 1: Badges + hourly rate */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                                                    <CalendarRange className="w-3 h-3" />
                                                    {t('shifts.event', { defaultValue: 'Événement' })}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                                                    firstApp.type === 'employee'
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                                )}>
                                                    {firstApp.type === 'employee' ? t('common.employee') : t('common.freelancer')}
                                                </span>
                                                {allPending && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        <Clock className="w-3 h-3" />
                                                        {t('applications.status.pending')}
                                                    </span>
                                                )}
                                                {hourlyRate && (
                                                    <span className="ml-auto text-base font-bold text-primary">
                                                        {currencyFmt.format(hourlyRate)}<span className="text-xs font-normal text-muted-foreground">/h</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Row 2: Avatar + Name + Rating */}
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase shrink-0 ring-2 ring-transparent hover:ring-primary/20 transition-all",
                                                    firstApp.type === 'employee' ? "bg-blue-500" : "bg-purple-500"
                                                )}>
                                                    {photoUrl ? (
                                                        <img src={photoUrl} alt={candidateName} loading="lazy" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        candidateName.substring(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3
                                                        className={cn(
                                                            "text-base font-semibold text-foreground truncate transition-colors",
                                                            firstApp.type === 'freelancer' && "hover:text-primary hover:underline cursor-pointer"
                                                        )}
                                                        onClick={(e) => {
                                                            if (firstApp.type === 'freelancer' && firstApp.freelancer_id) {
                                                                e.stopPropagation()
                                                                setViewingFreelancerId(firstApp.freelancer_id)
                                                            }
                                                        }}
                                                    >
                                                        {candidateName}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {firstApp.type === 'freelancer' && (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium">
                                                                <Star className={cn("w-3.5 h-3.5", rating?.average ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                                                                {rating?.average ? (
                                                                    <>
                                                                        <span className="text-foreground">{rating.average}</span>
                                                                        <span className="text-muted-foreground">({rating.count})</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-muted-foreground">{t('applications.noReviews', { defaultValue: 'Aucun avis' })}</span>
                                                                )}
                                                            </span>
                                                        )}
                                                        {city && (
                                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <MapPin className="w-3 h-3" />
                                                                {city}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 3: Position + Establishment */}
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Briefcase className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                                <span className="font-medium text-foreground">{firstApp.shift?.position_name || '-'}</span>
                                                <span className="mx-2 text-border">|</span>
                                                <MapPin className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                                {firstApp.shift?.establishments?.name || '-'}
                                            </div>

                                            {/* Row 4: Date range + Time + Count + Quote */}
                                            <div className="flex items-center gap-4 text-sm flex-wrap">
                                                <div className="flex items-center text-foreground">
                                                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                                    {firstApp.shift?.start_time && format(new Date(firstApp.shift.start_time), 'dd MMM', { locale: getDateFnsLocale() })}
                                                    {' → '}
                                                    {lastApp.shift?.start_time && format(new Date(lastApp.shift.start_time), 'dd MMM yyyy', { locale: getDateFnsLocale() })}
                                                </div>
                                                <div className="flex items-center text-muted-foreground">
                                                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                                                    {firstApp.shift?.start_time && formatTimeUTC(firstApp.shift.start_time)} - {firstApp.shift?.end_time && formatTimeUTC(firstApp.shift.end_time)}
                                                </div>
                                                <span className="text-muted-foreground">
                                                    {item.apps.length} shift{item.apps.length > 1 ? 's' : ''}
                                                </span>
                                                {totalQuote > 0 && (
                                                    <div className="flex items-center font-medium text-emerald-600 dark:text-emerald-400">
                                                        <Banknote className="w-3.5 h-3.5 mr-1.5" />
                                                        {currencyFmt.format(totalQuote)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Row 5: Toggle button + Actions */}
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    {t('applications.viewShifts', { defaultValue: 'Voir les shifts' })}
                                                    <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                                                </button>
                                                {allPending && (
                                                    <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                                            onClick={() => handleAcceptAll(item.apps)}
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                                                            {t('applications.actions.acceptAll', { defaultValue: 'Tout accepter' })}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-800 dark:hover:bg-red-900/20"
                                                            onClick={() => handleRejectAll(item.apps)}
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            <UserX className="w-3.5 h-3.5 mr-1.5" />
                                                            {t('applications.actions.rejectAll', { defaultValue: 'Tout refuser' })}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Compatibility panel */}
                                        {firstApp.type === 'freelancer' && firstApp.compatibility_score != null && (
                                            <div className={cn(
                                                "w-40 flex-shrink-0 rounded-xl border p-4 flex flex-col items-center justify-center",
                                                firstApp.compatibility_score >= 60
                                                    ? "border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/20"
                                                    : firstApp.compatibility_score >= 30
                                                        ? "border-amber-200 dark:border-amber-800 bg-gradient-to-b from-amber-50/50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/20"
                                                        : "border-red-200 dark:border-red-800 bg-gradient-to-b from-red-50/50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/20"
                                            )}>
                                                <p className={cn(
                                                    "text-3xl font-bold",
                                                    firstApp.compatibility_score >= 60
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : firstApp.compatibility_score >= 30
                                                            ? "text-amber-600 dark:text-amber-400"
                                                            : "text-red-600 dark:text-red-400"
                                                )}>
                                                    {firstApp.compatibility_score}%
                                                </p>
                                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-1">
                                                    {t('applications.compatibility', { defaultValue: 'Compatibilité' })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded: individual shift cards */}
                                {isExpanded && (
                                    <div className="ml-4 border-l-2 border-indigo-200 dark:border-indigo-800 pl-3 mt-2 space-y-3">
                                        {item.apps.map((app) => (
                                            <ApplicationCard
                                                key={`${app.type}-${app.id}`}
                                                app={app}
                                                onSelect={setSelectedApplication}
                                                onAccept={handleAccept}
                                                onReject={handleReject}
                                                onViewProfile={setViewingFreelancerId}
                                                isMutating={updateStatusMutation.isPending}
                                                getDateFnsLocale={getDateFnsLocale}
                                                language={i18n.language}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {displayItems.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, displayItems.length)} {t('common.of', { defaultValue: 'sur' })} {displayItems.length}
                    </p>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <Button
                                    key={page}
                                    variant={page === currentPage ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="w-9"
                                >
                                    {page}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal + Confirmation Dialog */}
            <ApplicationDetailModal
                selectedApplication={selectedApplication}
                onClose={() => setSelectedApplication(null)}
                onAccept={handleAccept}
                onReject={handleReject}
                onRequestAttestation={handleRequestAttestation}
                isMutating={updateStatusMutation.isPending}
                getDateFnsLocale={getDateFnsLocale}
                language={i18n.language}
                confirmDialog={confirmDialog}
                onConfirm={handleConfirm}
                onCancelConfirm={() => setConfirmDialog(null)}
            />

            {/* Freelancer Profile Dialog */}
            <Dialog open={!!viewingFreelancerId} onOpenChange={() => setViewingFreelancerId(null)}>
                <DialogContent className="max-w-6xl p-0">
                    {viewingFreelancerId && (
                        <FreelancerProfilePanel
                            freelancerId={viewingFreelancerId}
                            onBack={() => setViewingFreelancerId(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
