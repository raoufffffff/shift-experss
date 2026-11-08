import { supabase } from '@/lib/supabase'

// Haversine formula for distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface ScoringFreelancer {
    id: string
    latitude: number | null
    longitude: number | null
    pms_ids: string[]
    skill_category_ids: string[]
}

interface ScoringShift {
    id: string
    job_position_id: string | null
    establishment_id: string | null
    establishment_latitude: number | null
    establishment_longitude: number | null
    establishment_category_id: string | null
    required_pms_ids: string[]
}

export function computeScore(
    freelancer: ScoringFreelancer,
    shift: ScoringShift,
    pastPositionCount: number,
    pastEstablishmentCount: number,
): number {
    let score = 0

    // 1. PMS match (20 pts)
    if (shift.required_pms_ids.length === 0) {
        score += 20
    } else {
        const masteredSet = new Set(freelancer.pms_ids)
        const matched = shift.required_pms_ids.filter(id => masteredSet.has(id)).length
        score += Math.round((matched / shift.required_pms_ids.length) * 20)
    }

    // 2. Position experience (25 pts) — fallback to establishment history if no job_position_id
    if (pastPositionCount >= 4) score += 25
    else if (pastPositionCount >= 2) score += 18
    else if (pastPositionCount >= 1) score += 10
    else if (!shift.job_position_id) {
        if (pastEstablishmentCount >= 3) score += 20
        else if (pastEstablishmentCount >= 1) score += 12
    }

    // 3. Domain skills (15 pts)
    if (shift.establishment_category_id && freelancer.skill_category_ids.includes(shift.establishment_category_id)) {
        score += 15
    }

    // 4. Distance (20 pts) — neutral score when coords missing
    if (freelancer.latitude && freelancer.longitude && shift.establishment_latitude && shift.establishment_longitude) {
        const dist = haversineKm(freelancer.latitude, freelancer.longitude, shift.establishment_latitude, shift.establishment_longitude)
        if (dist < 10) score += 20
        else if (dist < 25) score += 16
        else if (dist < 50) score += 10
        else if (dist < 100) score += 4
    } else {
        score += 10
    }

    // 5. Establishment trust (20 pts)
    if (pastEstablishmentCount >= 5) score += 20
    else if (pastEstablishmentCount >= 3) score += 15
    else if (pastEstablishmentCount >= 1) score += 10

    return Math.min(score, 100)
}

/**
 * Fetch all data needed to compute compatibility scores for a set of freelancers against a shift.
 * Returns Record<freelancerId, { score: number }>.
 */
export async function computeCompatibilityScores(
    shiftId: string,
    freelancerIds: string[],
): Promise<Record<string, { score: number }>> {
    if (!shiftId || freelancerIds.length === 0) return {}

    try {
        // 1. Fetch shift data with establishment info and required PMS
        const { data: shiftData } = await supabase
            .from('shifts')
            .select('id, job_position_id, establishment_id, establishments(id, latitude, longitude, category_id)')
            .eq('id', shiftId)
            .single()

        if (!shiftData) return {}

        const est = shiftData.establishments as unknown as { id: string; latitude: number | null; longitude: number | null; category_id: string | null } | null

        // 2. Fetch required PMS for this shift
        let requiredPmsIds: string[] = []
        try {
            const { data: reqPms } = await supabase
                .from('shift_required_pms' as never)
                .select('pms_id' as never)
                .eq('shift_id' as never, shiftId as never)
            if (reqPms) {
                requiredPmsIds = (reqPms as unknown as { pms_id: string }[]).map(r => r.pms_id)
            }
        } catch { /* table may not exist */ }

        const scoringShift: ScoringShift = {
            id: shiftData.id,
            job_position_id: shiftData.job_position_id,
            establishment_id: est?.id || null,
            establishment_latitude: est?.latitude || null,
            establishment_longitude: est?.longitude || null,
            establishment_category_id: est?.category_id || null,
            required_pms_ids: requiredPmsIds,
        }

        // 3. Fetch freelancer data (coords + PMS mastery)
        const { data: freelancersData } = await supabase
            .from('freelancers')
            .select('id, latitude, longitude, freelancer_pms(pms_id)')
            .in('id', freelancerIds)

        const freelancerMap: Record<string, ScoringFreelancer> = {}
        for (const f of (freelancersData || []) as unknown as { id: string; latitude: number | null; longitude: number | null; freelancer_pms: { pms_id: string }[] }[]) {
            freelancerMap[f.id] = {
                id: f.id,
                latitude: f.latitude,
                longitude: f.longitude,
                pms_ids: (f.freelancer_pms || []).map(p => p.pms_id),
                skill_category_ids: [],
            }
        }

        // 4. Fetch freelancer skill categories
        try {
            const { data: skillRows } = await supabase
                .from('freelancer_professional_skills' as never)
                .select('freelancer_id, skill:professional_skills!inner(category_id)' as never)
                .in('freelancer_id' as never, freelancerIds as never)

            if (skillRows) {
                for (const row of skillRows as unknown as { freelancer_id: string; skill: { category_id: string | null } }[]) {
                    if (row.skill?.category_id && freelancerMap[row.freelancer_id]) {
                        freelancerMap[row.freelancer_id].skill_category_ids.push(row.skill.category_id)
                    }
                }
            }
        } catch { /* table may not exist */ }

        // 5. Fetch past accepted shifts (position + establishment counts)
        const pastPositionCounts: Record<string, number> = {}
        const pastEstCounts: Record<string, number> = {}

        try {
            const { data: pastApps } = await supabase
                .from('shift_freelancer_applications')
                .select('freelancer_id, shift:shifts!inner(job_position_id, establishment_id)' as never)
                .in('freelancer_id', freelancerIds)
                .eq('status', 'accepted')

            if (pastApps) {
                for (const row of pastApps as unknown as { freelancer_id: string; shift: { job_position_id: string | null; establishment_id: string | null } }[]) {
                    const fid = row.freelancer_id
                    if (row.shift?.job_position_id && row.shift.job_position_id === scoringShift.job_position_id) {
                        pastPositionCounts[fid] = (pastPositionCounts[fid] || 0) + 1
                    }
                    if (row.shift?.establishment_id && row.shift.establishment_id === scoringShift.establishment_id) {
                        pastEstCounts[fid] = (pastEstCounts[fid] || 0) + 1
                    }
                }
            }
        } catch { /* ignore */ }

        // 6. Compute scores
        const results: Record<string, { score: number }> = {}
        for (const fid of freelancerIds) {
            const f = freelancerMap[fid]
            if (!f) {
                results[fid] = { score: 0 }
                continue
            }
            results[fid] = {
                score: computeScore(f, scoringShift, pastPositionCounts[fid] || 0, pastEstCounts[fid] || 0),
            }
        }

        return results
    } catch {
        return {}
    }
}
