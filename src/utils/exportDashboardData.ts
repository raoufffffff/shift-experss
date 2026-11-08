import { calculateShiftNetHours } from '@shared/utils'
import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger'
import * as XLSX from 'xlsx'

interface ExportOptions {
  companyId: string
  startDate: Date
  endDate: Date
  selectedEstablishmentId?: string | null
}

export async function exportDashboardData({ companyId, startDate, endDate, selectedEstablishmentId }: ExportOptions) {
  try {
    logger.log('Export params:', { companyId, startDate, endDate, selectedEstablishmentId })

    // ============================================================================
    // FETCH DATA FROM DATABASE
    // ============================================================================

    // Fetch all shifts in the date range - USE start_time for filtering, not created_at
    let shiftsQuery = supabase
      .from('shifts')
      .select(`
        *,
        establishment:establishments(name, city)
      `)
      .eq('company_id', companyId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: false })

    if (selectedEstablishmentId) {
      shiftsQuery = shiftsQuery.eq('establishment_id', selectedEstablishmentId)
    }

    const { data: shifts, error: shiftsError } = await shiftsQuery

    logger.log('Shifts query result:', { count: shifts?.length, error: shiftsError })

    if (shiftsError) {
      logger.error('Shifts error details:', shiftsError)
      throw new Error(`Error fetching shifts: ${shiftsError.message}`)
    }

    // Fetch shift applications with user details
    const shiftIds = shifts?.map(s => s.id) || []
    const { data: applications, error: appsError } = await supabase
      .from('shift_applications')
      .select(`
        *,
        user:users!shift_applications_user_id_fkey(first_name, last_name, email, phone)
      `)
      .in('shift_id', shiftIds)
      .order('applied_at', { ascending: false })

    if (appsError) {
      logger.error('Applications error:', appsError)
    }

    // Fetch employees data
    let employeesQuery = supabase
      .from('employees')
      .select(`
        *,
        user:user_id(first_name, last_name, email, phone, points, level),
        establishment:establishment_id(name)
      `)
      .eq('company_id', companyId)

    if (selectedEstablishmentId) {
      employeesQuery = employeesQuery.eq('establishment_id', selectedEstablishmentId)
    }

    const { data: employees, error: employeesError } = await employeesQuery

    if (employeesError) {
      logger.error('Employees error details:', employeesError)
      throw new Error(`Error fetching employees: ${employeesError.message}`)
    }

    // ============================================================================
    // PREPARE WORKBOOK
    // ============================================================================

    const workbook = XLSX.utils.book_new()

    // ============================================================================
    // SUMMARY SHEET
    // ============================================================================

    const totalShifts = shifts?.length || 0
    const filledShifts = shifts?.filter(s => s.status === 'filled').length || 0
    const partiallyFilledShifts = shifts?.filter(s => s.status === 'partially_filled').length || 0
    const pendingShifts = shifts?.filter(s => s.status === 'pending').length || 0
    const cancelledShifts = shifts?.filter(s => s.status === 'canceled').length || 0

    const totalApplications = applications?.length || 0
    const acceptedApplications = applications?.filter(a => a.status === 'accepted').length || 0
    const pendingApplications = applications?.filter(a => a.status === 'pending').length || 0
    const rejectedApplications = applications?.filter(a => a.status === 'rejected').length || 0

    const totalEmployees = employees?.length || 0
    const activeEmployees = employees?.filter(e => e.active).length || 0

    // Calculate totals
    const totalHours = shifts?.reduce((sum, s) => {
      const duration = s.actual_start_time && s.actual_end_time
        ? calculateShiftNetHours(s.actual_start_time, s.actual_end_time, s.actual_break_duration_minutes)
        : calculateShiftNetHours(s.start_time, s.end_time, s.break_duration_minutes)
      return sum + (duration || 0)
    }, 0) || 0

    const totalAmount = shifts?.reduce((sum, s) => {
      const hours = s.actual_start_time && s.actual_end_time
        ? calculateShiftNetHours(s.actual_start_time, s.actual_end_time, s.actual_break_duration_minutes)
        : calculateShiftNetHours(s.start_time, s.end_time, s.break_duration_minutes)
      const rate = s.freelance_hourly_rate ?? 0
      return sum + (hours * rate)
    }, 0) || 0

    const fillRate = totalShifts > 0 ? ((filledShifts / totalShifts) * 100).toFixed(1) : '0'
    const acceptanceRate = totalApplications > 0 ? ((acceptedApplications / totalApplications) * 100).toFixed(1) : '0'

    // Calculate average response time
    const responseTimes = applications
      ?.map(a => a.response_time_seconds)
      .filter((t): t is number => t != null) || []
    const avgResponseTime = responseTimes.length > 0
      ? (responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length / 60).toFixed(0)
      : '0'

    const summaryData = [
      ['SHIFT EXPRESS EXPORT REPORT', '', '', ''],
      ['', '', '', ''],
      ['Report Period', startDate.toLocaleDateString('en-US'), 'to', endDate.toLocaleDateString('en-US')],
      ['Generation Date', new Date().toLocaleString('en-US'), '', ''],
      ['Establishment', selectedEstablishmentId ? 'Filtered' : 'All', '', ''],
      ['', '', '', ''],
      ['=== SHIFTS ===', '', '', ''],
      ['Total Shifts Published', totalShifts, '', ''],
      ['Shifts Filled', filledShifts, '', ''],
      ['Shifts Partially Filled', partiallyFilledShifts, '', ''],
      ['Shifts Pending', pendingShifts, '', ''],
      ['Shifts Canceled', cancelledShifts, '', ''],
      ['Fill Rate', `${fillRate}%`, '', ''],
      ['', '', '', ''],
      ['=== APPLICATIONS ===', '', '', ''],
      ['Total Applications', totalApplications, '', ''],
      ['Applications Accepted', acceptedApplications, '', ''],
      ['Applications Pending', pendingApplications, '', ''],
      ['Applications Rejected', rejectedApplications, '', ''],
      ['Acceptance Rate', `${acceptanceRate}%`, '', ''],
      ['Average Response Time', `${avgResponseTime}`, 'minutes', ''],
      ['', '', '', ''],
      ['=== EMPLOYEES ===', '', '', ''],
      ['Total Employees', totalEmployees, '', ''],
      ['Active Employees', activeEmployees, '', ''],
      ['Activation Rate', totalEmployees > 0 ? `${((activeEmployees / totalEmployees) * 100).toFixed(1)}%` : '0%', '', ''],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)

    // Set column widths
    summarySheet['!cols'] = [
      { wch: 35 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 }
    ]

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // ============================================================================
    // SHIFTS SHEET
    // ============================================================================

    const shiftsData: (string | number)[][] = [
      [
        'ID',
        'Title',
        'Position',
        'Establishment',
        'City',
        'Start Date',
        'Start Time',
        'End Date',
        'End Time',
        'Planned Duration (h)',
        'Break (min)',
        'Actual Start Date',
        'Actual Start Time',
        'Actual End Date',
        'Actual End Time',
        'Actual Duration (h)',
        'Actual Break (min)',
        'Adjusted By',
        'Adjustment Reason',
        'Required Employees',
        'Assigned Employees',
        'Status',
        'Hourly Rate ($)',
        'Total Amount ($)',
        'Applications',
        'Accepted',
        'Pending',
        'Rejected',
        'Created By',
        'Published Date',
        'Filled Date',
        'Created Date',
      ]
    ]

    shifts?.forEach((shift) => {
      const startDate = new Date(shift.start_time)
      const endDate = new Date(shift.end_time)

      const actualStartDate = shift.actual_start_time ? new Date(shift.actual_start_time) : null
      const actualEndDate = shift.actual_end_time ? new Date(shift.actual_end_time) : null

      const plannedDuration = calculateShiftNetHours(shift.start_time, shift.end_time, shift.break_duration_minutes)
      const actualDuration = actualStartDate && actualEndDate
        ? calculateShiftNetHours(shift.actual_start_time!, shift.actual_end_time!, shift.actual_break_duration_minutes)
        : null

      // Get applications for this shift
      const shiftApplications = applications?.filter(a => a.shift_id === shift.id) || []
      const acceptedCount = shiftApplications.filter(a => a.status === 'accepted').length
      const pendingCount = shiftApplications.filter(a => a.status === 'pending').length
      const rejectedCount = shiftApplications.filter(a => a.status === 'rejected').length

      // Calculate total amount
      const finalHours = actualDuration !== null ? actualDuration : plannedDuration
      const shiftRate = shift.freelance_hourly_rate ?? 0
      const totalAmount = finalHours * shiftRate

      shiftsData.push([
        shift.id,
        shift.description || '',
        shift.position_name || '',
        shift.establishment?.name || '',
        shift.establishment?.city || '',
        startDate.toLocaleDateString('en-US', {  }),
        startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit',  }),
        endDate.toLocaleDateString('en-US', {  }),
        endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit',  }),
        plannedDuration.toFixed(2),
        shift.break_duration_minutes || 0,
        actualStartDate ? actualStartDate.toLocaleDateString('en-US', {  }) : '',
        actualStartDate ? actualStartDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit',  }) : '',
        actualEndDate ? actualEndDate.toLocaleDateString('en-US', {  }) : '',
        actualEndDate ? actualEndDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit',  }) : '',
        actualDuration !== null ? actualDuration.toFixed(2) : '',
        shift.actual_break_duration_minutes !== null && shift.actual_break_duration_minutes !== undefined ? shift.actual_break_duration_minutes : '',
        '', // adjustedBy - would need to fetch user data
        shift.adjustment_reason || '',
        shift.required_employees || 0,
        shift.filled_employees || 0,
        translateStatus(shift.status ?? ''),
        shiftRate,
        totalAmount.toFixed(2),
        shiftApplications.length,
        acceptedCount,
        pendingCount,
        rejectedCount,
        '', // created_by - would need to fetch user data
        shift.published_at ? new Date(shift.published_at).toLocaleString('en-US') : '',
        shift.filled_at ? new Date(shift.filled_at).toLocaleString('en-US') : '',
        shift.created_at ? new Date(shift.created_at).toLocaleString('en-US') : '',
      ])
    })

    const shiftsSheet = XLSX.utils.aoa_to_sheet(shiftsData)

    // Set column widths
    shiftsSheet['!cols'] = [
      { wch: 10 }, // ID
      { wch: 30 }, // Titre
      { wch: 20 }, // Poste
      { wch: 25 }, // Établissement
      { wch: 15 }, // Ville
      { wch: 12 }, // Date début
      { wch: 10 }, // Heure début
      { wch: 12 }, // Date fin
      { wch: 10 }, // Heure fin
      { wch: 15 }, // Durée planifiée
      { wch: 12 }, // Pause
      { wch: 12 }, // Date début réelle
      { wch: 10 }, // Heure début réelle
      { wch: 12 }, // Date fin réelle
      { wch: 10 }, // Heure fin réelle
      { wch: 15 }, // Durée réelle
      { wch: 12 }, // Pause réelle
      { wch: 20 }, // Ajusté par
      { wch: 30 }, // Raison ajustement
      { wch: 15 }, // Employés requis
      { wch: 15 }, // Employés assignés
      { wch: 20 }, // Statut
      { wch: 12 }, // Taux horaire
      { wch: 15 }, // Montant total
      { wch: 12 }, // Candidatures
      { wch: 10 }, // Acceptées
      { wch: 10 }, // En attente
      { wch: 10 }, // Refusées
      { wch: 20 }, // Créé par
      { wch: 18 }, // Date publication
      { wch: 18 }, // Date remplissage
      { wch: 18 }, // Date création
    ]

    XLSX.utils.book_append_sheet(workbook, shiftsSheet, 'Shifts')

    // ============================================================================
    // EMPLOYEES SHEET
    // ============================================================================

    const employeesData: (string | number)[][] = [
      [
        'ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Establishment',
        'Total Points',
        'Level',
        'Shifts Accepted',
        'Shifts Rejected',
        'Acceptance Rate (%)',
        'Average Response Time (min)',
        'Reliability Score',
        'Notifications',
        'Status',
        'Created Date',
      ]
    ]

    employees?.forEach((employee) => {
      const accepted = employee.total_shifts_accepted ?? 0
      const rejected = employee.total_shifts_rejected ?? 0
      const totalShifts = accepted + rejected
      const acceptanceRate = totalShifts > 0
        ? ((accepted / totalShifts) * 100).toFixed(1)
        : '0'

      const avgResponseTimeMin = employee.avg_response_time_seconds
        ? (employee.avg_response_time_seconds / 60).toFixed(0)
        : ''

      employeesData.push([
        employee.id,
        employee.user?.first_name || '',
        employee.user?.last_name || '',
        employee.user?.email || '',
        employee.user?.phone || '',
        employee.establishment?.name || '',
        employee.user?.points ?? 0,
        employee.user?.level ?? 0,
        accepted,
        rejected,
        acceptanceRate,
        avgResponseTimeMin,
        employee.reliability_score || 0,
        'N/A',
        employee.active ? 'Active' : 'Inactive',
        employee.created_at ? new Date(employee.created_at).toLocaleString('en-US') : '',
      ])
    })

    const employeesSheet = XLSX.utils.aoa_to_sheet(employeesData)

    // Set column widths
    employeesSheet['!cols'] = [
      { wch: 10 }, // ID
      { wch: 15 }, // Prénom
      { wch: 15 }, // Nom
      { wch: 30 }, // Email
      { wch: 15 }, // Téléphone
      { wch: 25 }, // Établissement
      { wch: 12 }, // Points totaux
      { wch: 8 }, // Niveau
      { wch: 15 }, // Shifts acceptés
      { wch: 15 }, // Shifts refusés
      { wch: 18 }, // Taux d'acceptation
      { wch: 20 }, // Temps de réponse moyen
      { wch: 15 }, // Score fiabilité
      { wch: 12 }, // Notifications
      { wch: 10 }, // Statut
      { wch: 18 }, // Date création
    ]

    XLSX.utils.book_append_sheet(workbook, employeesSheet, 'Employees')

    // ============================================================================
    // APPLICATIONS SHEET
    // ============================================================================

    const applicationsData: (string | number)[][] = [
      [
        'Application ID',
        'Shift ID',
        'Shift Title',
        'Shift Date',
        'Shift Time',
        'Establishment',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Status',
        'Application Date',
        'Response Date',
        'Response Time (min)',
        'Assigned',
        'Assignment Date',
      ]
    ]

    applications?.forEach((app) => {
      // Get shift details from shifts array
      const shift = shifts?.find(s => s.id === app.shift_id)
      const shiftStartTime = shift?.start_time ? new Date(shift.start_time) : null

      const responseTimeMin = app.response_time_seconds
        ? (app.response_time_seconds / 60).toFixed(0)
        : ''

      applicationsData.push([
        app.id,
        app.shift_id,
        shift?.position_name || shift?.description || '',
        shiftStartTime ? shiftStartTime.toLocaleDateString('en-US', {  }) : '',
        shiftStartTime ? shiftStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit',  }) : '',
        shift?.establishment?.name || '',
        app.user?.first_name || '',
        app.user?.last_name || '',
        app.user?.email || '',
        app.user?.phone || '',
        translateApplicationStatus(app.status ?? ''),
        app.applied_at ? new Date(app.applied_at).toLocaleString('en-US') : '',
        app.reviewed_at ? new Date(app.reviewed_at).toLocaleString('en-US') : '',
        responseTimeMin,
        app.status === 'accepted' ? 'Yes' : 'No',
        app.reviewed_at && app.status === 'accepted' ? new Date(app.reviewed_at).toLocaleString('en-US') : '',
      ])
    })

    const applicationsSheet = XLSX.utils.aoa_to_sheet(applicationsData)

    // Set column widths
    applicationsSheet['!cols'] = [
      { wch: 15 }, // ID Candidature
      { wch: 15 }, // ID Shift
      { wch: 30 }, // Titre Shift
      { wch: 12 }, // Date Shift
      { wch: 10 }, // Heure Shift
      { wch: 25 }, // Établissement
      { wch: 15 }, // Prénom
      { wch: 15 }, // Nom
      { wch: 30 }, // Email
      { wch: 15 }, // Téléphone
      { wch: 15 }, // Statut
      { wch: 18 }, // Date candidature
      { wch: 18 }, // Date réponse
      { wch: 18 }, // Temps de réponse
      { wch: 10 }, // Assigné
      { wch: 18 }, // Date assignation
    ]

    XLSX.utils.book_append_sheet(workbook, applicationsSheet, 'Applications')

    // ============================================================================
    // DOWNLOAD EXCEL FILE
    // ============================================================================

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `shift_express_export_${dateStr}.xlsx`

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    // Download
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return {
      success: true,
      shiftsCount: shifts?.length || 0,
      employeesCount: employees?.length || 0,
      applicationsCount: applications?.length || 0
    }
  } catch (error) {
    logger.error('Export error:', error)
    throw error
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================


function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'partially_filled': 'Partially Filled',
    'filled': 'Filled',
    'canceled': 'Canceled',
    'closed': 'Closed',
    'expired': 'Expired',
  }
  return statusMap[status] || status
}

function translateApplicationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'applied': 'Applied',
    'accepted': 'Accepted',
    'rejected': 'Rejected',
  }
  return statusMap[status] || status
}
