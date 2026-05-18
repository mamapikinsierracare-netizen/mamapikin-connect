// src/app/analytics/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ============ TYPES ============
type PatientStats = {
  total_patients: number
  pregnant_count: number
  breastfeeding_count: number
  child_count: number
  active_accounts: number
  expired_accounts: number
  expiring_soon_30: number
  expiring_soon_7: number
  new_this_week: number
  new_this_month: number
  new_this_year: number
}

type AncStats = {
  total_visits: number
  anc1_count: number
  anc4_count: number
  anc4_completion_rate: number
  high_risk_pregnancies: number
  average_gestational_age: number
  average_weight_gain: number
  danger_signs_reported: number
  referrals_made: number
}

type PncStats = {
  total_visits: number
  pnc1_count: number
  pnc2_count: number
  pnc3_count: number
  pnc1_coverage: number
  exclusive_breastfeeding_rate: number
  epds_high_score_count: number
  mental_health_referrals: number
}

type DeliveryStats = {
  total_deliveries: number
  facility_deliveries: number
  home_deliveries: number
  csection_count: number
  svd_count: number
  csection_rate: number
  pph_cases: number
  maternal_deaths: number
  stillbirths: number
  low_birth_weight: number
  preterm_births: number
}

type ImmunisationStats = {
  total_doses: number
  fully_immunised_children: number
  dropout_rate_dpt1_dpt3: number
  bcg_coverage: number
  penta3_coverage: number
  measles1_coverage: number
  measles2_coverage: number
  defaulters_traced: number
}

type PharmacyStats = {
  total_prescriptions: number
  prescriptions_dispensed: number
  low_stock_items: number
  expired_items: number
  total_inventory_value: number
  most_prescribed_drug: string
  monthly_dispensing_trend: number[]
}

type LabStats = {
  total_requests: number
  pending_requests: number
  processing_requests: number
  completed_requests: number
  abnormal_results: number
  critical_results: number
  average_tat_hours: number
  tests_by_category: Record<string, number>
}

type AuditLogStats = {
  total_actions: number
  actions_by_type: Record<string, number>
  actions_by_user: Record<string, number>
  recent_suspicious_activity: number
  data_exports_count: number
  approval_requests_pending: number
  approval_requests_approved: number
  approval_requests_rejected: number
  most_active_users: { email: string; count: number }[]
  peak_activity_hours: number[]
}

type SecurityStats = {
  failed_logins_last_24h: number
  failed_logins_last_7d: number
  unique_ip_addresses: number
  unusual_access_patterns: number
  rbac_role_changes: number
  password_resets_requested: number
  token_generations: number
  emergency_access_count: number
  potential_brute_force_attempts: number
  api_requests_total: number
  api_requests_rate_limited: number
}

type SystemMonitoringStats = {
  avg_response_time_ms: number
  p95_response_time_ms: number
  error_rate_percentage: number
  api_errors_last_24h: number
  client_errors_4xx: number
  server_errors_5xx: number
  slow_queries_count: number
  memory_usage_mb: number
  cpu_usage_percentage: number
  database_connections: number
  sync_queue_size: number
  sync_failure_rate: number
  last_sync_timestamp: string
}

type PerformanceKpiStats = {
  user_satisfaction_score: number
  average_page_load_time_ms: number
  first_contentful_paint_ms: number
  largest_contentful_paint_ms: number
  cumulative_layout_shift: number
  online_mode_uptime: number
  offline_mode_usage_percentage: number
  data_entry_completeness: number
  duplicate_records_count: number
  referral_completion_rate: number
  critical_alert_response_time_min: number
}

type FacilityStatsItem = {
  facility_name: string
  patient_count: number
  anc_visits: number
  deliveries: number
  lab_requests: number
  prescriptions: number
  immunisation_doses: number
  data_quality_score: number
}

type FacilityStats = FacilityStatsItem[]

type NationalStats = {
  districts_covered: number
  facilities_active: number
  total_health_workers: number
  trained_users: number
  monthly_growth_rate: number
  geographical_coverage_percentage: number
  mch_kpi_summary: {
    maternal_mortality_ratio_estimate: number
    under5_mortality_estimate: number
    anc_coverage_estimate: number
    facility_delivery_rate_estimate: number
  }
}

type ErrorTrackingStats = {
  total_errors_24h: number
  errors_by_type: Record<string, number>
  errors_by_component: Record<string, number>
  unresolved_critical_errors: number
  average_error_resolution_time_hours: number
  top_error_messages: { message: string; count: number }[]
  browser_errors: number
  network_errors: number
  database_errors: number
  auth_errors: number
}

// ============ API HELPERS ==========
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// ============ DEMO DATA FALLBACKS ==========
function getDemoPatientStats(): PatientStats { 
  return { 
    total_patients: 1247, pregnant_count: 432, breastfeeding_count: 256, child_count: 389, 
    active_accounts: 1156, expired_accounts: 91, expiring_soon_30: 78, expiring_soon_7: 23, 
    new_this_week: 45, new_this_month: 187, new_this_year: 1247 
  } 
}

function getDemoAncStats(): AncStats { 
  return { 
    total_visits: 2145, anc1_count: 412, anc4_count: 287, anc4_completion_rate: 68, 
    high_risk_pregnancies: 98, average_gestational_age: 24, average_weight_gain: 8.5, 
    danger_signs_reported: 342, referrals_made: 167 
  } 
}

function getDemoPncStats(): PncStats { 
  return { 
    total_visits: 1123, pnc1_count: 389, pnc2_count: 312, pnc3_count: 245, 
    pnc1_coverage: 72, exclusive_breastfeeding_rate: 65, epds_high_score_count: 89, 
    mental_health_referrals: 45 
  } 
}

function getDemoDeliveryStats(): DeliveryStats { 
  return { 
    total_deliveries: 523, facility_deliveries: 412, home_deliveries: 111, 
    csection_count: 67, svd_count: 432, csection_rate: 12.8, pph_cases: 28, 
    maternal_deaths: 2, stillbirths: 12, low_birth_weight: 45, preterm_births: 56 
  } 
}

function getDemoImmunisationStats(): ImmunisationStats { 
  return { 
    total_doses: 3421, fully_immunised_children: 234, dropout_rate_dpt1_dpt3: 8, 
    bcg_coverage: 85, penta3_coverage: 78, measles1_coverage: 72, measles2_coverage: 55, 
    defaulters_traced: 124 
  } 
}

function getDemoPharmacyStats(): PharmacyStats { 
  return { 
    total_prescriptions: 876, prescriptions_dispensed: 812, low_stock_items: 8, 
    expired_items: 3, total_inventory_value: 45200, most_prescribed_drug: 'Paracetamol', 
    monthly_dispensing_trend: [45,52,48,61,55,72,68,82,78,91,85,95] 
  } 
}

function getDemoLabStats(): LabStats { 
  return { 
    total_requests: 534, pending_requests: 23, processing_requests: 18, 
    completed_requests: 493, abnormal_results: 87, critical_results: 12, average_tat_hours: 28, 
    tests_by_category: { Hematology:145, Biochemistry:234, Immunology:98, Microbiology:67, Parasitology:123 } 
  } 
}

function getDemoAuditLogStats(): AuditLogStats { 
  return { 
    total_actions: 3421, 
    actions_by_type: { LOGIN: 1250, CREATE_PATIENT: 432, EDIT_PATIENT: 187, VIEW_PATIENT: 892, EXPORT_DATA: 45, APPROVE_REQUEST: 87, REJECT_REQUEST: 23 }, 
    actions_by_user: { 'admin@mamapikin.com': 543, 'nurse@mamapikin.com': 876, 'doctor@mamapikin.com': 654, 'lab@mamapikin.com': 432 }, 
    recent_suspicious_activity: 12, 
    data_exports_count: 45, 
    approval_requests_pending: 12, 
    approval_requests_approved: 87, 
    approval_requests_rejected: 23, 
    most_active_users: [ 
      { email: 'nurse@mamapikin.com', count: 876 }, 
      { email: 'doctor@mamapikin.com', count: 654 }, 
      { email: 'admin@mamapikin.com', count: 543 }, 
      { email: 'lab@mamapikin.com', count: 432 } 
    ], 
    peak_activity_hours: [9, 10, 11, 14, 15, 16] 
  } 
}

function getDemoSecurityStats(): SecurityStats { 
  return { 
    failed_logins_last_24h: 8, 
    failed_logins_last_7d: 42, 
    unique_ip_addresses: 127, 
    unusual_access_patterns: 3, 
    rbac_role_changes: 12, 
    password_resets_requested: 24, 
    token_generations: 156, 
    emergency_access_count: 8, 
    potential_brute_force_attempts: 2, 
    api_requests_total: 15432, 
    api_requests_rate_limited: 23 
  } 
}

function getDemoSystemMonitoringStats(): SystemMonitoringStats { 
  return { 
    avg_response_time_ms: 245, 
    p95_response_time_ms: 580, 
    error_rate_percentage: 0.8, 
    api_errors_last_24h: 34, 
    client_errors_4xx: 28, 
    server_errors_5xx: 6, 
    slow_queries_count: 12, 
    memory_usage_mb: 512, 
    cpu_usage_percentage: 34, 
    database_connections: 18, 
    sync_queue_size: 8, 
    sync_failure_rate: 1.2, 
    last_sync_timestamp: new Date().toISOString() 
  } 
}

function getDemoPerformanceKpiStats(): PerformanceKpiStats { 
  return { 
    user_satisfaction_score: 4.2, 
    average_page_load_time_ms: 1250, 
    first_contentful_paint_ms: 850, 
    largest_contentful_paint_ms: 2100, 
    cumulative_layout_shift: 0.08, 
    online_mode_uptime: 99.2, 
    offline_mode_usage_percentage: 15, 
    data_entry_completeness: 87, 
    duplicate_records_count: 23, 
    referral_completion_rate: 68, 
    critical_alert_response_time_min: 4.5 
  } 
}

function getDemoFacilityStats(): FacilityStats { 
  return [ 
    { facility_name: 'Kabala District Hospital', patient_count: 1245, anc_visits: 876, deliveries: 234, lab_requests: 432, prescriptions: 987, immunisation_doses: 1567, data_quality_score: 92 }, 
    { facility_name: 'Bumbuna CHC', patient_count: 876, anc_visits: 543, deliveries: 123, lab_requests: 234, prescriptions: 654, immunisation_doses: 876, data_quality_score: 88 }, 
    { facility_name: 'Mano Dasse PHU', patient_count: 432, anc_visits: 234, deliveries: 56, lab_requests: 98, prescriptions: 321, immunisation_doses: 432, data_quality_score: 76 }, 
    { facility_name: 'Gbentu CHC', patient_count: 654, anc_visits: 432, deliveries: 98, lab_requests: 165, prescriptions: 432, immunisation_doses: 654, data_quality_score: 85 }, 
    { facility_name: 'Freetown MCHP', patient_count: 2100, anc_visits: 1543, deliveries: 432, lab_requests: 765, prescriptions: 1654, immunisation_doses: 2345, data_quality_score: 95 } 
  ] 
}

function getDemoNationalStats(): NationalStats { 
  return { 
    districts_covered: 14, 
    facilities_active: 47, 
    total_health_workers: 342, 
    trained_users: 189, 
    monthly_growth_rate: 8.5, 
    geographical_coverage_percentage: 72, 
    mch_kpi_summary: { 
      maternal_mortality_ratio_estimate: 412, 
      under5_mortality_estimate: 84, 
      anc_coverage_estimate: 67, 
      facility_delivery_rate_estimate: 58 
    } 
  } 
}

function getDemoErrorTrackingStats(): ErrorTrackingStats { 
  return { 
    total_errors_24h: 127, 
    errors_by_type: { validation: 45, network: 32, database: 18, auth: 12, other: 20 }, 
    errors_by_component: { frontend: 67, backend: 38, database: 22 }, 
    unresolved_critical_errors: 3, 
    average_error_resolution_time_hours: 4.2, 
    top_error_messages: [ 
      { message: 'Failed to fetch patient data', count: 45 }, 
      { message: 'Supabase connection timeout', count: 32 }, 
      { message: 'Invalid patient ID format', count: 23 } 
    ], 
    browser_errors: 67, 
    network_errors: 32, 
    database_errors: 18, 
    auth_errors: 10 
  } 
}

// Fetch async wrappers
async function fetchPatientStats(): Promise<PatientStats> { return getDemoPatientStats() }
async function fetchAncStats(): Promise<AncStats> { return getDemoAncStats() }
async function fetchPncStats(): Promise<PncStats> { return getDemoPncStats() }
async function fetchDeliveryStats(): Promise<DeliveryStats> { return getDemoDeliveryStats() }
async function fetchImmunisationStats(): Promise<ImmunisationStats> { return getDemoImmunisationStats() }
async function fetchPharmacyStats(): Promise<PharmacyStats> { return getDemoPharmacyStats() }
async function fetchLabStats(): Promise<LabStats> { return getDemoLabStats() }
async function fetchAuditLogStats(): Promise<AuditLogStats> { return getDemoAuditLogStats() }
async function fetchSecurityStats(): Promise<SecurityStats> { return getDemoSecurityStats() }
async function fetchSystemMonitoringStats(): Promise<SystemMonitoringStats> { return getDemoSystemMonitoringStats() }
async function fetchPerformanceKpiStats(): Promise<PerformanceKpiStats> { return getDemoPerformanceKpiStats() }
async function fetchFacilityStats(): Promise<FacilityStats> { return getDemoFacilityStats() }
async function fetchNationalStats(): Promise<NationalStats> { return getDemoNationalStats() }
async function fetchErrorTrackingStats(): Promise<ErrorTrackingStats> { return getDemoErrorTrackingStats() }

const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899']

export default function AnalyticsPage() {
  const { user } = useRBAC()
  
  // Security Role Check
  const userRole = ((user as any)?.user_metadata?.role || (user as any)?.role || '').toLowerCase()
  const userName = ((user as any)?.user_metadata?.full_name || (user as any)?.email || '').toLowerCase()
  const canViewAnalytics = ['admin', 'master', 'master admin', 'superadmin', 'cmo', 'medical_director', 'facility_admin', 'facility admin'].includes(userRole) || userName.includes('master') || userName.includes('admin')

  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('clinical')
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const reportRef = useRef<HTMLDivElement>(null)
  
  // Filter States for Tables
  const [auditActionFilter, setAuditActionFilter] = useState('')
  const [auditUserFilter, setAuditUserFilter] = useState('')
  const [securityEventFilter, setSecurityEventFilter] = useState('')
  const [nationalDistrictFilter, setNationalDistrictFilter] = useState('')
  const [facilityFilter, setFacilityFilter] = useState('')
  const [errorTypeFilter, setErrorTypeFilter] = useState('')

  // Data States
  const [patientStats, setPatientStats] = useState<PatientStats | null>(null)
  const [ancStats, setAncStats] = useState<AncStats | null>(null)
  const [pncStats, setPncStats] = useState<PncStats | null>(null)
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null)
  const [immunisationStats, setImmunisationStats] = useState<ImmunisationStats | null>(null)
  const [pharmacyStats, setPharmacyStats] = useState<PharmacyStats | null>(null)
  const [labStats, setLabStats] = useState<LabStats | null>(null)
  const [auditStats, setAuditStats] = useState<AuditLogStats | null>(null)
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null)
  const [systemMonitorStats, setSystemMonitorStats] = useState<SystemMonitoringStats | null>(null)
  const [perfKpiStats, setPerfKpiStats] = useState<PerformanceKpiStats | null>(null)
  const [facilityStats, setFacilityStats] = useState<FacilityStats | null>(null)
  const [nationalStats, setNationalStats] = useState<NationalStats | null>(null)
  const [errorStats, setErrorStats] = useState<ErrorTrackingStats | null>(null)

  useEffect(() => {
    async function loadAllStats() {
      setLoading(true)
      const [
        patients, anc, pnc, delivery, immunisation, pharmacy, lab,
        audit, security, systemMonitor, perfKpi, facilities, national, errors
      ] = await Promise.all([
        fetchPatientStats(), fetchAncStats(), fetchPncStats(), fetchDeliveryStats(), fetchImmunisationStats(), fetchPharmacyStats(), fetchLabStats(),
        fetchAuditLogStats(), fetchSecurityStats(), fetchSystemMonitoringStats(), fetchPerformanceKpiStats(), fetchFacilityStats(), fetchNationalStats(), fetchErrorTrackingStats(),
      ])
      setPatientStats(patients)
      setAncStats(anc)
      setPncStats(pnc)
      setDeliveryStats(delivery)
      setImmunisationStats(immunisation)
      setPharmacyStats(pharmacy)
      setLabStats(lab)
      setAuditStats(audit)
      setSecurityStats(security)
      setSystemMonitorStats(systemMonitor)
      setPerfKpiStats(perfKpi)
      setFacilityStats(facilities)
      setNationalStats(national)
      setErrorStats(errors)
      setLoading(false)
    }
    if (canViewAnalytics) loadAllStats()
    else setLoading(false)
  }, [canViewAnalytics])

  // --- EXPORT FUNCTIONS ---
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return
    const keys = Object.keys(data[0])
    const csvContent = [
      keys.join(','), 
      ...data.map(row => keys.map(k => `"${row[k]}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId)
    if (!element) return
    
    const btn = document.getElementById('pdf-btn')
    if(btn) btn.innerHTML = '⏳ Generating PDF...'

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${filename}.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      if(btn) btn.innerHTML = '📥 Download Full PDF Report'
    }
  }

  if (!canViewAnalytics && !loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-red-100 text-red-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-3xl font-black mb-4">🛑 Access Denied</h2>
              <p className="text-lg font-medium">Your current security clearance does not allow access to Executive Analytics.</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  const sections = [
    { id: 'clinical', name: '👥 Clinical KPIs' },
    { id: 'audit', name: '📋 Audit Logs' },
    { id: 'security', name: '🔒 Security' },
    { id: 'system', name: '⚙️ System Monitoring' },
    { id: 'performance', name: '🎯 Performance KPIs' },
    { id: 'facility', name: '🏥 Facility Dashboard' },
    { id: 'national', name: '🇸🇱 National Level' },
    { id: 'errors', name: '🐛 Error Tracking' },
  ]

  // --- PREPARED CHART & TABLE DATA ---
  
  const deliveryChartData = deliveryStats ? [
    { name: 'Spontaneous Vaginal', value: deliveryStats.svd_count },
    { name: 'Cesarean Section', value: deliveryStats.csection_count }
  ] : []

  const auditActionsData = auditStats ? Object.entries(auditStats.actions_by_type).map(([key, val]) => ({ Action: key, Count: val })) : []
  const filteredAuditActions = auditActionsData.filter(d => d.Action.toLowerCase().includes(auditActionFilter.toLowerCase()))
  
  const auditUsersData = auditStats ? auditStats.most_active_users : []
  const filteredAuditUsers = auditUsersData.filter(u => u.email.toLowerCase().includes(auditUserFilter.toLowerCase()))

  const securityTrendData = [
    { day: 'Mon', FailedLogins: 4 }, { day: 'Tue', FailedLogins: 7 }, { day: 'Wed', FailedLogins: 2 },
    { day: 'Thu', FailedLogins: 12 }, { day: 'Fri', FailedLogins: 8 }, { day: 'Sat', FailedLogins: 3 }, { day: 'Sun', FailedLogins: 6 }
  ]
  const securityEventsData = [
    { time: '10:42 AM', event: 'Multiple Failed Logins', ip: '192.168.1.45', severity: 'High' },
    { time: '09:15 AM', event: 'RBAC Role Changed', ip: '10.0.0.12', severity: 'Medium' },
    { time: '08:30 AM', event: 'Emergency Access Used', ip: '172.16.0.5', severity: 'Critical' },
    { time: 'Yesterday', event: 'Unusual Login Location', ip: '45.22.19.8', severity: 'High' },
  ]
  const filteredSecurityEvents = securityEventsData.filter(e => e.event.toLowerCase().includes(securityEventFilter.toLowerCase()) || e.ip.includes(securityEventFilter))

  const systemPerformanceData = [
    { time: '08:00', responseTime: 210 }, { time: '10:00', responseTime: 250 }, { time: '12:00', responseTime: 380 },
    { time: '14:00', responseTime: 290 }, { time: '16:00', responseTime: 220 }, { time: '18:00', responseTime: 180 },
  ]

  const filteredFacilities = facilityStats ? facilityStats.filter(f => f.facility_name.toLowerCase().includes(facilityFilter.toLowerCase())) : []

  const nationalDistrictData = [
    { district: 'Western Area Urban', facilities: 12, coverage: 95 },
    { district: 'Western Area Rural', facilities: 8, coverage: 82 },
    { district: 'Bo', facilities: 6, coverage: 75 },
    { district: 'Kenema', facilities: 7, coverage: 78 },
    { district: 'Makeni', facilities: 5, coverage: 65 },
  ]
  const filteredNationalDistricts = nationalDistrictData.filter(d => d.district.toLowerCase().includes(nationalDistrictFilter.toLowerCase()))

  const errorsChartData = errorStats ? Object.entries(errorStats.errors_by_type).map(([key, val]) => ({ name: key, value: val })) : []
  const filteredErrors = errorsChartData.filter(e => e.name.toLowerCase().includes(errorTypeFilter.toLowerCase()))

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* HEADER & GLOBAL ACTIONS */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-3xl font-black text-green-700">📊 Enterprise Analytics Dashboard</h1>
              <p className="text-gray-600 font-medium mt-1">60+ KPIs for clinical, operational, security, and system monitoring</p>
            </div>
            
            <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <div className="flex bg-gray-100 p-1 rounded-md">
                <button onClick={() => setViewMode('chart')} className={`px-4 py-1.5 text-sm font-bold rounded ${viewMode === 'chart' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📈 Charts</button>
                <button onClick={() => setViewMode('table')} className={`px-4 py-1.5 text-sm font-bold rounded ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📄 Tables</button>
              </div>
              <button id="pdf-btn" onClick={() => exportToPDF('report-container', `MCH_Report_${activeSection}`)} className="bg-gray-900 text-white px-4 py-2 rounded-md font-bold shadow hover:bg-black transition-colors flex items-center gap-2">
                📥 Download PDF Report
              </button>
            </div>
          </div>

          {/* SECTION NAVIGATION TABS */}
          <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
            {sections.map(s => (
              <button 
                key={s.id} 
                onClick={() => setActiveSection(s.id)} 
                className={`px-4 py-2 rounded-t-lg font-bold transition-colors ${activeSection === s.id ? 'bg-green-600 text-white shadow-inner border-b-4 border-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* MAIN CONTENT AREA */}
          {loading ? (
            <div className="text-center py-20 text-gray-400 font-black text-2xl animate-pulse">Loading Deep Analytics Data...</div>
          ) : (
            <div id="report-container" className="bg-transparent rounded pb-10">
              
              {/* ==================== 1. CLINICAL KPIS ==================== */}
              {activeSection === 'clinical' && patientStats && ancStats && pncStats && deliveryStats && immunisationStats && pharmacyStats && labStats && (
                <div className="space-y-8">
                  {/* Demographics Block */}
                  <div>
                    <h2 className="text-xl font-black text-gray-800 mb-4 border-b border-gray-300 pb-2">1. Patient Demographics & Registration</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 text-center"><div className="text-3xl font-black text-green-700">{patientStats.total_patients}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">Total Patients</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-pink-500 text-center"><div className="text-3xl font-black text-pink-600">{patientStats.pregnant_count}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">Pregnant</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 text-center"><div className="text-3xl font-black text-blue-600">{patientStats.breastfeeding_count}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">Breastfeeding</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-teal-500 text-center"><div className="text-3xl font-black text-teal-600">{patientStats.child_count}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">Children Under 5</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-400 text-center"><div className="text-3xl font-black text-green-600">{patientStats.active_accounts}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">Active Accounts</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 text-center bg-red-50"><div className="text-3xl font-black text-red-600">{patientStats.expired_accounts}</div><div className="text-xs font-bold text-red-800 uppercase mt-1">Expired Accounts</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-400 text-center"><div className="text-3xl font-black text-orange-600">{patientStats.expiring_soon_30}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">Expiring 30 Days</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-400 text-center"><div className="text-3xl font-black text-yellow-600">{patientStats.expiring_soon_7}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">Expiring 7 Days</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm text-center"><div className="text-3xl font-black text-gray-800">{patientStats.new_this_week}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">New This Week</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm text-center"><div className="text-3xl font-black text-gray-800">{patientStats.new_this_month}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">New This Month</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm text-center"><div className="text-3xl font-black text-gray-800">{patientStats.new_this_year}</div><div className="text-xs font-bold text-gray-500 uppercase mt-1">New This Year</div></div>
                    </div>
                  </div>

                  {/* ANC Block */}
                  <div>
                    <h2 className="text-xl font-black text-gray-800 mb-4 border-b border-gray-300 pb-2">2. Antenatal Care (ANC)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black">{ancStats.total_visits}</div><div className="text-sm text-gray-500 font-bold">Total ANC Visits</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black">{ancStats.anc1_count}</div><div className="text-sm text-gray-500 font-bold">ANC 1st Visits</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black">{ancStats.anc4_count}</div><div className="text-sm text-gray-500 font-bold">ANC 4th Visits</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black text-green-600">{ancStats.anc4_completion_rate}%</div><div className="text-sm text-gray-500 font-bold">Completion Rate</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-500 bg-red-50"><div className="text-3xl font-black text-red-600">{ancStats.high_risk_pregnancies}</div><div className="text-sm text-red-800 font-bold">High Risk Pregnancies</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black">{ancStats.average_gestational_age} wks</div><div className="text-sm text-gray-500 font-bold">Avg Gestational Age</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black">{ancStats.average_weight_gain} kg</div><div className="text-sm text-gray-500 font-bold">Avg Weight Gain</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-orange-400 bg-orange-50"><div className="text-3xl font-black text-orange-600">{ancStats.danger_signs_reported}</div><div className="text-sm text-orange-800 font-bold">Danger Signs Reported</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black text-blue-600">{ancStats.referrals_made}</div><div className="text-sm text-gray-500 font-bold">Referrals Made</div></div>
                    </div>
                  </div>

                  {/* Delivery & Chart Block */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-yellow-500">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">3. Delivery Outcomes</h2>
                        <button onClick={() => exportToCSV(deliveryChartData, 'Delivery_Outcomes')} className="text-xs font-bold text-green-600 hover:underline">📥 CSV Export</button>
                      </div>
                      
                      {viewMode === 'chart' ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={deliveryChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                                {deliveryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <table className="min-w-full text-left">
                          <thead className="bg-gray-50"><tr><th className="p-3 font-bold text-gray-600">Metric</th><th className="p-3 font-bold text-gray-600">Count / Rate</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            <tr><td className="p-3 font-medium">Total Deliveries</td><td className="p-3 font-bold">{deliveryStats.total_deliveries}</td></tr>
                            <tr><td className="p-3 font-medium">Facility Deliveries</td><td className="p-3 font-bold">{deliveryStats.facility_deliveries}</td></tr>
                            <tr><td className="p-3 font-medium text-orange-600">Home Deliveries</td><td className="p-3 font-bold text-orange-600">{deliveryStats.home_deliveries}</td></tr>
                            <tr><td className="p-3 font-medium">SVD Count</td><td className="p-3 font-bold">{deliveryStats.svd_count}</td></tr>
                            <tr><td className="p-3 font-medium text-yellow-600">C-Section Count</td><td className="p-3 font-bold text-yellow-600">{deliveryStats.csection_count}</td></tr>
                            <tr><td className="p-3 font-medium text-yellow-600">C-Section Rate</td><td className="p-3 font-bold text-yellow-600">{deliveryStats.csection_rate}%</td></tr>
                            <tr className="bg-red-50"><td className="p-3 font-bold text-red-700">PPH Cases Detected</td><td className="p-3 font-black text-red-700">{deliveryStats.pph_cases}</td></tr>
                            <tr className="bg-red-50"><td className="p-3 font-bold text-red-700">Maternal Deaths</td><td className="p-3 font-black text-red-700">{deliveryStats.maternal_deaths}</td></tr>
                            <tr className="bg-red-50"><td className="p-3 font-bold text-red-700">Stillbirths</td><td className="p-3 font-black text-red-700">{deliveryStats.stillbirths}</td></tr>
                            <tr><td className="p-3 font-medium">Low Birth Weight</td><td className="p-3 font-bold">{deliveryStats.low_birth_weight}</td></tr>
                            <tr><td className="p-3 font-medium">Preterm Births</td><td className="p-3 font-bold">{deliveryStats.preterm_births}</td></tr>
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-purple-500">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">4. Postnatal Care (PNC)</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div><div className="text-2xl font-black">{pncStats.total_visits}</div><div className="text-xs text-gray-500 font-bold uppercase">Total Visits</div></div>
                          <div><div className="text-2xl font-black text-green-600">{pncStats.pnc1_coverage}%</div><div className="text-xs text-gray-500 font-bold uppercase">PNC1 Coverage</div></div>
                          <div><div className="text-2xl font-black">{pncStats.exclusive_breastfeeding_rate}%</div><div className="text-xs text-gray-500 font-bold uppercase">Exclusive BF Rate</div></div>
                          <div className="border border-orange-300 bg-orange-50 rounded p-2"><div className="text-2xl font-black text-orange-600">{pncStats.epds_high_score_count}</div><div className="text-xs text-orange-800 font-bold uppercase">EPDS Score ≥13</div></div>
                          <div><div className="text-2xl font-black">{pncStats.pnc2_count}</div><div className="text-xs text-gray-500 font-bold uppercase">PNC2 Count</div></div>
                          <div><div className="text-2xl font-black text-blue-600">{pncStats.mental_health_referrals}</div><div className="text-xs text-gray-500 font-bold uppercase">Mental Health Referrals</div></div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-teal-500">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">5. EPI & Immunisation</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div><div className="text-2xl font-black">{immunisationStats.total_doses}</div><div className="text-xs text-gray-500 font-bold uppercase">Total Doses Given</div></div>
                          <div><div className="text-2xl font-black text-green-600">{immunisationStats.fully_immunised_children}</div><div className="text-xs text-gray-500 font-bold uppercase">Fully Immunised</div></div>
                          <div className="border border-red-300 bg-red-50 rounded p-2"><div className="text-2xl font-black text-red-600">{immunisationStats.dropout_rate_dpt1_dpt3}%</div><div className="text-xs text-red-800 font-bold uppercase">DPT1-3 Dropout</div></div>
                          <div><div className="text-2xl font-black">{immunisationStats.bcg_coverage}%</div><div className="text-xs text-gray-500 font-bold uppercase">BCG Coverage</div></div>
                          <div><div className="text-2xl font-black">{immunisationStats.penta3_coverage}%</div><div className="text-xs text-gray-500 font-bold uppercase">Penta3 Coverage</div></div>
                          <div><div className="text-2xl font-black">{immunisationStats.measles1_coverage}%</div><div className="text-xs text-gray-500 font-bold uppercase">Measles 1 Coverage</div></div>
                          <div><div className="text-2xl font-black text-blue-600">{immunisationStats.defaulters_traced}</div><div className="text-xs text-gray-500 font-bold uppercase">Defaulters Traced</div></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pharmacy & Lab */}
                  <div>
                    <h2 className="text-xl font-black text-gray-800 mb-4 border-b border-gray-300 pb-2">6. Clinical Support Services</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-600"><div className="text-3xl font-black">{pharmacyStats.total_prescriptions}</div><div className="text-sm text-gray-500 font-bold">Total Prescriptions</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black text-green-600">{pharmacyStats.prescriptions_dispensed}</div><div className="text-sm text-gray-500 font-bold">Dispensed</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-500 bg-red-50"><div className="text-3xl font-black text-red-600">{pharmacyStats.low_stock_items}</div><div className="text-sm text-red-800 font-bold">Low Stock Alerts</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-500 bg-red-50"><div className="text-3xl font-black text-red-600">{pharmacyStats.expired_items}</div><div className="text-sm text-red-800 font-bold">Expired Drugs</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black text-gray-800">${pharmacyStats.total_inventory_value.toLocaleString()}</div><div className="text-sm text-gray-500 font-bold">Inventory Value</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-600"><div className="text-3xl font-black">{labStats.total_requests}</div><div className="text-sm text-gray-500 font-bold">Lab Requests</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black text-green-600">{labStats.completed_requests}</div><div className="text-sm text-gray-500 font-bold">Labs Completed</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-500 bg-red-50"><div className="text-3xl font-black text-red-600">{labStats.critical_results}</div><div className="text-sm text-red-800 font-bold">Critical Lab Results</div></div>
                      <div className="bg-white p-4 rounded-xl shadow-sm"><div className="text-3xl font-black">{labStats.average_tat_hours}h</div><div className="text-sm text-gray-500 font-bold">Avg Lab Turnaround</div></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 2. AUDIT LOGS ==================== */}
              {activeSection === 'audit' && auditStats && (
                <div className="space-y-6">
                  {/* Audit KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{auditStats.total_actions}</div><div className="text-gray-500 font-bold uppercase mt-2">Total Audit Actions</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-red-500 bg-red-50"><div className="text-4xl font-black text-red-600">{auditStats.recent_suspicious_activity}</div><div className="text-red-800 font-bold uppercase mt-2">Suspicious Activities</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-blue-600">{auditStats.data_exports_count}</div><div className="text-gray-500 font-bold uppercase mt-2">Data Exports</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-orange-600">{auditStats.approval_requests_pending}</div><div className="text-gray-500 font-bold uppercase mt-2">Pending Approvals</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-green-600">{auditStats.approval_requests_approved}</div><div className="text-gray-500 font-bold uppercase mt-2">Approved Requests</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-red-600">{auditStats.approval_requests_rejected}</div><div className="text-gray-500 font-bold uppercase mt-2">Rejected Requests</div></div>
                  </div>
                  
                  {/* Interactive Chart/Table Area */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Action Types */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg">Actions by Type</h3>
                        <div className="flex gap-2">
                          <button onClick={() => exportToCSV(filteredAuditActions, 'Audit_Actions')} className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-700">📥 CSV</button>
                        </div>
                      </div>
                      
                      {viewMode === 'table' && (
                        <input 
                          type="text" 
                          placeholder="🔍 Filter action type..." 
                          value={auditActionFilter}
                          onChange={(e) => setAuditActionFilter(e.target.value)}
                          className="w-full mb-4 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500 text-sm"
                        />
                      )}

                      {viewMode === 'chart' ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={auditActionsData} layout="vertical" margin={{ left: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" />
                              <YAxis dataKey="Action" type="category" width={100} />
                              <Tooltip />
                              <Bar dataKey="Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto border rounded">
                          <table className="min-w-full text-left">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-3 font-bold">Action Type</th><th className="p-3 font-bold">Count</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                              {filteredAuditActions.length > 0 ? filteredAuditActions.map((d, i) => (
                                <tr key={i} className="hover:bg-gray-50"><td className="p-3 font-medium">{d.Action}</td><td className="p-3 font-black text-blue-700">{d.Count}</td></tr>
                              )) : (<tr><td colSpan={2} className="p-4 text-center text-gray-500">No actions found matching "{auditActionFilter}"</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    
                    {/* Active Users */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg">Most Active Users</h3>
                        <button onClick={() => exportToCSV(filteredAuditUsers, 'Active_Users')} className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-700">📥 CSV</button>
                      </div>

                      {viewMode === 'table' && (
                        <input 
                          type="text" 
                          placeholder="🔍 Filter user email..." 
                          value={auditUserFilter}
                          onChange={(e) => setAuditUserFilter(e.target.value)}
                          className="w-full mb-4 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500 text-sm"
                        />
                      )}

                      {viewMode === 'chart' ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={auditUsersData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="email" hide />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Actions Logged" />
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-center text-gray-500 mt-2">X-Axis hidden for privacy in chart view. Hover to see emails.</p>
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto border rounded">
                          <table className="min-w-full text-left">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-3 font-bold">User Account</th><th className="p-3 font-bold">Actions Logged</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                              {filteredAuditUsers.length > 0 ? filteredAuditUsers.map(u => (
                                <tr key={u.email} className="hover:bg-gray-50"><td className="p-3 font-medium text-gray-700">{u.email}</td><td className="p-3 font-black text-indigo-600">{u.count}</td></tr>
                              )) : (<tr><td colSpan={2} className="p-4 text-center text-gray-500">No users found matching "{auditUserFilter}"</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 3. SECURITY ==================== */}
              {activeSection === 'security' && securityStats && (
                <div className="space-y-6">
                  {/* Top Security Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-red-500"><div className="text-4xl font-black text-red-600">{securityStats.failed_logins_last_24h}</div><div className="text-gray-500 font-bold uppercase mt-2">Failed Logins (24h)</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-orange-500"><div className="text-4xl font-black text-orange-600">{securityStats.failed_logins_last_7d}</div><div className="text-gray-500 font-bold uppercase mt-2">Failed Logins (7d)</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-red-700 bg-red-50"><div className="text-4xl font-black text-red-800">{securityStats.potential_brute_force_attempts}</div><div className="text-red-800 font-bold uppercase mt-2">Brute Force Attempts</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-yellow-500"><div className="text-4xl font-black text-yellow-600">{securityStats.unusual_access_patterns}</div><div className="text-gray-500 font-bold uppercase mt-2">Unusual Patterns</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{securityStats.unique_ip_addresses}</div><div className="text-gray-500 font-bold uppercase mt-2">Unique IPs</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{securityStats.rbac_role_changes}</div><div className="text-gray-500 font-bold uppercase mt-2">Role Changes</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{securityStats.password_resets_requested}</div><div className="text-gray-500 font-bold uppercase mt-2">Password Resets</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{securityStats.token_generations}</div><div className="text-gray-500 font-bold uppercase mt-2">Tokens Generated</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-purple-500"><div className="text-4xl font-black text-purple-600">{securityStats.emergency_access_count}</div><div className="text-gray-500 font-bold uppercase mt-2">Emergency Accesses</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{securityStats.api_requests_total.toLocaleString()}</div><div className="text-gray-500 font-bold uppercase mt-2">Total API Requests</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-red-500"><div className="text-4xl font-black text-red-600">{securityStats.api_requests_rate_limited}</div><div className="text-gray-500 font-bold uppercase mt-2">Rate Limited Requests</div></div>
                  </div>

                  {/* Security Charts and Tables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Failed Logins Trend */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg">Failed Logins Trend (7 Days)</h3>
                        <button onClick={() => exportToCSV(securityTrendData, 'Failed_Logins')} className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-700">📥 CSV</button>
                      </div>
                      
                      {viewMode === 'chart' ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={securityTrendData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="day" />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="FailedLogins" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto border rounded">
                          <table className="min-w-full text-left">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-3 font-bold">Day</th><th className="p-3 font-bold">Failed Logins</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                              {securityTrendData.map((d, i) => <tr key={i} className="hover:bg-gray-50"><td className="p-3 font-medium">{d.day}</td><td className="p-3 font-black text-red-600">{d.FailedLogins}</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Recent Security Events */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg">Recent Security Events Log</h3>
                        <button onClick={() => exportToCSV(filteredSecurityEvents, 'Security_Events')} className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-700">📥 CSV</button>
                      </div>

                      <input 
                        type="text" 
                        placeholder="🔍 Search event or IP address..." 
                        value={securityEventFilter}
                        onChange={(e) => setSecurityEventFilter(e.target.value)}
                        className="w-full mb-4 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-500 text-sm"
                      />

                      <div className="max-h-56 overflow-y-auto border rounded">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr><th className="p-2 font-bold">Time</th><th className="p-2 font-bold">Event</th><th className="p-2 font-bold">IP Address</th><th className="p-2 font-bold">Severity</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filteredSecurityEvents.length > 0 ? filteredSecurityEvents.map((e, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="p-2 text-gray-500">{e.time}</td>
                                <td className="p-2 font-medium">{e.event}</td>
                                <td className="p-2 font-mono text-xs">{e.ip}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${e.severity === 'Critical' ? 'bg-red-100 text-red-800' : e.severity === 'High' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {e.severity}
                                  </span>
                                </td>
                              </tr>
                            )) : (<tr><td colSpan={4} className="p-4 text-center text-gray-500">No events found matching "{securityEventFilter}"</td></tr>)}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ==================== 4. SYSTEM MONITORING ==================== */}
              {activeSection === 'system' && systemMonitorStats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{systemMonitorStats.avg_response_time_ms}ms</div><div className="text-gray-500 font-bold uppercase mt-2">Avg Response Time</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{systemMonitorStats.p95_response_time_ms}ms</div><div className="text-gray-500 font-bold uppercase mt-2">P95 Response Time</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-yellow-500"><div className="text-4xl font-black text-yellow-600">{systemMonitorStats.error_rate_percentage}%</div><div className="text-gray-500 font-bold uppercase mt-2">System Error Rate</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{systemMonitorStats.api_errors_last_24h}</div><div className="text-gray-500 font-bold uppercase mt-2">API Errors (24h)</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-orange-600">{systemMonitorStats.client_errors_4xx}</div><div className="text-gray-500 font-bold uppercase mt-2">Client Errors (4xx)</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-red-600 bg-red-50"><div className="text-4xl font-black text-red-700">{systemMonitorStats.server_errors_5xx}</div><div className="text-red-800 font-bold uppercase mt-2">Server Errors (5xx)</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{systemMonitorStats.slow_queries_count}</div><div className="text-gray-500 font-bold uppercase mt-2">Slow DB Queries</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{systemMonitorStats.database_connections}</div><div className="text-gray-500 font-bold uppercase mt-2">Active DB Connections</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{systemMonitorStats.cpu_usage_percentage}%</div><div className="text-gray-500 font-bold uppercase mt-2">Server CPU Usage</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{systemMonitorStats.memory_usage_mb} MB</div><div className="text-gray-500 font-bold uppercase mt-2">Server Memory Usage</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-blue-600">{systemMonitorStats.sync_queue_size}</div><div className="text-gray-500 font-bold uppercase mt-2">Offline Sync Queue Size</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-red-600">{systemMonitorStats.sync_failure_rate}%</div><div className="text-gray-500 font-bold uppercase mt-2">Sync Failure Rate</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm md:col-span-2 bg-green-50 border border-green-200"><div className="text-2xl font-black text-green-800">{new Date(systemMonitorStats.last_sync_timestamp).toLocaleString()}</div><div className="text-green-700 font-bold uppercase mt-2">Last Successful Cloud Sync</div></div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm relative">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-xl text-gray-800">API Response Time (Last 12 Hours)</h3>
                      <button onClick={() => exportToCSV(systemPerformanceData, 'System_Performance')} className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-700">📥 CSV</button>
                    </div>
                    
                    {viewMode === 'chart' ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={systemPerformanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="responseTime" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} name="Response Time (ms)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <table className="min-w-full text-left">
                        <thead className="bg-gray-100"><tr><th className="p-3 font-bold">Time</th><th className="p-3 font-bold">Avg Response Time (ms)</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">
                          {systemPerformanceData.map((d, i) => <tr key={i} className="hover:bg-gray-50"><td className="p-3 font-medium">{d.time}</td><td className="p-3 font-black text-purple-600">{d.responseTime}ms</td></tr>)}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ==================== 5. PERFORMANCE KPIS ==================== */}
              {activeSection === 'performance' && perfKpiStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-green-500"><div className="text-4xl font-black text-green-600">{perfKpiStats.user_satisfaction_score}/5</div><div className="text-gray-500 font-bold uppercase mt-2">User Satisfaction</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{perfKpiStats.average_page_load_time_ms}ms</div><div className="text-gray-500 font-bold uppercase mt-2">Avg Page Load Time</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{perfKpiStats.first_contentful_paint_ms}ms</div><div className="text-gray-500 font-bold uppercase mt-2">First Contentful Paint</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{perfKpiStats.largest_contentful_paint_ms}ms</div><div className="text-gray-500 font-bold uppercase mt-2">Largest Contentful Paint</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{perfKpiStats.cumulative_layout_shift}</div><div className="text-gray-500 font-bold uppercase mt-2">Cumulative Layout Shift</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-blue-500"><div className="text-4xl font-black text-blue-600">{perfKpiStats.online_mode_uptime}%</div><div className="text-gray-500 font-bold uppercase mt-2">Online Core Uptime</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-gray-800"><div className="text-4xl font-black">{perfKpiStats.offline_mode_usage_percentage}%</div><div className="text-gray-500 font-bold uppercase mt-2">Offline Mode Usage</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-green-600">{perfKpiStats.data_entry_completeness}%</div><div className="text-gray-500 font-bold uppercase mt-2">Data Entry Completeness</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-red-500 bg-red-50"><div className="text-4xl font-black text-red-600">{perfKpiStats.duplicate_records_count}</div><div className="text-red-800 font-bold uppercase mt-2">Duplicate Records Detected</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{perfKpiStats.referral_completion_rate}%</div><div className="text-gray-500 font-bold uppercase mt-2">Referral Completion Rate</div></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-orange-500"><div className="text-4xl font-black text-orange-600">{perfKpiStats.critical_alert_response_time_min} min</div><div className="text-gray-500 font-bold uppercase mt-2">Avg Critical Alert Response</div></div>
                </div>
              )}

              {/* ==================== 6. FACILITY DASHBOARD ==================== */}
              {activeSection === 'facility' && facilityStats && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="font-black text-xl text-gray-800">Facility Performance Comparison</h3>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => exportToCSV(filteredFacilities, 'Facility_Comparison')} className="text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded shadow hover:bg-blue-700">📥 CSV</button>
                    </div>
                  </div>

                  {viewMode === 'table' && (
                    <div className="p-4 border-b bg-gray-50">
                      <input 
                        type="text" 
                        placeholder="🔍 Filter by facility name..." 
                        value={facilityFilter}
                        onChange={(e) => setFacilityFilter(e.target.value)}
                        className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500 text-sm"
                      />
                    </div>
                  )}

                  {viewMode === 'chart' ? (
                    <div className="p-6 h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={facilityStats} layout="vertical" margin={{ left: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis dataKey="facility_name" type="category" width={150} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="patient_count" fill="#3b82f6" name="Total Patients" />
                          <Bar dataKey="deliveries" fill="#10b981" name="Deliveries" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead className="bg-gray-800 text-white">
                          <tr>
                            <th className="p-4 font-bold">Facility Name</th>
                            <th className="p-4 font-bold">Total Patients</th>
                            <th className="p-4 font-bold">ANC Visits</th>
                            <th className="p-4 font-bold">Deliveries</th>
                            <th className="p-4 font-bold">Lab Requests</th>
                            <th className="p-4 font-bold">Prescriptions</th>
                            <th className="p-4 font-bold">EPI Doses</th>
                            <th className="p-4 font-bold">Data Quality Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredFacilities.length > 0 ? filteredFacilities.map(f => (
                            <tr key={f.facility_name} className="hover:bg-blue-50 transition-colors">
                              <td className="p-4 font-black text-gray-800">{f.facility_name}</td>
                              <td className="p-4 font-medium">{f.patient_count}</td>
                              <td className="p-4 font-medium">{f.anc_visits}</td>
                              <td className="p-4 font-black text-blue-600">{f.deliveries}</td>
                              <td className="p-4 font-medium">{f.lab_requests}</td>
                              <td className="p-4 font-medium">{f.prescriptions}</td>
                              <td className="p-4 font-medium">{f.immunisation_doses}</td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-black shadow-sm ${f.data_quality_score >= 90 ? 'bg-green-100 text-green-800 border border-green-300' : f.data_quality_score >= 70 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                                  {f.data_quality_score}%
                                </span>
                              </td>
                            </tr>
                          )) : (<tr><td colSpan={8} className="p-6 text-center text-gray-500">No facilities matching "{facilityFilter}"</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ==================== 7. NATIONAL LEVEL ==================== */}
              {activeSection === 'national' && nationalStats && (
                <div className="space-y-6">
                  {/* National Top Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center border-b-8 border-blue-600"><div className="text-4xl font-black text-blue-700">{nationalStats.districts_covered}/16</div><div className="text-gray-500 font-bold uppercase mt-2">Districts Covered</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center border-b-8 border-green-600"><div className="text-4xl font-black text-green-700">{nationalStats.facilities_active}</div><div className="text-gray-500 font-bold uppercase mt-2">Active Facilities</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center border-b-8 border-indigo-600"><div className="text-4xl font-black text-indigo-700">{nationalStats.total_health_workers}</div><div className="text-gray-500 font-bold uppercase mt-2">Health Workers Active</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center border-b-8 border-teal-500"><div className="text-4xl font-black text-teal-600">{nationalStats.geographical_coverage_percentage}%</div><div className="text-gray-500 font-bold uppercase mt-2">Geographical Coverage</div></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* District Breakdown */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg">District Health Infrastructure</h3>
                        <button onClick={() => exportToCSV(filteredNationalDistricts, 'District_Data')} className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-700">📥 CSV</button>
                      </div>

                      {viewMode === 'table' && (
                        <input 
                          type="text" 
                          placeholder="🔍 Filter by district..." 
                          value={nationalDistrictFilter}
                          onChange={(e) => setNationalDistrictFilter(e.target.value)}
                          className="w-full mb-4 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500 text-sm"
                        />
                      )}

                      {viewMode === 'chart' ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={nationalDistrictData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="district" />
                              <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                              <Tooltip />
                              <Legend />
                              <Bar yAxisId="left" dataKey="facilities" fill="#3b82f6" name="Facilities" radius={[4, 4, 0, 0]} />
                              <Bar yAxisId="right" dataKey="coverage" fill="#10b981" name="Coverage (%)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto border rounded">
                          <table className="min-w-full text-left">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-3 font-bold">District</th><th className="p-3 font-bold">Facilities</th><th className="p-3 font-bold">Coverage %</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                              {filteredNationalDistricts.length > 0 ? filteredNationalDistricts.map((d, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="p-3 font-medium">{d.district}</td>
                                  <td className="p-3 font-bold text-blue-600">{d.facilities}</td>
                                  <td className="p-3 font-bold text-green-600">{d.coverage}%</td>
                                </tr>
                              )) : (<tr><td colSpan={3} className="p-4 text-center text-gray-500">No districts found matching "{nationalDistrictFilter}"</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* MCH KPI Estimates */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-gray-800">
                      <h3 className="font-black text-lg mb-6">National MCH KPI Estimates</h3>
                      <div className="space-y-6">
                        <div className="bg-red-50 p-6 rounded-xl border border-red-200 flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-red-800 uppercase tracking-wider">Maternal Mortality Ratio</div>
                            <div className="text-xs text-gray-500">Per 100,000 live births</div>
                          </div>
                          <div className="text-4xl font-black text-red-600">{nationalStats.mch_kpi_summary.maternal_mortality_ratio_estimate}</div>
                        </div>
                        
                        <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-orange-800 uppercase tracking-wider">Under-5 Mortality Rate</div>
                            <div className="text-xs text-gray-500">Per 1,000 live births</div>
                          </div>
                          <div className="text-4xl font-black text-orange-600">{nationalStats.mch_kpi_summary.under5_mortality_estimate}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                            <div className="text-3xl font-black text-green-700">{nationalStats.mch_kpi_summary.anc_coverage_estimate}%</div>
                            <div className="text-xs font-bold text-green-900 uppercase mt-1">ANC 4+ Coverage</div>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                            <div className="text-3xl font-black text-blue-700">{nationalStats.mch_kpi_summary.facility_delivery_rate_estimate}%</div>
                            <div className="text-xs font-bold text-blue-900 uppercase mt-1">Facility Delivery Rate</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 8. ERROR TRACKING ==================== */}
              {activeSection === 'errors' && errorStats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-red-500"><div className="text-4xl font-black text-red-600">{errorStats.total_errors_24h}</div><div className="text-gray-500 font-bold uppercase mt-2">Total Errors (24h)</div></div>
                    <div className="bg-red-50 p-6 rounded-xl shadow-sm border-2 border-red-500"><div className="text-4xl font-black text-red-800">{errorStats.unresolved_critical_errors}</div><div className="text-red-800 font-bold uppercase mt-2">Unresolved Critical</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black text-blue-600">{errorStats.average_error_resolution_time_hours}h</div><div className="text-gray-500 font-bold uppercase mt-2">Avg Resolution Time</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-t-8 border-orange-500"><div className="text-4xl font-black text-orange-600">{errorStats.network_errors}</div><div className="text-gray-500 font-bold uppercase mt-2">Network Sync Errors</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{errorStats.browser_errors}</div><div className="text-gray-500 font-bold uppercase mt-2">Browser Errors</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{errorStats.database_errors}</div><div className="text-gray-500 font-bold uppercase mt-2">Database Errors</div></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm"><div className="text-4xl font-black">{errorStats.auth_errors}</div><div className="text-gray-500 font-bold uppercase mt-2">Authentication Errors</div></div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm relative">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-xl text-gray-800">Errors by Type</h3>
                        <button onClick={() => exportToCSV(errorsChartData, 'Errors_By_Type')} className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded shadow hover:bg-blue-700">📥 CSV</button>
                      </div>

                      {viewMode === 'table' && (
                        <input 
                          type="text" 
                          placeholder="🔍 Filter error type..." 
                          value={errorTypeFilter}
                          onChange={(e) => setErrorTypeFilter(e.target.value)}
                          className="w-full mb-4 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-500 text-sm"
                        />
                      )}
                      
                      {viewMode === 'chart' ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={errorsChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#ef4444" name="Error Count" radius={[4,4,0,0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto border rounded">
                          <table className="min-w-full text-left">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-3 font-bold">Error Type</th><th className="p-3 font-bold">Count</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                              {filteredErrors.length > 0 ? filteredErrors.map((d, i) => (
                                <tr key={i} className="hover:bg-gray-50"><td className="p-3 font-medium capitalize">{d.name}</td><td className="p-3 font-black text-red-600">{d.value}</td></tr>
                              )) : (<tr><td colSpan={2} className="p-4 text-center text-gray-500">No errors found matching "{errorTypeFilter}"</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm">
                      <h3 className="font-black text-xl text-gray-800 mb-6">Top Error Messages</h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                        {errorStats.top_error_messages.map((e, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex justify-between items-center">
                            <span className="font-mono text-sm text-red-600 font-bold truncate pr-4">{e.message}</span>
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-black text-sm">{e.count} hits</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}