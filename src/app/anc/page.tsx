// src/app/anc/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { saveOffline } from '@/lib/db'

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

const CRITICAL_DANGER_SIGNS = [
  'Severe headache', 'Blurred vision', 'Convulsions', 
  'Severe abdominal pain', 'Vaginal bleeding', 'Difficulty breathing',
  'Reduced fetal movement', 'Swelling of hands/face'
]

const smsService = {
  async sendDangerSignAlert(alert: any): Promise<boolean> {
    if (!navigator.onLine) {
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

async function isSupabaseReachable(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return false
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?limit=1`, {
      method: 'GET',
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}`},
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
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?select=patient_id,full_name,phone,district,date_of_birth,village&order=full_name`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` },
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
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (response.ok) cloudList = await response.json()
    } catch (e) { console.log('Error fetching ANC visits:', e) }
  }
  
  const allVisits = [...localList, ...cloudList]
  return allVisits.sort((a, b) => a.visit_number - b.visit_number)
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

// THE UPGRADED TRIAGE SYSTEM
function checkAlerts(visit: Partial<AncVisit>): { alerts: string[], isCritical: boolean } {
  const alerts: string[] = []
  let isCritical = false;

  // Blood Pressure Logic
  if (visit.blood_pressure_systolic || visit.blood_pressure_diastolic) {
    const sys = visit.blood_pressure_systolic || 0;
    const dia = visit.blood_pressure_diastolic || 0;
    
    if (sys >= 160 || dia >= 110) {
      alerts.push(`🚨 SEVERE PRE-ECLAMPSIA RISK (BP ${sys}/${dia}) - IMMEDIATE REFERRAL REQUIRED`);
      isCritical = true;
    } else if (sys >= 140 || dia >= 90) {
      alerts.push(`🟠 HIGH BLOOD PRESSURE (BP ${sys}/${dia}) - Monitor closely`);
    }
  }

  // Fetal Heart Rate Logic
  if (visit.fetal_heart_rate) {
    if (visit.fetal_heart_rate < 110 || visit.fetal_heart_rate > 160) {
      alerts.push(`🚨 ABNORMAL FETAL HEART RATE (${visit.fetal_heart_rate} bpm) - Fetal distress possible`);
      isCritical = true;
    }
  }

  // Lab Results
  if (visit.urine_protein === 'Positive' || visit.urine_protein === '++' || visit.urine_protein === '+++') {
    alerts.push('🚨 SIGNIFICANT PROTEIN IN URINE - Pre-eclampsia indicator');
    isCritical = true;
  }
  if (visit.hemoglobin && visit.hemoglobin < 7) {
    alerts.push(`🚨 SEVERE ANEMIA (Hb ${visit.hemoglobin} g/dL) - High risk for hemorrhage`);
    isCritical = true;
  } else if (visit.hemoglobin && visit.hemoglobin < 10) {
    alerts.push(`🟠 MILD ANEMIA (Hb ${visit.hemoglobin} g/dL) - Prescribe Iron/Folate`);
  }

  if (visit.danger_signs && visit.danger_signs.length > 0) {
    alerts.push(`🚨 DANGER SIGNS REPORTED: ${visit.danger_signs.join(', ')}`);
    isCritical = true;
  }

  return { alerts, isCritical }
}

async function sendDangerSignAlerts(dangerSigns: string[], patient: Patient, facilityName: string) {
  const criticalSigns = dangerSigns.filter(sign => CRITICAL_DANGER_SIGNS.includes(sign));
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
  const [triageStatus, setTriageStatus] = useState<{alerts: string[], isCritical: boolean}>({alerts: [], isCritical: false})
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

  useEffect(() => {
    async function checkConnection() {
      const online = await isSupabaseReachable()
      setConnectionStatus(online ? 'online' : 'offline')
    }
    checkConnection()
    const interval = setInterval(checkConnection, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadPatients() {
      const patients = await getAllPatients()
      setAllPatients(patients)
      setFilteredPatients(patients)
    }
    loadPatients()
  }, [])

  // THE SILENT POSTMAN (ANC EDITION)
  useEffect(() => {
    async function triggerSync() {
      if (!navigator.onLine) return;
      try {
        const { getPendingSyncQueue, markAsSynced } = await import('@/lib/db');
        const queue = await getPendingSyncQueue();
        if (queue.length === 0) return;

        for (const item of queue) {
          if (item.table === 'anc_visits' && item.operation === 'INSERT') {
            const { pending_sync, synced, last_modified, id, ...cleanData } = item.data;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            
            const response = await fetch(`${supabaseUrl}/rest/v1/anc_visits`, {
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
              console.log(`✅ Postman Delivered: ANC Visit ${id} to cloud.`);
            }
          }
        }
      } catch (error) {
        console.error("❌ ANC Postman error:", error);
      }
    }

    triggerSync();
    window.addEventListener('online', triggerSync);
    return () => window.removeEventListener('online', triggerSync);
  }, []);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedPatient) {
      getPatientAncVisits(selectedPatient.patient_id).then(visits => {
        setExistingVisits(visits)
        const nextVisitNumber = visits.length + 1
        setFormData(prev => ({ ...prev, visit_number: nextVisitNumber }))
      })
    }
  }, [selectedPatient])

  // Real-time Triage check
  useEffect(() => {
    const status = checkAlerts(formData)
    setTriageStatus(status)
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
      const nextVisitDate = calculateNextVisitDate(formData.gestational_age || null, formData.is_high_risk || triageStatus.isCritical)
      
      const visitData = {
        id: visitId, // Required for Dexie
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
        is_high_risk: formData.is_high_risk || triageStatus.isCritical,
        risk_factors: formData.risk_factors || [],
        next_visit_date: nextVisitDate,
        notes: formData.notes || '',
        visit_date: new Date().toISOString(),
      }
      
      // THE FIX: We bypass localStorage and use the Dexie Outbox!
      await saveOffline('anc_visits', visitData);
      
      if (visitData.danger_signs && visitData.danger_signs.length > 0 && selectedPatient) {
        await sendDangerSignAlerts(
          visitData.danger_signs,
          selectedPatient,
          localStorage.getItem('facility_name') || 'Health Facility'
        );
      }
      
      setMessageType('success')
      setMessage(`✅ ANC Visit #${visitData.visit_number} safely stored in Offline Outbox!`)
      
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

      if (navigator.onLine) {
        window.dispatchEvent(new Event('online'));
      }
      
    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Error saving: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          
          <div className={`mb-6 p-4 rounded-lg text-center ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800 border-2 border-green-500' : 
            connectionStatus === 'offline' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' :
            'bg-gray-100 text-gray-800 border-2 border-gray-500'
          }`}>
            <div className="text-2xl font-bold">
              {connectionStatus === 'online' ? '✅ ONLINE MODE' : 
               connectionStatus === 'offline' ? '📡 OFFLINE MODE - Data will sync automatically' :
               '⏳ CHECKING CONNECTION...'}
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Antenatal Care (ANC) Triage</h1>
            <p className="text-gray-600">Record vitals and monitor clinical guardrails</p>
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
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-green-800 text-lg">{safeString(selectedPatient.full_name)}</div>
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
              
              {/* Left Side: The Form */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                    2. Clinical Vitals (Visit #{formData.visit_number})
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Gestational Age (weeks)</label>
                      <input type="number" name="gestational_age" value={formData.gestational_age || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:border-green-500" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Weight (kg)</label>
                      <input type="number" step="0.1" name="weight" value={formData.weight || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:border-green-500" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Blood Pressure (Systolic)</label>
                      <input type="number" name="blood_pressure_systolic" value={formData.blood_pressure_systolic || ''} onChange={handleChange} 
                        className={`w-full px-3 py-2 border rounded-lg focus:border-green-500 ${formData.blood_pressure_systolic && formData.blood_pressure_systolic >= 140 ? 'bg-red-50 border-red-500 text-red-700 font-bold' : ''}`} 
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Blood Pressure (Diastolic)</label>
                      <input type="number" name="blood_pressure_diastolic" value={formData.blood_pressure_diastolic || ''} onChange={handleChange} 
                        className={`w-full px-3 py-2 border rounded-lg focus:border-green-500 ${formData.blood_pressure_diastolic && formData.blood_pressure_diastolic >= 90 ? 'bg-red-50 border-red-500 text-red-700 font-bold' : ''}`} 
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Fetal Heart Rate (bpm)</label>
                      <input type="number" name="fetal_heart_rate" value={formData.fetal_heart_rate || ''} onChange={handleChange} 
                         className={`w-full px-3 py-2 border rounded-lg focus:border-green-500 ${(formData.fetal_heart_rate && (formData.fetal_heart_rate < 110 || formData.fetal_heart_rate > 160)) ? 'bg-red-50 border-red-500 text-red-700 font-bold' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Hemoglobin (g/dL)</label>
                      <input type="number" step="0.1" name="hemoglobin" value={formData.hemoglobin || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:border-green-500" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Urine Protein</label>
                      <select name="urine_protein" value={formData.urine_protein} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:border-green-500">
                        <option value="Negative">Negative</option>
                        <option value="Trace">Trace</option>
                        <option value="Positive">Positive (+)</option>
                        <option value="++">++</option>
                        <option value="+++">+++</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Edema (Swelling)</label>
                      <select name="edema" value={formData.edema} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:border-green-500">
                        <option value="None">None</option>
                        <option value="Mild (Feet/Ankles)">Mild (Feet/Ankles)</option>
                        <option value="Severe (Face/Hands)">Severe (Face/Hands)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-6 border-t pt-4">
                    <label className="block text-gray-800 font-bold mb-2">Danger Signs Reported by Mother</label>
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {['Severe headache', 'Blurred vision', 'Swelling of hands/face', 'Fever', 'Severe abdominal pain', 'Reduced fetal movement', 'Vaginal bleeding', 'Convulsions', 'Difficulty breathing'].map((sign) => (
                        <label key={sign} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" name="danger_signs" value={sign} checked={formData.danger_signs?.includes(sign)} onChange={handleChange} className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                          <span className="text-sm font-medium text-gray-700 hover:text-gray-900">{sign}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-gray-700 font-medium mb-1">Clinical Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg focus:border-green-500" placeholder="Add any additional observations here..." />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full mt-6 py-4 rounded-lg text-white font-bold text-lg shadow-lg ${loading ? 'bg-gray-400' : triageStatus.isCritical ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {loading ? 'Saving...' : triageStatus.isCritical ? '🚨 LOG HIGH RISK VISIT' : '✅ Save ANC Visit'}
                  </button>
                </form>
              </div>

              {/* Right Side: The Clinical Dashboard */}
              <div className="space-y-6">
                
                {/* Real-time Triage Guardrail Box */}
                <div className={`rounded-lg shadow-md p-6 border-t-8 ${triageStatus.isCritical ? 'bg-red-50 border-red-600' : triageStatus.alerts.length > 0 ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'}`}>
                  <h2 className={`text-xl font-black mb-4 flex items-center gap-2 ${triageStatus.isCritical ? 'text-red-700' : triageStatus.alerts.length > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                    {triageStatus.isCritical ? '🚨 CRITICAL ALERTS' : triageStatus.alerts.length > 0 ? '⚠️ WARNINGS' : '🟢 ALL CLEAR'}
                  </h2>
                  
                  {triageStatus.alerts.length > 0 ? (
                    <ul className="space-y-3">
                      {triageStatus.alerts.map((alert, i) => (
                        <li key={i} className={`p-3 rounded font-bold text-sm ${alert.includes('🚨') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-orange-100 text-orange-800 border border-orange-300'}`}>
                          {alert}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-green-700 font-medium">Vitals are within normal clinical ranges. No danger signs detected.</p>
                  )}
                  
                  {triageStatus.isCritical && (
                    <div className="mt-4 p-3 bg-red-600 text-white font-bold rounded shadow text-center">
                      MANDATORY REFERRAL REQUIRED
                    </div>
                  )}
                </div>

                {/* Visit History */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Patient History</h2>
                  {existingVisits.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No previous visits recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {existingVisits.slice().reverse().map((visit) => (
                        <div key={visit.visit_id} className={`p-3 border rounded text-sm ${visit.is_high_risk ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                          <div className="flex justify-between font-bold mb-1">
                            <span>Visit #{visit.visit_number}</span>
                            <span>{new Date(visit.visit_date).toLocaleDateString('en-GB')}</span>
                          </div>
                          <div className="text-gray-600">Gestational Age: {visit.gestational_age || '-'} wks</div>
                          <div className="text-gray-600">BP: {visit.blood_pressure_systolic || '-'}/{visit.blood_pressure_diastolic || '-'}</div>
                          {visit.is_high_risk && <div className="text-red-600 font-bold mt-1 text-xs">FLAGGED HIGH RISK</div>}
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