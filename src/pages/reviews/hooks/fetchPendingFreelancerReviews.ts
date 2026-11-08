import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger'
import type { FreelancerApplication } from '../types'

interface FetchPendingFreelancerReviewsParams {
    companyId: string
    establishmentId?: string | null
}

// ✅ Extrait de useReviewsData.ts — logique d'éligibilité partagée entre :
//    1) la page Reviews (onglet "pending", tout ce qui n'est pas encore noté)
//    2) le popup global de DashboardLayout (usePendingReviewsPopup), qui filtre
//       en plus par review_popup_seen_at côté appelant, sans dupliquer cette requête.
export async function fetchPendingFreelancerReviews({
    companyId,
    establishmentId,
}: FetchPendingFreelancerReviewsParams): Promise<FreelancerApplication[]> {
    // 1. Get establishment IDs for this company
    const { data: establishments } = await supabase
        .from('establishments')
        .select('id')
        .eq('company_id', companyId)

    if (!establishments?.length) return []

    const estIds = establishmentId
        ? [establishmentId]
        : establishments.map((e: { id: string }) => e.id)

    // 2. Get shifts for these establishments
    const { data: shiftsData } = await supabase
        .from('shifts')
        .select('id')
        .in('establishment_id', estIds)

    if (!shiftsData?.length) return []

    const shiftIds = shiftsData.map((s: { id: string }) => s.id)

    // 3. Get accepted applications for these shifts
    // ✅ نجلب أيضاً review_popup_seen_at — لا نستعملها هنا، لكن usePendingReviewsPopup
    // يحتاجها لتصفية العناصر التي عُرضت عليها النافذة المنبثقة من قبل
    const { data: applications, error: appError } = await supabase
        .from('shift_freelancer_applications')
        .select(`
            id,
            shift_id,
            freelancer_id,
            status,
            applied_at,
            review_popup_seen_at,
            shift:shifts(
                id,
                position_name,
                start_time,
                end_time,
                status,
                establishment_id,
                company_id,
                event_id,
                establishments(id, name)
            ),
            freelancer:freelancers(
                id,
                first_name,
                last_name,
                full_name,
                profile_photo_url
            )
        `)
        .in('shift_id', shiftIds)
        .eq('status', 'accepted')
        .order('applied_at', { ascending: false })

    if (appError) {
        logger.error('Error fetching pending reviews:', appError)
        return []
    }

    if (!applications || applications.length === 0) return []

    // 4. Filter for finished shifts (status is finished OR end_time passed)
    const finishedApplications = applications.filter((app) => {
        const isFinishedStatus = ['completed', 'pending_validation', 'closed'].includes(app.shift?.status ?? '')
        const isPast = app.shift?.end_time && new Date(app.shift.end_time) < new Date()
        return isFinishedStatus || isPast
    })

    if (finishedApplications.length === 0) return []

    // 4b. For shifts belonging to an event series (event_id), only keep
    // the last shift in that series as eligible for review. The other
    // shifts in the same series should NOT trigger a separate review —
    // the review is meant to cover the whole series at once.
    const standalone = finishedApplications.filter((app) => !app.shift?.event_id)

    const eventGroups = new Map<string, typeof finishedApplications>()
    finishedApplications
        .filter((app) => app.shift?.event_id)
        .forEach((app) => {
            const eventId = app.shift!.event_id as string
            if (!eventGroups.has(eventId)) eventGroups.set(eventId, [])
            eventGroups.get(eventId)!.push(app)
        })

    const lastOfEachEvent = Array.from(eventGroups.values()).map((group) =>
        group.reduce((latest, current) => {
            const latestEnd = new Date(latest.shift?.end_time ?? 0).getTime()
            const currentEnd = new Date(current.shift?.end_time ?? 0).getTime()
            return currentEnd > latestEnd ? current : latest
        })
    )

    const eventFilteredApplications = [...standalone, ...lastOfEachEvent]

    if (eventFilteredApplications.length === 0) return []

    // 5. Filter out those that already have reviews
    const { data: existingReviews, error: reviewError } = await supabase
        .from('freelancer_reviews')
        .select('shift_id, freelancer_id')
        .in('shift_id', eventFilteredApplications.map(a => a.shift_id).filter((id): id is string => id != null))

    if (reviewError) {
        logger.error('Error fetching existing reviews:', reviewError)
    }

    const reviewedPairs = new Set(
        (existingReviews || []).map(r => `${r.shift_id}-${r.freelancer_id}`)
    )

    const pending = eventFilteredApplications.filter(app =>
        !reviewedPairs.has(`${app.shift_id}-${app.freelancer_id}`)
    )

    return pending as FreelancerApplication[]
}