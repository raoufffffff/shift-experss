import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { logger } from '@/utils/logger'

export interface OnboardingStep {
  id: string
  title: string
  completed: boolean
  href?: string
}

interface OnboardingProgress {
  hasSeenWelcome: boolean
  establishmentCreated: boolean
  employeeInvited: boolean
  shiftPublished: boolean
}

const WELCOME_KEY = 'shift-express-welcome-seen'

export function useOnboardingProgress() {
  const company = useAuthStore((state) => state.company)
  const queryClient = useQueryClient()
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    return localStorage.getItem(WELCOME_KEY) === 'true'
  })

  // Fetch establishments count
  const { data: establishmentsCount = 0 } = useQuery({
    queryKey: ['establishments-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0
      const { count } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
      return count || 0
    },
    enabled: !!company?.id,
  })

  // Fetch active employees count (active = true)
  const { data: activeEmployeesCount = 0 } = useQuery({
    queryKey: ['active-employees-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('active', true)
      return count || 0
    },
    enabled: !!company?.id,
  })

  // Fetch total employees count (invited)
  const { data: totalEmployeesCount = 0 } = useQuery({
    queryKey: ['employees-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
      return count || 0
    },
    enabled: !!company?.id,
  })

  // Fetch shifts count
  const { data: shiftsCount = 0 } = useQuery({
    queryKey: ['shifts-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0
      const { count } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
      return count || 0
    },
    enabled: !!company?.id,
  })

  // Calculate Shift Readiness Score
  // Formula: (active_employees / 20) * 100, capped at 100%
  const targetEmployees = 20
  const minimumEmployees = 10
  const shiftReadinessScore = Math.min(
    Math.round((activeEmployeesCount / targetEmployees) * 100),
    100
  )

  // Calculate progress
  const employeeTarget = 10
  const hasSiret = !!company?.siret

  const progress: OnboardingProgress = {
    hasSeenWelcome,
    establishmentCreated: establishmentsCount > 0,
    employeeInvited: totalEmployeesCount >= employeeTarget,
    shiftPublished: shiftsCount > 0,
  }

  // Generate steps list with translations
  const steps: OnboardingStep[] = [
    {
      id: 'siret',
      title: 'onboarding.steps.siret',
      completed: hasSiret,
      href: '/settings',
    },
    {
      id: 'employee',
      title: 'onboarding.steps.employee',
      completed: progress.employeeInvited,
      href: '/employees',
    },
    {
      id: 'shift',
      title: 'onboarding.steps.shift',
      completed: progress.shiftPublished,
      href: '/shifts/new',
    },
  ]

  const completedSteps = steps.filter((s) => s.completed).length
  const totalSteps = steps.length
  const checklistPercentage = Math.round((completedSteps / totalSteps) * 100)
  const isOnboardingComplete = completedSteps === totalSteps

  // Mark welcome as seen
  const markWelcomeSeen = () => {
    localStorage.setItem(WELCOME_KEY, 'true')
    setHasSeenWelcome(true)
  }

  // Reset welcome (for "revoir l'onboarding")
  const resetWelcome = () => {
    localStorage.removeItem(WELCOME_KEY)
    setHasSeenWelcome(false)
  }

  // Dismiss checklist permanently (stored in DB)
  const dismissChecklistMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company')
      const { error } = await supabase
        .from('companies')
        .update({ onboarding_dismissed: true })
        .eq('id', company.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', company?.id] })
      useAuthStore.getState().refreshCompany()
    },
    onError: (error) => {
      logger.error('Failed to dismiss onboarding checklist:', error instanceof Error ? error : String(error))
    },
  })

  // Check if checklist is dismissed (from company data)
  const isChecklistDismissed = company?.onboarding_dismissed || false

  // Check if banner was dismissed today (within last 24 hours)
  const wasBannerDismissedToday = () => {
    if (!company?.last_readiness_reminder_at) return false
    const lastDismissed = new Date(company.last_readiness_reminder_at)
    const now = new Date()
    const hoursSinceLastDismissal = (now.getTime() - lastDismissed.getTime()) / (1000 * 60 * 60)
    return hoursSinceLastDismissal < 24
  }

  // Check if should show readiness banner (score < 50%, not permanently dismissed, and not dismissed today)
  const shouldShowReadinessBanner =
    shiftReadinessScore < 50 &&
    !isChecklistDismissed &&
    !wasBannerDismissedToday()

  return {
    progress,
    steps,
    completedSteps,
    totalSteps,
    checklistPercentage,
    isOnboardingComplete,
    hasSeenWelcome,
    markWelcomeSeen,
    resetWelcome,
    dismissChecklist: () => dismissChecklistMutation.mutate(),
    isChecklistDismissed,
    shouldShowWelcome: !hasSeenWelcome && establishmentsCount === 0,
    // Shift Readiness Score data
    shiftReadinessScore,
    activeEmployeesCount,
    totalEmployeesCount,
    targetEmployees,
    minimumEmployees,
    shouldShowReadinessBanner,
    // Employee target for onboarding
    employeeTarget,
  }
}
