// src/app/pnc/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { saveOffline } from '@/lib/db'

// Types
type Patient = {
  patient_id: string
  full_name: string
  phone: string | null
  district: string | null
  village: string | null
  date_of_birth: string | null
}

type PncVisit = {
  id?: string | number
  visit_id: string
  patient_id: string
  visit_number: number
  visit_type: string
  days_after_delivery: number | null
  mother_weight: number | null
  mother_bp_systolic: number | null
  mother_bp_diastolic: number | null
  mother_temperature: number | null
  lochia: string
  perineal_condition: string
  breastfeeding_status: string
  breastfeeding_difficulties: string
  family_planning_method: string
  baby_weight: number | null
  baby_temperature: number | null
  baby_jaundice: string
  baby_feeding: string
  baby_cord_condition: string
  mother_danger_signs: string[]
  baby_danger_signs: string[]
  epds_score: number | null
  epds_answers: number[]
  needs_mental_health_referral: boolean
  is_high_risk: boolean
  risk_notes: string
  next_visit_date: string | null
  notes: string
  visit_date: string
  synced_to_cloud: boolean
}

// Helper function for safe string
function safeString(value: any): string {
  if (!value || value === null || value === undefined) return ''
  return String(value)
}

// Check Supabase connection
async function isSupabaseReachable(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return false
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?limit=1`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` },
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response.status === 200 || response.status === 206
  } catch { return false }
}

// Get all patients
async function getAllPatients(): Promise<Patient[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const results: Patient[] = []
  const seenIds = new Set<string>()
  
  // Local storage
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
    try {
      const localList: Patient[] = JSON.parse(localPatients)
      localList.forEach(p => {
        if (p && p.patient_id && !seenIds.has(p.patient_id)) {
          seenIds.add(p.patient_id)
          results.push({
            patient_id: safeString(p.patient_id),
            full_name: safeString(p.full_name),
            phone: p.phone || null,
            district: p.district || null,
            village: p.village || null,
            date_of_birth: p.date_of_birth || null
          })
        }
      })
    } catch (e) { console.error(e) }
  }
  
  // Supabase
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?select=patient_id,full_name,phone,district,village,date_of_birth&order=full_name`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudPatients: Patient[] = await response.json()
        cloudPatients.forEach(p => {
          if (p && p.patient_id && !seenIds.has(p.patient_id)) {
            seenIds.add(p.patient_id)
            results.push({
              patient_id: safeString(p.patient_id),
              full_name: safeString(p.full_name),
              phone: p.phone || null,
              district: p.district || null,
              village: p.village || null,
              date_of_birth: p.date_of_birth || null
            })
          }
        })
      }
    } catch { /* ignore */ }
  }
  
  return results.sort((a, b) => safeString(a.full_name).localeCompare(safeString(b.full_name)))
}

// Get existing PNC visits
async function getPatientPncVisits(patientId: string): Promise<PncVisit[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `pnc_visits_${patientId}`
  const localVisits = localStorage.getItem(localKey)
  const localList: PncVisit[] = localVisits ? JSON.parse(localVisits) : []
  
  let cloudList: PncVisit[] = []
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/pnc_visits?patient_id=eq.${patientId}&order=visit_number.asc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        cloudList = await response.json()
      }
    } catch { /* ignore */ }
  }
  
  const allVisits = [...localList, ...cloudList]
  return allVisits.sort((a, b) => a.visit_number - b.visit_number)
}

// EPDS Questions (Edinburgh Postnatal Depression Scale)
const epdsQuestions = [
  "I have been able to laugh and see the funny side of things",
  "I have looked forward with enjoyment to things",
  "I have blamed myself unnecessarily when things went wrong",
  "I have been anxious or worried for no good reason",
  "I have felt scared or panicky for no very good reason",
  "Things have been getting on top of me",
  "I have been so unhappy that I have had difficulty sleeping",
  "I have felt sad or miserable",
  "I have been so unhappy that I have been crying",
  "The thought of harming myself has occurred to me"
]

// Calculate EPDS score and determine action
function calculateEpdsScore(answers: number[]): { score: number; action: string; needsReferral: boolean } {
  const score = answers.reduce((sum, val) => sum + val, 0)
  if (score >= 13) return { score, action: '🔴 IMMEDIATE psychiatric referral needed', needsReferral: true }
  if (score >= 10) return { score, action: '🟠 Possible depression - schedule follow-up', needsReferral: false }
  return { score, action: '🟢 Normal range - routine care', needsReferral: false }
}

// Check mother danger signs alerts
function checkMotherAlerts(visit: Partial<PncVisit>): string[] {
  const alerts: string[] = []
  if (visit.mother_bp_systolic && visit.mother_bp_systolic >= 140) {
    alerts.push('🔴 HIGH BP (≥140) - Possible Postpartum Preeclampsia')
  }
  if (visit.mother_temperature && visit.mother_temperature >= 38.5) {
    alerts.push('🔴 HIGH FEVER (≥38.5°C) - Possible Puerperal Sepsis')
  }
  if (visit.lochia === 'Heavy' || visit.lochia === 'Foul-smelling') {
    alerts.push('🔴 ABNORMAL LOCHIA - High risk of late PPH or Infection')
  }
  if (visit.perineal_condition === 'Signs of infection' || visit.perineal_condition === 'Wound breakdown') {
    alerts.push('🟠 PERINEAL COMPLICATION - Needs treatment/review')
  }
  if (visit.mother_danger_signs && visit.mother_danger_signs.length > 0) {
    alerts.push('🔴 DANGER SIGNS PRESENT - Urgent medical review needed')
  }
  return alerts
}

// Check baby danger signs alerts
function checkBabyAlerts(visit: Partial<PncVisit>): string[] {
  const alerts: string[] = []
  if (visit.baby_weight && visit.baby_weight < 2.5) {
    alerts.push('🔴 LOW BIRTH WEIGHT (<2.5kg) - Monitor closely')
  }
  if (visit.baby_temperature && visit.baby_temperature < 36.5) {
    alerts.push('🔴 HYPOTHERMIA (<36.5°C) - Kangaroo Mother Care required')
  }
  if (visit.baby_temperature && visit.baby_temperature >= 38) {
    alerts.push('🔴 NEONATAL FEVER (≥38°C) - Suspected Sepsis')
  }
  if (visit.baby_jaundice === 'Severe') {
    alerts.push('🔴 SEVERE JAUNDICE - Immediate phototherapy referral')
  }
  if (visit.baby_feeding === 'Poor feeding' || visit.baby_feeding === 'Not at all') {
    alerts.push('🔴 POOR FEEDING - High risk of dehydration/hypoglycemia')
  }
  if (visit.baby_cord_condition === 'Signs of infection') {
    alerts.push('🟠 CORD INFECTION - Treat for Omphalitis')
  }
  if (visit.baby_danger_signs && visit.baby_danger_signs.length > 0) {
    alerts.push('🔴 NEONATAL DANGER SIGNS - Urgent medical review needed')
  }
  return alerts
}

export default function PncPage() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [searchTerm, setSearchTerm] = useState('')
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [existingVisits, setExistingVisits] = useState<PncVisit[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  
  // Triage States
  const [motherAlerts, setMotherAlerts] = useState<string[]>([])
  const [babyAlerts, setBabyAlerts] = useState<string[]>([])
  const [epdsScore, setEpdsScore] = useState<{ score: number; action: string; needsReferral: boolean } | null>(null)
  const [isCritical, setIsCritical] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState<Partial<PncVisit>>({
    visit_number: 1,
    visit_type: 'PNC1',
    days_after_delivery: null,
    mother_weight: null,
    mother_bp_systolic: null,
    mother_bp_diastolic: null,
    mother_temperature: null,
    lochia: 'Normal',
    perineal_condition: 'Healing well',
    breastfeeding_status: 'Exclusive',
    breastfeeding_difficulties: '',
    family_planning_method: 'None',
    baby_weight: null,
    baby_temperature: null,
    baby_jaundice: 'None',
    baby_feeding: 'Effective',
    baby_cord_condition: 'Dry, healing',
    mother_danger_signs: [],
    baby_danger_signs: [],
    epds_answers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    needs_mental_health_referral: false,
    is_high_risk: false,
    risk_notes: '',
    notes: '',
  })

  // Check connection status
  useEffect(() => {
    async function checkConnection() {
      const online = await isSupabaseReachable()
      setConnectionStatus(online ? 'online' : 'offline')
    }
    checkConnection()
    const interval = setInterval(checkConnection, 10000)
    return () => clearInterval(interval)
  }, [])

  // Load patients
  useEffect(() => {
    async function loadPatients() {
      const patients = await getAllPatients()
      setAllPatients(patients)
      setFilteredPatients(patients)
    }
    loadPatients()
  }, [])

  // THE SILENT POSTMAN (PNC EDITION)
  useEffect(() => {
    async function triggerSync() {
      if (!navigator.onLine) return;
      try {
        const { getPendingSyncQueue, markAsSynced } = await import('@/lib/db');
        const queue = await getPendingSyncQueue();
        if (queue.length === 0) return;

        for (const item of queue) {
          if (item.table === 'pnc_visits' && item.operation === 'INSERT') {
            const { pending_sync, synced, last_modified, id, ...cleanData } = item.data;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            
            const response = await fetch(`${supabaseUrl}/rest/v1/pnc_visits`, {
              method: 'POST',
              headers: {
                'apikey': supabaseAnonKey as string,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(cleanData)
            })
            
            if (response.ok) {
              await markAsSynced(item.table, item.data.id);
              console.log(`✅ Postman Delivered: PNC Visit ${id} to cloud.`);
            }
          }
        }
      } catch (error) {
        console.error("❌ PNC Postman error:", error);
      }
    }
    triggerSync();
    window.addEventListener('online', triggerSync);
    return () => window.removeEventListener('online', triggerSync);
  }, []);

  // Filter patients
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(allPatients)
    } else {
      const lowerSearch = searchTerm.toLowerCase()
      const filtered = allPatients.filter(p => {
        if (!p) return false
        const fullName = safeString(p.full_name).toLowerCase()
        const patientId = safeString(p.patient_id).toLowerCase()
        const phone = safeString(p.phone).toLowerCase()
        return fullName.includes(lowerSearch) || patientId.includes(lowerSearch) || phone.includes(lowerSearch)
      })
      setFilteredPatients(filtered)
    }
  }, [searchTerm, allPatients])

  // Close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load existing visits
  useEffect(() => {
    if (selectedPatient) {
      getPatientPncVisits(selectedPatient.patient_id).then(visits => {
        setExistingVisits(visits)
        const nextVisitNumber = visits.length + 1
        setFormData(prev => ({ ...prev, visit_number: nextVisitNumber }))
      })
    }
  }, [selectedPatient])

  // Calculate EPDS score
  useEffect(() => {
    if (formData.epds_answers) {
      const result = calculateEpdsScore(formData.epds_answers as number[])
      setEpdsScore(result)
      setFormData(prev => ({ ...prev, needs_mental_health_referral: result.needsReferral }))
    }
  }, [formData.epds_answers])

  // Check all alerts & determine criticality for the button
  useEffect(() => {
    const mAlerts = checkMotherAlerts(formData)
    const bAlerts = checkBabyAlerts(formData)
    setMotherAlerts(mAlerts)
    setBabyAlerts(bAlerts)
    
    const hasCritical = 
      mAlerts.some(a => a.includes('🔴')) || 
      bAlerts.some(a => a.includes('🔴')) || 
      (epdsScore?.action.includes('🔴') || false) ||
      formData.is_high_risk;
      
    setIsCritical(!!hasCritical);
  }, [formData, epdsScore])

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setShowDropdown(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    if (type === 'checkbox' && (name === 'mother_danger_signs' || name === 'baby_danger_signs')) {
      const current = formData[name as keyof PncVisit] as string[]
      if (checked) {
        setFormData({ ...formData, [name]: [...current, value] })
      } else {
        setFormData({ ...formData, [name]: current.filter(v => v !== value) })
      }
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked })
    } else if (name === 'epds_answers') {
      const index = parseInt(e.target.getAttribute('data-index') || '0')
      const currentAnswers = [...(formData.epds_answers as number[])]
      currentAnswers[index] = parseInt(value)
      setFormData({ ...formData, epds_answers: currentAnswers })
    } else if (['mother_weight', 'baby_weight', 'mother_temperature', 'baby_temperature'].includes(name)) {
      setFormData({ ...formData, [name]: value ? parseFloat(value) : null })
    } else if (['mother_bp_systolic', 'mother_bp_diastolic', 'days_after_delivery', 'visit_number'].includes(name)) {
      setFormData({ ...formData, [name]: value ? parseInt(value) : null })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  function handleEpdsChange(index: number, value: number) {
    const currentAnswers = [...(formData.epds_answers as number[])]
    currentAnswers[index] = value
    setFormData({ ...formData, epds_answers: currentAnswers })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) {
      setMessage('❌ Please select a patient first')
      setMessageType('error')
      return
    }
    
    setLoading(true)
    setMessage('')
    
    try {
      const visitId = `PNC-${selectedPatient.patient_id}-${formData.visit_number}-${Date.now()}`
      
      const visitData = {
        id: visitId, // For Dexie Local Outbox
        visit_id: visitId,
        patient_id: selectedPatient.patient_id,
        visit_number: formData.visit_number || 1,
        visit_type: formData.visit_type || 'PNC1',
        days_after_delivery: formData.days_after_delivery || null,
        mother_weight: formData.mother_weight || null,
        mother_bp_systolic: formData.mother_bp_systolic || null,
        mother_bp_diastolic: formData.mother_bp_diastolic || null,
        mother_temperature: formData.mother_temperature || null,
        lochia: formData.lochia || 'Normal',
        perineal_condition: formData.perineal_condition || 'Healing well',
        breastfeeding_status: formData.breastfeeding_status || 'Exclusive',
        breastfeeding_difficulties: formData.breastfeeding_difficulties || '',
        family_planning_method: formData.family_planning_method || 'None',
        baby_weight: formData.baby_weight || null,
        baby_temperature: formData.baby_temperature || null,
        baby_jaundice: formData.baby_jaundice || 'None',
        baby_feeding: formData.baby_feeding || 'Effective',
        baby_cord_condition: formData.baby_cord_condition || 'Dry, healing',
        mother_danger_signs: formData.mother_danger_signs || [],
        baby_danger_signs: formData.baby_danger_signs || [],
        epds_score: epdsScore?.score || null,
        epds_answers: formData.epds_answers || [],
        needs_mental_health_referral: epdsScore?.needsReferral || false,
        is_high_risk: formData.is_high_risk || false,
        risk_notes: formData.risk_notes || '',
        next_visit_date: null,
        notes: formData.notes || '',
        visit_date: new Date().toISOString(),
      }
      
      // Save directly to Dexie.js Offline Outbox
      await saveOffline('pnc_visits', visitData);
      
      setMessageType('success')
      setMessage(`✅ PNC Visit #${visitData.visit_number} recorded and safely stored in Offline Outbox!`)
      
      // Reset form
      setFormData({
        visit_number: existingVisits.length + 2,
        visit_type: 'PNC1',
        days_after_delivery: null,
        mother_weight: null,
        mother_bp_systolic: null,
        mother_bp_diastolic: null,
        mother_temperature: null,
        lochia: 'Normal',
        perineal_condition: 'Healing well',
        breastfeeding_status: 'Exclusive',
        breastfeeding_difficulties: '',
        family_planning_method: 'None',
        baby_weight: null,
        baby_temperature: null,
        baby_jaundice: 'None',
        baby_feeding: 'Effective',
        baby_cord_condition: 'Dry, healing',
        mother_danger_signs: [],
        baby_danger_signs: [],
        epds_answers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        needs_mental_health_referral: false,
        is_high_risk: false,
        risk_notes: '',
        notes: '',
      })
      
      const updated = await getPatientPncVisits(selectedPatient.patient_id)
      setExistingVisits(updated)

      if (navigator.onLine) {
        window.dispatchEvent(new Event('online'));
      }
      
    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const getVisitTypeLabel = (type: string) => {
    switch(type) {
      case 'PNC1': return 'PNC1 (Within 48 hours)'
      case 'PNC2': return 'PNC2 (Day 7)'
      case 'PNC3': return 'PNC3 (Week 6)'
      default: return type
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Status Banner */}
          <div className={`mb-6 p-4 rounded-lg text-center ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800 border-2 border-green-500' : 
            connectionStatus === 'offline' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' :
            'bg-gray-100 text-gray-800 border-2 border-gray-500'
          }`}>
            <div className="text-2xl font-bold">
              {connectionStatus === 'online' ? '✅ ONLINE MODE - Connected to Cloud' : 
               connectionStatus === 'offline' ? '📡 OFFLINE MODE - Data will sync automatically' :
               '⏳ CHECKING CONNECTION...'}
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-teal-700">Postnatal Care Dashboard</h1>
            <p className="text-gray-600">Comprehensive PNC assessments and Edinburgh Postnatal Depression Scale</p>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 
              messageType === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-400' :
              'bg-red-100 text-red-700 border border-red-400'
            }`}>
              {message}
            </div>
          )}
          
          {/* Patient Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Patient</h2>
            
            <div ref={searchRef} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name, patient ID, or phone number..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
              />
              
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">
                      No patients found. <a href="/register" className="text-teal-600 hover:underline">Register a new patient</a>
                    </div>
                  ) : (
                    filteredPatients.map((patient, index) => (
                      <div
                        key={`${patient.patient_id}-${index}`}
                        onClick={() => handleSelectPatient(patient)}
                        className="p-3 hover:bg-teal-50 cursor-pointer border-b transition-colors"
                      >
                        <div className="font-medium text-gray-800">{safeString(patient.full_name) || 'Unnamed Patient'}</div>
                        <div className="text-sm text-gray-500">ID: {safeString(patient.patient_id)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {selectedPatient && (
              <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-teal-800 text-lg">{safeString(selectedPatient.full_name)}</div>
                  <div className="text-sm text-gray-600">ID: {safeString(selectedPatient.patient_id)} | District: {safeString(selectedPatient.district)}</div>
                </div>
                <button type="button" onClick={() => setSelectedPatient(null)} className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium">
                  Change Patient
                </button>
              </div>
            )}
          </div>
          
          {selectedPatient && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: FULL PNC Form Restored */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                    2. PNC Visit #{formData.visit_number}
                  </h2>
                  
                  {/* Visit Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Visit Number</label>
                      <input type="number" name="visit_number" value={formData.visit_number || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" readOnly />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Visit Type</label>
                      <select name="visit_type" value={formData.visit_type} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                        <option value="PNC1">PNC1 - Within 48 hours</option>
                        <option value="PNC2">PNC2 - Day 7</option>
                        <option value="PNC3">PNC3 - Week 6</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Days After Delivery</label>
                      <input type="number" name="days_after_delivery" value={formData.days_after_delivery || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., 2" />
                    </div>
                  </div>
                  
                  {/* Mother Assessment Section */}
                  <div className="mb-6 p-4 bg-pink-50 rounded-lg border border-pink-100">
                    <h3 className="text-lg font-bold text-pink-800 mb-3 border-b border-pink-200 pb-2">👩 Mother Assessment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Weight (kg)</label>
                        <input type="number" step="0.1" name="mother_weight" value={formData.mother_weight || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Temp (°C)</label>
                        <input type="number" step="0.1" name="mother_temperature" value={formData.mother_temperature || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg ${(formData.mother_temperature && formData.mother_temperature >= 38.5) ? 'border-red-500 bg-red-50 text-red-700 font-bold' : ''}`} />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">BP Systolic</label>
                        <input type="number" name="mother_bp_systolic" value={formData.mother_bp_systolic || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg ${(formData.mother_bp_systolic && formData.mother_bp_systolic >= 140) ? 'border-red-500 bg-red-50 text-red-700 font-bold' : ''}`} />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">BP Diastolic</label>
                        <input type="number" name="mother_bp_diastolic" value={formData.mother_bp_diastolic || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg ${(formData.mother_bp_diastolic && formData.mother_bp_diastolic >= 90) ? 'border-red-500 bg-red-50 text-red-700 font-bold' : ''}`} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-pink-200 pt-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Lochia (Bleeding)</label>
                        <select name="lochia" value={formData.lochia} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg ${['Heavy', 'Foul-smelling'].includes(formData.lochia || '') ? 'border-red-500 bg-red-50 text-red-700 font-bold' : ''}`}>
                          <option value="Normal">Normal - Moderate, decreasing</option>
                          <option value="Heavy">Heavy - Excessive bleeding</option>
                          <option value="Foul-smelling">Foul-smelling - Possible infection</option>
                          <option value="Scant">Scant - Very little</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Perineal Condition</label>
                        <select name="perineal_condition" value={formData.perineal_condition} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Healing well">Healing well</option>
                          <option value="Signs of infection">Signs of infection</option>
                          <option value="Wound breakdown">Wound breakdown</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Breastfeeding Status</label>
                        <select name="breastfeeding_status" value={formData.breastfeeding_status} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Exclusive">Exclusive breastfeeding</option>
                          <option value="Partial">Partial breastfeeding</option>
                          <option value="Not breastfeeding">Not breastfeeding</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Family Planning Method</label>
                        <select name="family_planning_method" value={formData.family_planning_method} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="None">None</option>
                          <option value="Pills">Pills</option>
                          <option value="Injection">Injection</option>
                          <option value="IUD">IUD</option>
                          <option value="Implant">Implant</option>
                          <option value="Condoms">Condoms</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-pink-200">
                      <label className="block text-gray-700 font-medium mb-2">Mother Danger Signs (Check all that apply)</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['Severe headache', 'Blurred vision', 'Chest pain', 'Difficulty breathing', 'Heavy bleeding', 'Foul discharge', 'Severe abdominal pain', 'High fever', 'Convulsions'].map((sign, idx) => (
                          <label key={`mother-danger-${idx}`} className="flex items-center gap-2">
                            <input type="checkbox" name="mother_danger_signs" value={sign} checked={formData.mother_danger_signs?.includes(sign)} onChange={handleChange} />
                            <span className="text-sm">{sign}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Baby Assessment Section */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="text-lg font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">👶 Baby Assessment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Baby Weight (kg)</label>
                        <input type="number" step="0.1" name="baby_weight" value={formData.baby_weight || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg ${(formData.baby_weight && formData.baby_weight < 2.5) ? 'border-red-500 bg-red-50 text-red-700 font-bold' : ''}`} />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Baby Temperature (°C)</label>
                        <input type="number" step="0.1" name="baby_temperature" value={formData.baby_temperature || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg ${(formData.baby_temperature && (formData.baby_temperature < 36.5 || formData.baby_temperature >= 38)) ? 'border-red-500 bg-red-50 text-red-700 font-bold' : ''}`} />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Jaundice</label>
                        <select name="baby_jaundice" value={formData.baby_jaundice} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="None">None</option>
                          <option value="Mild">Mild</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Severe">Severe</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Baby Feeding</label>
                        <select name="baby_feeding" value={formData.baby_feeding} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Effective">Effective feeding</option>
                          <option value="Poor feeding">Poor feeding</option>
                          <option value="Not at all">Not feeding at all</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 font-medium mb-1">Cord Condition</label>
                        <select name="baby_cord_condition" value={formData.baby_cord_condition} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Dry, healing">Dry, healing well</option>
                          <option value="Moist">Moist - needs monitoring</option>
                          <option value="Signs of infection">Signs of infection</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <label className="block text-gray-700 font-medium mb-2">Baby Danger Signs (Check all that apply)</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['Difficulty breathing', 'Poor feeding', 'Lethargy', 'Convulsions', 'High fever', 'Low temperature', 'Yellow skin/eyes', 'Umbilical redness/pus', 'Vomiting everything'].map((sign, idx) => (
                          <label key={`baby-danger-${idx}`} className="flex items-center gap-2">
                            <input type="checkbox" name="baby_danger_signs" value={sign} checked={formData.baby_danger_signs?.includes(sign)} onChange={handleChange} />
                            <span className="text-sm">{sign}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* EPDS Mental Health Screening */}
                  <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <h3 className="text-lg font-bold text-purple-800 mb-3 border-b border-purple-200 pb-2">🧠 Mental Health Screening (EPDS)</h3>
                    <div className="space-y-3">
                      {epdsQuestions.map((question, idx) => (
                        <div key={`epds-${idx}`} className="border-b border-purple-100 pb-2">
                          <label className="block text-gray-800 font-medium text-sm mb-1">{idx + 1}. {question}</label>
                          <select
                            value={formData.epds_answers?.[idx] || 0}
                            onChange={(e) => handleEpdsChange(idx, parseInt(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                          >
                            <option value={0}>As much as I always could (0)</option>
                            <option value={1}>Not quite so much (1)</option>
                            <option value={2}>Definitely not so much (2)</option>
                            <option value={3}>Hardly at all (3)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Risk Assessment & Notes */}
                  <div className="mb-6">
                    <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="is_high_risk" checked={formData.is_high_risk} onChange={handleChange} className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-gray-800">Flag as High Risk (Mother or Baby requires close follow-up)</span>
                      </label>
                    </div>
                    {formData.is_high_risk && (
                      <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Risk Notes / Action Plan</label>
                        <textarea name="risk_notes" value={formData.risk_notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-red-300 rounded-lg focus:border-red-500" placeholder="Describe the risk factors and planned actions..." />
                      </div>
                    )}
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">General Clinical Notes</label>
                      <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg focus:border-teal-500" placeholder="Enter any additional clinical notes..." />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-lg text-white font-black text-lg shadow-lg uppercase tracking-wide transition-colors ${loading ? 'bg-gray-400' : isCritical ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-teal-600 hover:bg-teal-700'}`}
                  >
                    {loading ? 'Saving...' : isCritical ? '🚨 LOG CRITICAL PNC RECORD' : '✅ Save PNC Record'}
                  </button>
                </form>
              </div>

              {/* Right Side: Clinical Dashboard */}
              <div className="space-y-6">
                
                {/* Real-time Triage Box */}
                <div className={`rounded-lg shadow-md p-6 border-t-8 ${isCritical ? 'bg-red-50 border-red-600' : motherAlerts.length > 0 || babyAlerts.length > 0 ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'}`}>
                  <h2 className={`text-xl font-black mb-4 flex items-center gap-2 ${isCritical ? 'text-red-700' : motherAlerts.length > 0 || babyAlerts.length > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                    {isCritical ? '🚨 EMERGENCY ALERTS' : motherAlerts.length > 0 || babyAlerts.length > 0 ? '⚠️ CLINICAL WARNINGS' : '🟢 ALL CLEAR'}
                  </h2>
                  
                  <div className="space-y-4">
                    {/* Mother Alerts List */}
                    {motherAlerts.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Mother</h3>
                        <ul className="space-y-2">
                          {motherAlerts.map((alert, i) => (
                            <li key={`ma-${i}`} className={`p-2 rounded font-bold text-sm ${alert.includes('🔴') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-orange-100 text-orange-800 border border-orange-300'}`}>{alert}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Baby Alerts List */}
                    {babyAlerts.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Baby</h3>
                        <ul className="space-y-2">
                          {babyAlerts.map((alert, i) => (
                            <li key={`ba-${i}`} className={`p-2 rounded font-bold text-sm ${alert.includes('🔴') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-orange-100 text-orange-800 border border-orange-300'}`}>{alert}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* EPDS Display */}
                    {epdsScore && (
                      <div className={`mt-4 p-3 border-t-4 rounded bg-white shadow-sm ${epdsScore.needsReferral ? 'border-red-500' : epdsScore.score >= 10 ? 'border-yellow-500' : 'border-green-500'}`}>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">EPDS Mental Health Score</div>
                        <div className="text-xl font-black text-gray-800">{epdsScore.score} / 30</div>
                        <div className={`text-sm font-bold mt-1 ${epdsScore.needsReferral ? 'text-red-600' : epdsScore.score >= 10 ? 'text-yellow-600' : 'text-green-600'}`}>{epdsScore.action}</div>
                      </div>
                    )}

                    {!isCritical && motherAlerts.length === 0 && babyAlerts.length === 0 && (
                      <p className="text-green-700 font-medium">Mother and baby are currently presenting without active danger signs.</p>
                    )}
                  </div>
                </div>

                {/* Visit History Table */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">PNC Visit History</h2>
                  {existingVisits.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No previous visits recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {existingVisits.map((visit) => (
                        <div key={visit.visit_id} className="p-3 border border-gray-200 rounded text-sm relative overflow-hidden">
                          {visit.is_high_risk && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                          <div className="flex justify-between font-bold mb-1">
                            <span>{new Date(visit.visit_date).toLocaleDateString('en-GB')}</span>
                            <span className="text-teal-700">Visit #{visit.visit_number}</span>
                          </div>
                          <div className="text-gray-600">Mother BP: {visit.mother_bp_systolic || '-'}/{visit.mother_bp_diastolic || '-'}</div>
                          <div className="text-gray-600">Baby Wt: {visit.baby_weight ? `${visit.baby_weight}kg` : '-'} | EPDS: {visit.epds_score || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}