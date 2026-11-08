import { useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import { AuthLayout } from './layouts/AuthLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { logger } from '@/utils/logger'
import { useTranslation } from 'react-i18next'
import { LocaleRouter } from './components/LocaleRouter'
import { NavigationLoader } from './components/NavigationLoader'
import { useNavigationProgress } from './hooks/useNavigationProgress'
import { toast } from 'sonner'
import { PageErrorBoundary } from './components/ui/PageErrorBoundary'
import EstablishmentsRates from './pages/establishments/EstablishmentsRates'
import { V2RequireAuth } from './pages/v2/RequireAuth'

// ✅ Lazy loading des pages pour réduire le bundle initial (-60%)
// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then(m => ({ default: m.SignupPage })))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const FreelancerConfirmPage = lazy(() => import('./pages/auth/FreelancerConfirmPage').then(m => ({ default: m.FreelancerConfirmPage })))
const EmailConfirmedPage = lazy(() => import('./pages/auth/EmailConfirmedPage').then(m => ({ default: m.EmailConfirmedPage })))

// Dashboard pages
const InvoiceViewPage = lazy(() => import('./pages/invoices/InvoiceViewPage').then(m => ({ default: m.InvoiceViewPage })))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ShiftDetailPage = lazy(() => import('./pages/shifts/ShiftDetailPage').then(m => ({ default: m.ShiftDetailPage })))
const CreateShiftPage = lazy(() => import('./pages/shifts/CreateShiftPage').then(m => ({ default: m.CreateShiftPage })))
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage').then(m => ({ default: m.EmployeesPage })))
const EmployeeDetailPage = lazy(() => import('./pages/employees/EmployeeDetailPage').then(m => ({ default: m.EmployeeDetailPage })))
const FreelancersPage = lazy(() => import('./pages/freelancers/FreelancersPage').then(m => ({ default: m.FreelancersPage })))
const FreelancerDetailPage = lazy(() => import('./pages/freelancers/FreelancerDetailPage').then(m => ({ default: m.FreelancerDetailPage })))
const EstablishmentsPage = lazy(() => import('./pages/establishments/EstablishmentsPage').then(m => ({ default: m.EstablishmentsPage })))
const SubscriptionPage = lazy(() => import('./pages/subscription/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })))
const SubscriptionSuccessPage = lazy(() => import('./pages/subscription/SubscriptionSuccessPage').then(m => ({ default: m.SubscriptionSuccessPage })))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const IntegrationsPage = lazy(() => import('./pages/integrations/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })))
const SupportPage = lazy(() => import('./pages/support/SupportPage').then(m => ({ default: m.SupportPage })))
const HelpCenter = lazy(() => import('./pages/support/HelpCenter').then(m => ({ default: m.HelpCenter })))
const HelpCenterArticle = lazy(() => import('./pages/support/HelpCenterArticle').then(m => ({ default: m.HelpCenterArticle })))
const Documentation = lazy(() => import('./pages/support/Documentation').then(m => ({ default: m.Documentation })))
const TeamPage = lazy(() => import('./pages/team/TeamPage').then(m => ({ default: m.TeamPage })))
const InvitePage = lazy(() => import('./pages/invite/InvitePage').then(m => ({ default: m.InvitePage })))
const GeneralInvitePage = lazy(() => import('./pages/invite/GeneralInvitePage').then(m => ({ default: m.GeneralInvitePage })))
const InvitationsManagementPage = lazy(() => import('./pages/establishments/InvitationsManagementPage').then(m => ({ default: m.InvitationsManagementPage })))
const PayrollPage = lazy(() => import('./pages/billing/WalletPage').then(m => ({ default: m.WalletPage })))
const InvoicesPage = lazy(() => import('./pages/invoices/InvoicesPage').then(m => ({ default: m.InvoicesPage })))
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })))
const ReviewsPage = lazy(() => import('./pages/reviews/ReviewsPage').then(m => ({ default: m.ReviewsPage })))
const ApplicationsPage = lazy(() => import('./pages/applications/ApplicationsPage').then(m => ({ default: m.ApplicationsPage })))
const ApplicationsHistoryPage = lazy(() => import('./pages/applications/ApplicationsHistoryPage').then(m => ({ default: m.ApplicationsHistoryPage })))

const ChatPage = lazy(() => import('./pages/chat/ChatPage'))

// Refonte de l'espace client (v2) — montée en parallèle sous /:locale/v2
// (jetons `se-*` chargés par index.css → styles/se-tokens.css)
const V2Layout = lazy(() => import('./pages/v2/V2Layout').then(m => ({ default: m.V2Layout })))
const V2HomeRoute = lazy(() => import('./pages/v2/HomeRoute').then(m => ({ default: m.HomeRoute })))
const V2DashboardPage = lazy(() => import('./pages/v2/real/RealDashboardPage').then(m => ({ default: m.RealDashboardPage })))
const V2MessagesPage = lazy(() => import('./pages/v2/real/RealMessagesPage').then(m => ({ default: m.RealMessagesPage })))
const V2FacturesPage = lazy(() => import('./pages/v2/FacturesPage').then(m => ({ default: m.FacturesPage })))
const V2ReglagesPage = lazy(() => import('./pages/v2/ReglagesPage').then(m => ({ default: m.ReglagesPage })))

const PageLoader = () => {
  return (
    <div className="flex items-center justify-center h-full w-full py-20">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full bg-white"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
      </div>
    </div>
  )
}

function App() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const company = useAuthStore((state) => state.company)
  const isLoading = useAuthStore((state) => state.isLoading)
  const checkSession = useAuthStore((state) => state.checkSession)
  const queryClient = useQueryClient()
const stripeCustomerCheckRef = useRef<string | null>(null)
 
useEffect(() => {
  if (!company?.id) return
  if (company.stripe_customer_id) return // already has one, nothing to do
  if (stripeCustomerCheckRef.current === company.id) return // already checked/firing for this company
 
  stripeCustomerCheckRef.current = company.id
 
  ;(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
 
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-customer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ company_id: company.id }),
        },
      )

      console.log(res);
      
 
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        logger.log('⚠️ create-stripe-customer failed', { companyId: company.id, error: body })
        return
      }
 
      const { stripe_customer_id } = await res.json()
 
      // Update the store directly — same object shape authStore already
      // uses elsewhere (see setCompany calls in SettingsPage). No need
      // to refetch the whole company row for one field.
      useAuthStore.setState((state) => ({
        company: state.company ? { ...state.company, stripe_customer_id } : state.company,
      }))
 
      logger.log('✅ Stripe customer auto-created for company', { companyId: company.id, stripe_customer_id })
    } catch (err) {
      logger.log('⚠️ create-stripe-customer threw', { companyId: company.id, error: err })
      // Non-fatal — company just stays without a stripe_customer_id;
      // billing UI (PaymentMethodCard, etc.) should already handle that
      // state. Reset the ref so a later remount/company change can retry.
      stripeCustomerCheckRef.current = null
    }
  })()
}, [company?.id, company?.stripe_customer_id])

  // Detect email confirmation redirect
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token') && hash.includes('type=signup')) {
      const locale = window.location.pathname.split('/')[1] || 'fr'
      window.location.href = `/${locale}/email-confirmed${hash}`
      return
    }
  }, [])

  const sessionCheckedRef = useRef(false)

  useEffect(() => {
    if (!sessionCheckedRef.current) {
      sessionCheckedRef.current = true
      if (window.location.pathname.includes('/email-confirmed')) {
        useAuthStore.setState({ isLoading: false })
        return
      }
      checkSession()
    }
  }, [checkSession])

   

 

  // ✅ Global realtime subscription
  useEffect(() => {
    if (!company?.id || !user?.id) return

    logger.log(`🌐 Setting up GLOBAL realtime for ${user.email}`)

    const globalSubscription = supabase
      .channel(`global_updates_${company.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => queryClient.invalidateQueries({ queryKey: ['shifts'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_applications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shifts'] })
          queryClient.invalidateQueries({ queryKey: ['unviewed-applications-count'] })
          // ✅ أضفنا هذا
          queryClient.invalidateQueries({ queryKey: ['employee-applications'], exact: false })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_freelancer_applications' },
        (payload) => {
          logger.log('🔴 Realtime freelancer application:', payload)
          if (payload.eventType === 'INSERT') {
            toast.success(t('notifications.newApplicationReceived'), { icon: '👥' })
          }
          queryClient.invalidateQueries({ queryKey: ['shifts'] })
          queryClient.invalidateQueries({ queryKey: ['unviewed-applications-count'] })
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          // ✅ أضفنا هذا
          queryClient.invalidateQueries({ queryKey: ['freelancer-applications'], exact: false })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          logger.log('💬 GLOBAL Realtime new message detected:', payload)
          toast.info(t('chat.newMessageReceived'), { icon: '💬' })

          const newRecord = payload.new as Record<string, unknown> | undefined
          if (newRecord?.conversation_id) {
            queryClient.invalidateQueries({ queryKey: ['messages', newRecord.conversation_id] })
          }

          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          queryClient.invalidateQueries({ queryKey: ['messages'] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_participants' },
        () => queryClient.invalidateQueries({ queryKey: ['conversations'] })
      )
      .subscribe((status) => {
        logger.log('📡 Realtime status:', status)
      })

    return () => {
      logger.log('🌐 Cleaning up GLOBAL realtime')
      globalSubscription.unsubscribe()
    }
  }, [company?.id, user?.id, queryClient])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('app.loadingApp')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <NavigationLoader />

      <Suspense fallback={<PageLoader />}>
        <LocaleRouter>
          <Routes>
            <Route path="/:locale">
              <Route element={<AuthLayout />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="signup" element={<SignupPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="freelance/confirm" element={<FreelancerConfirmPage />} />
                <Route path="email-confirmed" element={<EmailConfirmedPage />} />
              </Route>

              <Route path="invite/:token" element={<InvitePage />} />
              <Route path="invite/general/:token" element={<GeneralInvitePage />} />
<Route path="invoices/:id" element={<InvoiceViewPage />} />
              <Route
                element={
                  user && (user.role === 'admin' || user.role === 'manager') ? (
                    <DashboardLayout />
                  ) : (
                    <Navigate to="login" replace />
                  )
                }
              >
                <Route index element={<PageErrorBoundary pageName="Dashboard"><DashboardPage /></PageErrorBoundary>} />
                <Route path="messages" element={<ChatPage />} />
                <Route path="shifts" element={<ShiftsToPlanning />} />
                <Route path="shifts/new" element={<CreateShiftPage />} />
                <Route path="shifts/:id" element={<ShiftDetailPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="employees/:id" element={<PageErrorBoundary pageName="EmployeeDetail"><EmployeeDetailPage /></PageErrorBoundary>} />
                <Route path="freelancers" element={<FreelancersPage />} />
                <Route path="freelancers/:id" element={<FreelancerDetailPage />} />
                <Route path="establishments" element={<EstablishmentsPage />} />
                <Route path="establishments/rates/:id" element={<EstablishmentsRates />} />
                <Route path="establishments/invitations" element={<InvitationsManagementPage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
                <Route path="applications" element={<PageErrorBoundary pageName="Applications"><ApplicationsPage /></PageErrorBoundary>} />
                <Route path="applications/history" element={<PageErrorBoundary pageName="ApplicationsHistory"><ApplicationsHistoryPage /></PageErrorBoundary>} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="subscription/success" element={<SubscriptionSuccessPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="support/centre-aide" element={<HelpCenter />} />
                <Route path="support/centre-aide/:articleId" element={<HelpCenterArticle />} />
                <Route path="support/documentation" element={<Documentation />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="admin/audit-logs" element={<PageErrorBoundary pageName="AuditLogs"><AuditLogsPage /></PageErrorBoundary>} />
              </Route>

              {/* Refonte v2 : /:locale/v2 — sans session → /:locale/login (retour sur la v2 après connexion) */}
              <Route
                path="v2"
                element={
                  <V2RequireAuth>
                    <V2Layout />
                  </V2RequireAuth>
                }
              >
                <Route index element={<V2HomeRoute />} />
                <Route path="tableau-de-bord" element={<V2DashboardPage />} />
                <Route path="messages" element={<V2MessagesPage />} />
                <Route path="factures" element={<V2FacturesPage />} />
                <Route path="reglages" element={<V2ReglagesPage />} />
              </Route>
            </Route>

            <Route path="*" element={<div />} />
          </Routes>
        </LocaleRouter>
      </Suspense>
    </>
  )
}

function ShiftsToPlanning() {
  const { locale = 'fr' } = useParams<{ locale: string }>()
  return <Navigate to={`/${locale}/v2`} replace />
}

export default App