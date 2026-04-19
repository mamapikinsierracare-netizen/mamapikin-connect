'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'

// Type definitions
type Patient = {
  patient_id: string
  full_name: string
  phone: string | null
  district: string | null
  date_of_birth: string | null
  village: string | null
}

type AncVisit = {
  id?: number
  visit_id: string
  patient_id: string
  visit_number: number
  gestational_age: number | null
  weight: number | null
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  fundal_height: number | null
  fetal_heart_rate: number | null
  fetal_movements: string
  presentation: string
  edema: string
  urine_protein: string
  urine_glucose: string
  hemoglobin: number | null
  danger_signs: string[]
  is_high_risk: boolean
  risk_factors: string[]
  next_visit_date: string | null
  notes: string
  visit_date: string
  synced_to_cloud: boolean
}

// CRITICAL DANGER SIGNS that trigger SMS
const CRITICAL_DANGER_SIGNS = [
  'Severe headache', 'Blurred vision', 'Convulsions', 
  'Severe abdominal pain', 'Vaginal bleeding', 'Difficulty breathing',
  'Reduced fetal movement', 'Swelling of hands/face'
]

// SMS Service
const smsService = {
  async sendDangerSignAlert(alert: any): Promise<boolean> {
    if (!navigator.onLine) {
      // Queue for later
      const queue = localStorage.getItem('sms_queue')
      const alerts = queue ? JSON.parse(queue) : []
      alerts.push({ ...alert, queuedAt: new Date().toISOString() })
      localStorage.setItem('sms_queue', JSON.stringify(alerts))
      console.log('📡 Offline: SMS queued')
      return false
    }

    try {
      const response = await fetch('/api/sms/danger-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      })
      return response.ok
    } catch (error) {
      console.error('SMS failed:', error)
      return false
    }
  }
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
      method: 'GET',
      headers: { 
        'apikey': supabaseAnonKey, 
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response.status === 200 || response.status === 206
  } catch {
    return false
  }
}

function safeString(value: any): string {
  if (!value || value === null || value === undefined) return ''
  return String(value)
}

async function getAllPatients(): Promise<Patient[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const results: Patient[] = []
  const seenIds = new Set<string>()
  
  // Get from localStorage
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
            date_of_birth: p.date_of_birth || null,
            village: p.village || null
          })
        }
      })
    } catch (e) { console.log('Error parsing localStorage:', e) }
  }
  
  // Get from Supabase
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?select=patient_id,full_name,phone,district,date_of_birth,village&order=full_name`, {
        headers: { 
          'apikey': supabaseAnonKey, 
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
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
              date_of_birth: p.date_of_birth || null,
              village: p.village || null
            })
          }
        })
      }
    } catch (e) { console.log('Error fetching from Supabase:', e) }
  }
  
  return results.sort((a, b) => safeString(a.full_name).localeCompare(safeString(b.full_name)))
}

async function getPatientAncVisits(patientId: string): Promise<AncVisit[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `anc_visits_${patientId}`
  const localVisits = localStorage.getItem(localKey)
  const localList: AncVisit[] = localVisits ? JSON.parse(localVisits) : []
  
  let cloudList: AncVisit[] = []
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${supabaseUrl}/rest/v1/anc_visits?patient_id=eq.${patientId}&order=visit_number.asc`, {
        headers: { 
          'apikey': supabaseAnonKey, 
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        cloudList = await response.json()
      }
    } catch (e) { console.log('Error fetching ANC visits:', e) }
  }
  
  const allVisits = [...localList, ...cloudList]
  return allVisits.sort((a, b) => a.visit_number - b.visit_number)
}

async function saveAncVisit(visit: AncVisit, isOnline: boolean): Promise<{ local: boolean; cloud: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // 1. ALWAYS save to localStorage
  const localKey = `anc_visits_${visit.patient_id}`
  const existing = localStorage.getItem(localKey)
  const visits = existing ? JSON.parse(existing) : []
  visits.push(visit)
  localStorage.setItem(localKey, JSON.stringify(visits))
  console.log('💾 Saved to localStorage')
  
  let cloudSaved = false
  
  // 2. Try to save to Supabase if online
  if (isOnline && supabaseUrl && supabaseAnonKey) {
    try {
      const { id, ...dataWithoutId } = visit as any
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch(`${supabaseUrl}/rest/v1/anc_visits`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataWithoutId),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        cloudSaved = true
        console.log('✅ Saved to Supabase cloud!')
      }
    } catch (error) {
      console.log('❌ Supabase save error:', error)
    }
  }
  
  return { local: true, cloud: cloudSaved }
}

function calculateNextVisitDate(gestationalAge: number | null, isHighRisk: boolean): string | null {
  if (!gestationalAge) return null
  const nextDate = new Date()
  if (isHighRisk) {
    nextDate.setDate(nextDate.getDate() + 14)
  } else if (gestationalAge < 32) {
    nextDate.setDate(nextDate.getDate() + 28)
  } else {
    nextDate.setDate(nextDate.getDate() + 14)
  }
  return nextDate.toISOString().split('T')[0]
}

function checkAlerts(visit: Partial<AncVisit>): string[] {
  const alerts: string[] = []
  if (visit.blood_pressure_systolic && visit.blood_pressure_systolic >= 140) {
    alerts.push('🔴 HIGH BLOOD PRESSURE - Possible pre-eclampsia')
  }
  if (visit.urine_protein === 'Positive') {
    alerts.push('🔴 PROTEIN IN URINE - Possible pre-eclampsia')
  }
  if (visit.hemoglobin && visit.hemoglobin < 10) {
    alerts.push('🟠 ANEMIA - Hemoglobin below 10 g/dL')
  }
  if (visit.danger_signs && visit.danger_signs.length > 0) {
    alerts.push('🔴 DANGER SIGNS PRESENT - Urgent referral needed')
  }
  return alerts
}

async function sendDangerSignAlerts(
  dangerSigns: string[], 
  patient: Patient, 
  facilityName: string
) {
  const criticalSigns = dangerSigns.filter(sign => 
    CRITICAL_DANGER_SIGNS.includes(sign)
  );

  if (criticalSigns.length > 0) {
    for (const sign of criticalSigns) {
      await smsService.sendDangerSignAlert({
        patientName: patient.full_name,
        patientId: patient.patient_id,
        dangerSign: sign,
        recordedAt: new Date(),
        facilityName: facilityName,
        chwName: localStorage.getItem('chw_name') || 'CHW'
      });
    }
    
    alert(`⚠️ CRITICAL: ${criticalSigns.join(', ')} detected! Emergency SMS sent to supervisor.`);
  }
}

export default function AncPage() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [searchTerm, setSearchTerm] = useState('')
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [existingVisits, setExistingVisits] = useState<AncVisit[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [alerts, setAlerts] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState<Partial<AncVisit>>({
    visit_number: 1,
    gestational_age: null,
    weight: null,
    blood_pressure_systolic: null,
    blood_pressure_diastolic: null,
    fundal_height: null,
    fetal_heart_rate: null,
    fetal_movements: 'Normal',
    presentation: 'Cephalic',
    edema: 'None',
    urine_protein: 'Negative',
    urine_glucose: 'Negative',
    hemoglobin: null,
    danger_signs: [],
    is_high_risk: false,
    risk_factors: [],
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

  // Load all patients on mount
  useEffect(() => {
    async function loadPatients() {
      const patients = await getAllPatients()
      setAllPatients(patients)
      setFilteredPatients(patients)
    }
    loadPatients()
  }, [])

  // Filter patients when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(allPatients)
    } else {
      const lowerSearch = searchTerm.toLowerCase()
      const filtered = allPatients.filter(p => {
        if (!p) return false
        return safeString(p.full_name).toLowerCase().includes(lowerSearch) || 
               safeString(p.patient_id).toLowerCase().includes(lowerSearch)
      })
      setFilteredPatients(filtered)
    }
  }, [searchTerm, allPatients])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load existing visits when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      getPatientAncVisits(selectedPatient.patient_id).then(visits => {
        setExistingVisits(visits)
        const nextVisitNumber = visits.length + 1
        setFormData(prev => ({ ...prev, visit_number: nextVisitNumber }))
      })
    }
  }, [selectedPatient])

  // Check alerts
  useEffect(() => {
    const newAlerts = checkAlerts(formData)
    setAlerts(newAlerts)
  }, [formData])

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setShowDropdown(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    if (type === 'checkbox' && name === 'danger_signs') {
      const current = formData.danger_signs as string[]
      if (checked) {
        setFormData({ ...formData, danger_signs: [...current, value] })
      } else {
        setFormData({ ...formData, danger_signs: current.filter(v => v !== value) })
      }
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked })
    } else if (['gestational_age', 'weight', 'fundal_height', 'fetal_heart_rate', 'hemoglobin'].includes(name)) {
      setFormData({ ...formData, [name]: value ? parseFloat(value) : null })
    } else if (name === 'blood_pressure_systolic' || name === 'blood_pressure_diastolic') {
      setFormData({ ...formData, [name]: value ? parseInt(value) : null })
    } else {
      setFormData({ ...formData, [name]: value })
    }
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
      const visitId = `ANC-${selectedPatient.patient_id}-${formData.visit_number}-${Date.now()}`
      const nextVisitDate = calculateNextVisitDate(formData.gestational_age || null, formData.is_high_risk || false)
      
      const visit: AncVisit = {
        visit_id: visitId,
        patient_id: selectedPatient.patient_id,
        visit_number: formData.visit_number || 1,
        gestational_age: formData.gestational_age || null,
        weight: formData.weight || null,
        blood_pressure_systolic: formData.blood_pressure_systolic || null,
        blood_pressure_diastolic: formData.blood_pressure_diastolic || null,
        fundal_height: formData.fundal_height || null,
        fetal_heart_rate: formData.fetal_heart_rate || null,
        fetal_movements: formData.fetal_movements || 'Normal',
        presentation: formData.presentation || 'Cephalic',
        edema: formData.edema || 'None',
        urine_protein: formData.urine_protein || 'Negative',
        urine_glucose: formData.urine_glucose || 'Negative',
        hemoglobin: formData.hemoglobin || null,
        danger_signs: formData.danger_signs || [],
        is_high_risk: formData.is_high_risk || false,
        risk_factors: formData.risk_factors || [],
        next_visit_date: nextVisitDate,
        notes: formData.notes || '',
        visit_date: new Date().toISOString(),
        synced_to_cloud: false,
      }
      
      const isOnline = connectionStatus === 'online'
      const result = await saveAncVisit(visit, isOnline)
      
      // Send SMS alerts for danger signs
      if (visit.danger_signs && visit.danger_signs.length > 0 && selectedPatient) {
        await sendDangerSignAlerts(
          visit.danger_signs,
          selectedPatient,
          localStorage.getItem('facility_name') || 'Health Facility'
        );
      }
      
      if (result.cloud) {
        setMessageType('success')
        setMessage(`✅ ANC Visit #${visit.visit_number} saved to CLOUD and local storage!`)
      } else if (result.local && isOnline) {
        setMessageType('warning')
        setMessage(`⚠️ ANC Visit #${visit.visit_number} saved locally only. Cloud save failed.`)
      } else {
        setMessageType('success')
        setMessage(`✅ ANC Visit #${visit.visit_number} saved locally! Will sync when online.`)
      }
      
      // Reset form
      setFormData({
        visit_number: existingVisits.length + 2,
        gestational_age: null,
        weight: null,
        blood_pressure_systolic: null,
        blood_pressure_diastolic: null,
        fundal_height: null,
        fetal_heart_rate: null,
        fetal_movements: 'Normal',
        presentation: 'Cephalic',
        edema: 'None',
        urine_protein: 'Negative',
        urine_glucose: 'Negative',
        hemoglobin: null,
        danger_signs: [],
        is_high_risk: false,
        risk_factors: [],
        notes: '',
      })
      
      const updated = await getPatientAncVisits(selectedPatient.patient_id)
      setExistingVisits(updated)
      
    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Status Banner */}
          <div className={`mb-6 p-4 rounded-lg text-center ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800 border-2 border-green-500' : 
            connectionStatus === 'offline' ? 'bg-red-100 text-red-800 border-2 border-red-500' :
            'bg-gray-100 text-gray-800 border-2 border-gray-500'
          }`}>
            <div className="text-2xl font-bold">
              {connectionStatus === 'online' ? '✅ ONLINE MODE' : 
               connectionStatus === 'offline' ? '📡 OFFLINE MODE - Saving locally only' :
               '⏳ CHECKING CONNECTION...'}
            </div>
          </div>
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Antenatal Care (ANC)</h1>
            <p className="text-gray-600">Record pregnancy visits and monitor maternal health</p>
          </div>
          
          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 
              messageType === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-400' :
              'bg-red-100 text-red-700 border border-red-400'
            }`}>
              {message}
            </div>
          )}
          
          {/* Patient Selection Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Patient</h2>
            
            <div ref={searchRef} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name, patient ID, or phone number..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              />
              
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">
                      No patients found. <a href="/register" className="text-green-600">Register a new patient</a>
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <div
                        key={patient.patient_id}
                        onClick={() => handleSelectPatient(patient)}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b"
                      >
                        <div className="font-medium">{safeString(patient.full_name)}</div>
                        <div className="text-sm text-gray-500">ID: {safeString(patient.patient_id)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {selectedPatient && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="font-bold text-green-800">{safeString(selectedPatient.full_name)}</div>
                <div className="text-sm text-gray-600">ID: {safeString(selectedPatient.patient_id)}</div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="mt-2 text-red-600 text-sm"
                >
                  Change Patient
                </button>
              </div>
            )}
          </div>
          
          {/* ANC Form */}
          {selectedPatient && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                2. ANC Visit #{formData.visit_number}
              </h2>
              
              {alerts.length > 0 && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg">
                  <div className="font-bold text-red-800 mb-2">⚠️ ALERTS</div>
                  {alerts.map((alert, i) => (
                    <div key={i} className="text-sm text-red-700">{alert}</div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Gestational Age (weeks)</label>
                  <input type="number" name="gestational_age" value={formData.gestational_age || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" name="weight" value={formData.weight || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Blood Pressure (Systolic)</label>
                  <input type="number" name="blood_pressure_systolic" value={formData.blood_pressure_systolic || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Blood Pressure (Diastolic)</label>
                  <input type="number" name="blood_pressure_diastolic" value={formData.blood_pressure_diastolic || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Fetal Heart Rate (bpm)</label>
                  <input type="number" name="fetal_heart_rate" value={formData.fetal_heart_rate || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Hemoglobin (g/dL)</label>
                  <input type="number" step="0.1" name="hemoglobin" value={formData.hemoglobin || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-gray-700 font-medium mb-2">Danger Signs (Check all that apply)</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Severe headache', 'Blurred vision', 'Swelling of hands/face', 'Fever', 'Severe abdominal pain', 'Reduced fetal movement', 'Vaginal bleeding', 'Convulsions', 'Difficulty breathing'].map((sign) => (
                    <label key={sign} className="flex items-center gap-2">
                      <input type="checkbox" name="danger_signs" value={sign} checked={formData.danger_signs?.includes(sign)} onChange={handleChange} />
                      <span className="text-sm">{sign}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_high_risk" checked={formData.is_high_risk} onChange={handleChange} />
                  <span className="font-medium">Mark as High Risk Pregnancy</span>
                </label>
              </div>
              
              <div className="mt-4">
                <label className="block text-gray-700 font-medium mb-1">Clinical Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-6 py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Saving...' : 'Save ANC Visit'}
              </button>
            </form>
          )}
          
          {/* Visit History */}
          {selectedPatient && existingVisits.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Visit History</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Visit #</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Weeks</th>
                      <th className="p-2 text-left">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingVisits.map((visit) => (
                      <tr key={visit.visit_id} className="border-t">
                        <td className="p-2">{visit.visit_number}</td>
                        <td className="p-2">{new Date(visit.visit_date).toLocaleDateString()}</td>
                        <td className="p-2">{visit.gestational_age || '-'}</td>
                        <td className="p-2">{visit.is_high_risk ? '🔴 High' : '🟢 Normal'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}