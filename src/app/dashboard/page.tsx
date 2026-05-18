// src/app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import RoleGuard from '@/components/RoleGuard'

// --- Interfaces ---
type Patient = { patient_id: string, registered_at: string, is_pregnant: boolean, is_child_under_5: boolean }
type AncVisit = { visit_id: string, is_high_risk: boolean, visit_date: string }
type Delivery = { delivery_id: string, mode_of_delivery: string, maternal_outcome: string, estimated_blood_loss: number, delivery_date: string }
type PncVisit = { visit_id: string, epds_score: number, visit_date: string }
type Immunisation = { immunisation_id: string, vaccine_name: string, was_missed: boolean, administration_date: string }

export default function CmoDashboard() {
  const [loading, setLoading] = useState(true)
  
  // Metrics State
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    pregnantWomen: 0,
    childrenUnder5: 0,
    totalDeliveries: 0,
    cSectionRate: 0,
    svdRate: 0,
    totalAncVisits: 0,
    highRiskAncRate: 0,
    totalVaccines: 0,
    missedVaccines: 0,
    pphIncidents: 0,
    epdsAlerts: 0
  })

  // Recent Critical Alerts
  const [criticalAlerts, setCriticalAlerts] = useState<{date: string, type: string, message: string, patient_id: string}[]>([])

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)
      try {
        // Fetch all data from localStorage first (simulating our robust offline-first architecture)
        const patients: Patient[] = JSON.parse(localStorage.getItem('offline_patients') || '[]')
        
        // Helper to grab all locally saved clinical data across all patients
        const getAllLocal = (prefix: string) => {
          let all: any[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith(prefix)) {
              all = [...all, ...JSON.parse(localStorage.getItem(key) || '[]')]
            }
          }
          return all
        }

        const ancVisits: AncVisit[] = getAllLocal('anc_visits_')
        const deliveries: Delivery[] = getAllLocal('deliveries_')
        const pncVisits: PncVisit[] = getAllLocal('pnc_visits_')
        const immunisations: Immunisation[] = getAllLocal('immunisations_')

        // --- Calculate KPIs ---
        const totalDeliveries = deliveries.length
        const cSections = deliveries.filter(d => d.mode_of_delivery.toLowerCase().includes('c-section')).length
        const svds = totalDeliveries - cSections
        
        const totalAnc = ancVisits.length
        const highRiskAnc = ancVisits.filter(a => a.is_high_risk).length
        
        const pphCases = deliveries.filter(d => d.estimated_blood_loss >= 500 && !d.mode_of_delivery.toLowerCase().includes('c-section')).length
        const depressionAlerts = pncVisits.filter(p => (p.epds_score || 0) >= 10).length

        setMetrics({
          totalPatients: patients.length,
          pregnantWomen: patients.filter(p => p.is_pregnant).length,
          childrenUnder5: patients.filter(p => p.is_child_under_5).length,
          totalDeliveries,
          cSectionRate: totalDeliveries > 0 ? Math.round((cSections / totalDeliveries) * 100) : 0,
          svdRate: totalDeliveries > 0 ? Math.round((svds / totalDeliveries) * 100) : 0,
          totalAncVisits: totalAnc,
          highRiskAncRate: totalAnc > 0 ? Math.round((highRiskAnc / totalAnc) * 100) : 0,
          totalVaccines: immunisations.filter(i => !i.was_missed).length,
          missedVaccines: immunisations.filter(i => i.was_missed).length,
          pphIncidents: pphCases,
          epdsAlerts: depressionAlerts
        })

        // --- Generate Critical Action Items ---
        const alerts = []
        if (pphCases > 0) alerts.push({ date: new Date().toISOString(), type: 'DELIVERY', message: `${pphCases} cases of Postpartum Hemorrhage detected recently.`, patient_id: 'SYSTEM' })
        if (depressionAlerts > 0) alerts.push({ date: new Date().toISOString(), type: 'PNC', message: `${depressionAlerts} mothers flagged for Postpartum Depression (EPDS >= 10).`, patient_id: 'SYSTEM' })
        if (highRiskAnc > 0) alerts.push({ date: new Date().toISOString(), type: 'ANC', message: `${highRiskAnc} current pregnancies marked as High-Risk.`, patient_id: 'SYSTEM' })
        
        setCriticalAlerts(alerts)

      } catch (error) {
        console.error("Dashboard error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <RoleGuard allowedRoles={['admin', 'cmo', 'medical_director']}>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="text-xl font-bold text-gray-500 animate-pulse">Compiling Hospital Analytics...</div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['admin', 'cmo', 'medical_director']}>
      <Navigation />
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Chief Medical Officer Analytics</h1>
              <p className="text-gray-600 font-medium mt-1">Real-time hospital facility overview and clinical metrics</p>
            </div>
            <div className="hidden md:block">
              <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold border border-green-300">
                🟢 Live Data Active
              </span>
            </div>
          </div>

          {/* Top Row: Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-indigo-500">
              <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Patients</div>
              <div className="text-4xl font-black text-gray-800">{metrics.totalPatients}</div>
              <div className="text-sm text-gray-600 mt-2 font-medium">
                <span className="text-indigo-600">{metrics.pregnantWomen}</span> Pregnant | <span className="text-indigo-600">{metrics.childrenUnder5}</span> Under-5
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-pink-500">
              <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total ANC Visits</div>
              <div className="text-4xl font-black text-gray-800">{metrics.totalAncVisits}</div>
              <div className="text-sm mt-2 font-medium">
                <span className={`${metrics.highRiskAncRate > 15 ? 'text-red-600 font-bold' : 'text-orange-500'}`}>
                  {metrics.highRiskAncRate}% High Risk
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500">
              <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Deliveries</div>
              <div className="text-4xl font-black text-gray-800">{metrics.totalDeliveries}</div>
              <div className="text-sm text-gray-600 mt-2 font-medium">
                SVD: <span className="text-green-600">{metrics.svdRate}%</span> | C-S: <span className="text-yellow-600">{metrics.cSectionRate}%</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-teal-500">
              <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Vaccines Given</div>
              <div className="text-4xl font-black text-gray-800">{metrics.totalVaccines}</div>
              <div className="text-sm mt-2 font-medium">
                <span className={`${metrics.missedVaccines > 0 ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                  {metrics.missedVaccines} Missed Doses
                </span>
              </div>
            </div>

          </div>

          {/* Middle Row: Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Delivery Modes Chart */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Mode of Delivery Breakdown</h2>
              {metrics.totalDeliveries === 0 ? (
                <div className="text-center text-gray-500 py-8">No delivery data available yet.</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-1 font-bold">
                      <span className="text-green-700">Spontaneous Vaginal (SVD)</span>
                      <span className="text-gray-700">{metrics.svdRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div className="bg-green-500 h-6 rounded-full" style={{ width: `${metrics.svdRate}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1 font-bold">
                      <span className="text-yellow-700">Cesarean Section (C-Section)</span>
                      <span className="text-gray-700">{metrics.cSectionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div className="bg-yellow-500 h-6 rounded-full" style={{ width: `${metrics.cSectionRate}%` }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quality of Care Guardrails */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Quality of Care Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 text-center ${metrics.pphIncidents > 0 ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
                  <div className="text-3xl mb-2">🩸</div>
                  <div className={`text-2xl font-black ${metrics.pphIncidents > 0 ? 'text-red-700' : 'text-green-700'}`}>{metrics.pphIncidents}</div>
                  <div className="text-sm font-bold text-gray-600">PPH Cases Detected</div>
                </div>
                
                <div className={`p-4 rounded-lg border-2 text-center ${metrics.epdsAlerts > 0 ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'}`}>
                  <div className="text-3xl mb-2">🧠</div>
                  <div className={`text-2xl font-black ${metrics.epdsAlerts > 0 ? 'text-orange-700' : 'text-green-700'}`}>{metrics.epdsAlerts}</div>
                  <div className="text-sm font-bold text-gray-600">PPD Alerts (EPDS)</div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row: Actionable Alerts */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="bg-gray-800 p-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🚨 Critical System Alerts
              </h2>
            </div>
            <div className="p-0">
              {criticalAlerts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 font-medium">All clinical metrics are within safe operational limits.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {criticalAlerts.map((alert, idx) => (
                    <li key={idx} className="p-4 hover:bg-gray-50 flex items-start gap-4">
                      <div className="mt-1">
                        {alert.type === 'DELIVERY' ? '🩸' : alert.type === 'PNC' ? '🧠' : '⚠️'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-900">{alert.message}</span>
                          <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded">{alert.type}</span>
                        </div>
                        <p className="text-sm text-red-600 font-medium mt-1">Requires Medical Director Review</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  )
}