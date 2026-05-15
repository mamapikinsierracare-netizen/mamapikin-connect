// src/app/delivery/page.tsx
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

type Delivery = {
  delivery_id: string
  patient_id: string
  delivery_date: string
  delivery_place: string
  mode_of_delivery: string
  attended_by: string
  labour_duration_hours: number | null
  rupture_of_membranes_hours: number | null
  oxytocin_used: boolean
  baby_name: string
  baby_gender: string
  birth_weight: number | null
  birth_length: number | null
  head_circumference: number | null
  apgar_1min: number | null
  apgar_5min: number | null
  apgar_10min: number | null
  resuscitation: boolean
  baby_condition: string
  maternal_complications: string[]
  estimated_blood_loss: number | null
  pph_risk_score: number | null
  placenta_complete: boolean
  perineal_tear: string
  episiotomy: boolean
  maternal_outcome: string
  baby_outcome: string
  referral_to: string
  notes: string
  visit_date: string
  synced_to_cloud: boolean
}

function safeString(value: any): string {
  if (!value || value === null || value === undefined) return ''
  return String(value)
}

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
            village: p.village || null,
            date_of_birth: p.date_of_birth || null
          })
        }
      })
    } catch (e) { console.error(e) }
  }
  
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

async function getPatientDeliveries(patientId: string): Promise<Delivery[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `deliveries_${patientId}`
  const localDeliveries = localStorage.getItem(localKey)
  const localList: Delivery[] = localDeliveries ? JSON.parse(localDeliveries) : []
  
  let cloudList: Delivery[] = []
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/deliveries?patient_id=eq.${patientId}&order=delivery_date.desc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        cloudList = await response.json()
      }
    } catch { /* ignore */ }
  }
  
  const allDeliveries = [...localList, ...cloudList]
  return allDeliveries.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime())
}

function getApgarInterpretation(score: number | null): string {
  if (score === null) return ''
  if (score >= 7) return '✅ Normal'
  if (score >= 4) return '⚠️ Moderately abnormal'
  return '🔴 Critically low'
}

// YOUR ORIGINAL PPH SCORING LOGIC RESTORED
function calculatePphRisk(riskFactors: string[]): { score: number; risk: string } {
  let score = 0
  if (riskFactors.includes('Previous PPH')) score += 2
  if (riskFactors.includes('Multiple pregnancy')) score += 2
  if (riskFactors.includes('Grand multipara (≥5 deliveries)')) score += 1
  if (riskFactors.includes('Prolonged labour (>12 hours)')) score += 2
  if (riskFactors.includes('Placenta praevia')) score += 3
  if (riskFactors.includes('Pre-eclampsia')) score += 1
  if (riskFactors.includes('Anaemia (Hb <9)')) score += 1
  if (riskFactors.includes('Age >35')) score += 1
  
  let risk = 'Low'
  if (score >= 5) risk = 'High'
  else if (score >= 3) risk = 'Moderate'
  
  return { score, risk }
}

// THE LIVE CLINICAL DASHBOARD LOGIC
function checkAlerts(form: Partial<Delivery>, pphRiskState: { score: number; risk: string }): { alerts: string[], isCritical: boolean } {
  const alerts: string[] = []
  let isCritical = false;

  // Check Active Blood Loss
  if (form.estimated_blood_loss) {
    const isCSection = form.mode_of_delivery === 'C-section';
    const limit = isCSection ? 1000 : 500;
    
    if (form.estimated_blood_loss >= limit) {
      alerts.push(`🚨 CRITICAL PPH DETECTED: Blood loss (${form.estimated_blood_loss}mL) exceeds safe limit for ${form.mode_of_delivery}. INITIATE PPH PROTOCOL.`);
      isCritical = true;
    } else if (form.estimated_blood_loss >= (limit - 100)) {
      alerts.push(`🟠 BORDERLINE BLOOD LOSS (${form.estimated_blood_loss}mL): Monitor mother closely for PPH signs.`);
    }
  }

  // Check PPH Background Risk
  if (pphRiskState.risk === 'High') {
    alerts.push(`🚨 HIGH BASELINE PPH RISK (Score: ${pphRiskState.score}). Ensure IV access and Oxytocin are ready.`);
    isCritical = true;
  }

  // Neonatal Check
  if (form.apgar_5min !== null && form.apgar_5min !== undefined) {
    if (form.apgar_5min < 7) {
      alerts.push(`🚨 LOW 5-MIN APGAR (${form.apgar_5min}): Neonatal resuscitation and close monitoring required.`);
      isCritical = true;
    }
  }

  if (form.labour_duration_hours && form.labour_duration_hours > 24) {
    alerts.push(`⚠️ PROLONGED LABOUR (>24h): Increased risk of infection and PPH.`);
  }

  return { alerts, isCritical }
}

export default function DeliveryPage() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [searchTerm, setSearchTerm] = useState('')
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [existingDeliveries, setExistingDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  
  const [pphRiskFactors, setPphRiskFactors] = useState<string[]>([])
  const [pphRisk, setPphRisk] = useState<{ score: number; risk: string }>({ score: 0, risk: 'Low' })
  const [triageStatus, setTriageStatus] = useState<{alerts: string[], isCritical: boolean}>({alerts: [], isCritical: false})
  const searchRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState<Partial<Delivery>>({
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_place: 'Facility',
    mode_of_delivery: 'SVD',
    attended_by: '',
    labour_duration_hours: null,
    rupture_of_membranes_hours: null,
    oxytocin_used: false,
    baby_name: '',
    baby_gender: '',
    birth_weight: null,
    birth_length: null,
    head_circumference: null,
    apgar_1min: null,
    apgar_5min: null,
    apgar_10min: null,
    resuscitation: false,
    baby_condition: 'Alive and well',
    maternal_complications: [],
    estimated_blood_loss: null,
    pph_risk_score: null,
    placenta_complete: true,
    perineal_tear: 'None',
    episiotomy: false,
    maternal_outcome: 'Alive',
    baby_outcome: 'Alive',
    referral_to: '',
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

  // THE SILENT POSTMAN
  useEffect(() => {
    async function triggerSync() {
      if (!navigator.onLine) return;
      try {
        const { getPendingSyncQueue, markAsSynced } = await import('@/lib/db');
        const queue = await getPendingSyncQueue();
        if (queue.length === 0) return;

        for (const item of queue) {
          if (item.table === 'deliveries' && item.operation === 'INSERT') {
            const { pending_sync, synced, last_modified, id, ...cleanData } = item.data;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            
            const response = await fetch(`${supabaseUrl}/rest/v1/deliveries`, {
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
              console.log(`✅ Postman Delivered: Delivery ${id} to cloud.`);
            }
          }
        }
      } catch (error) {
        console.error("❌ Delivery Postman error:", error);
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
        const fullName = safeString(p.full_name).toLowerCase()
        const patientId = safeString(p.patient_id).toLowerCase()
        const phone = safeString(p.phone).toLowerCase()
        return fullName.includes(lowerSearch) || patientId.includes(lowerSearch) || phone.includes(lowerSearch)
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
      getPatientDeliveries(selectedPatient.patient_id).then(deliveries => {
        setExistingDeliveries(deliveries)
      })
    }
  }, [selectedPatient])

  // Process PPH factors -> update risk state -> update Dashboard
  useEffect(() => {
    const result = calculatePphRisk(pphRiskFactors)
    setPphRisk(result)
    setFormData(prev => ({ ...prev, pph_risk_score: result.score }))
  }, [pphRiskFactors])

  useEffect(() => {
    const status = checkAlerts(formData, pphRisk)
    setTriageStatus(status)
  }, [formData, pphRisk])

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setShowDropdown(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    if (type === 'checkbox' && name === 'maternal_complications') {
      const current = formData.maternal_complications as string[]
      if (checked) {
        setFormData({ ...formData, [name]: [...current, value] })
      } else {
        setFormData({ ...formData, [name]: current.filter(v => v !== value) })
      }
    } else if (type === 'checkbox' && name === 'pph_risk_factors') {
      if (checked) {
        setPphRiskFactors([...pphRiskFactors, value])
      } else {
        setPphRiskFactors(pphRiskFactors.filter(v => v !== value))
      }
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked })
    } else if (['birth_weight', 'birth_length', 'head_circumference'].includes(name)) {
      setFormData({ ...formData, [name]: value ? parseFloat(value) : null })
    } else if (['labour_duration_hours', 'rupture_of_membranes_hours', 'estimated_blood_loss', 'apgar_1min', 'apgar_5min', 'apgar_10min'].includes(name)) {
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
      const deliveryId = `DEL-${selectedPatient.patient_id}-${Date.now()}`
      
      const deliveryData = {
        id: deliveryId, // For Dexie
        delivery_id: deliveryId,
        patient_id: selectedPatient.patient_id,
        delivery_date: formData.delivery_date || new Date().toISOString(),
        delivery_place: formData.delivery_place || 'Facility',
        mode_of_delivery: formData.mode_of_delivery || 'SVD',
        attended_by: formData.attended_by || '',
        labour_duration_hours: formData.labour_duration_hours || null,
        rupture_of_membranes_hours: formData.rupture_of_membranes_hours || null,
        oxytocin_used: formData.oxytocin_used || false,
        baby_name: formData.baby_name || '',
        baby_gender: formData.baby_gender || '',
        birth_weight: formData.birth_weight || null,
        birth_length: formData.birth_length || null,
        head_circumference: formData.head_circumference || null,
        apgar_1min: formData.apgar_1min || null,
        apgar_5min: formData.apgar_5min || null,
        apgar_10min: formData.apgar_10min || null,
        resuscitation: formData.resuscitation || false,
        baby_condition: formData.baby_condition || 'Alive and well',
        maternal_complications: formData.maternal_complications || [],
        estimated_blood_loss: formData.estimated_blood_loss || null,
        pph_risk_score: pphRisk.score,
        placenta_complete: formData.placenta_complete !== false,
        perineal_tear: formData.perineal_tear || 'None',
        episiotomy: formData.episiotomy || false,
        maternal_outcome: formData.maternal_outcome || 'Alive',
        baby_outcome: formData.baby_outcome || 'Alive',
        referral_to: formData.referral_to || '',
        notes: formData.notes || '',
        visit_date: new Date().toISOString(),
      }
      
      // THE FIX: Save directly to the Offline Outbox!
      await saveOffline('deliveries', deliveryData);
      
      setMessageType('success')
      setMessage(`✅ Delivery recorded and safely stored in Offline Outbox!`)
      
      setFormData({
        delivery_date: new Date().toISOString().split('T')[0],
        delivery_place: 'Facility',
        mode_of_delivery: 'SVD',
        attended_by: '',
        labour_duration_hours: null,
        rupture_of_membranes_hours: null,
        oxytocin_used: false,
        baby_name: '',
        baby_gender: '',
        birth_weight: null,
        birth_length: null,
        head_circumference: null,
        apgar_1min: null,
        apgar_5min: null,
        apgar_10min: null,
        resuscitation: false,
        baby_condition: 'Alive and well',
        maternal_complications: [],
        estimated_blood_loss: null,
        pph_risk_score: null,
        placenta_complete: true,
        perineal_tear: 'None',
        episiotomy: false,
        maternal_outcome: 'Alive',
        baby_outcome: 'Alive',
        referral_to: '',
        notes: '',
      })
      setPphRiskFactors([])
      
      const updated = await getPatientDeliveries(selectedPatient.patient_id)
      setExistingDeliveries(updated)

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

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
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
            <h1 className="text-3xl font-bold text-green-700">Labour & Delivery Dashboard</h1>
            <p className="text-gray-600">Record delivery outcomes and monitor clinical guardrails</p>
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
              
              {/* Left Side: The FULL Form Restored */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                  
                  {/* Delivery Information */}
                  <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <h3 className="text-lg font-bold text-purple-800 mb-3 border-b border-purple-200 pb-2">📋 Delivery Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Delivery Date</label>
                        <input type="date" name="delivery_date" value={formData.delivery_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Delivery Place</label>
                        <select name="delivery_place" value={formData.delivery_place} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Facility">Health Facility</option>
                          <option value="Home">Home</option>
                          <option value="En Route">En Route to Facility</option>
                          <option value="TBA">Traditional Birth Attendant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Mode of Delivery</label>
                        <select name="mode_of_delivery" value={formData.mode_of_delivery} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="SVD">Spontaneous Vaginal Delivery (SVD)</option>
                          <option value="Assisted Vaginal">Assisted Vaginal Delivery</option>
                          <option value="C-section">Caesarean Section</option>
                          <option value="Vacuum">Vacuum Extraction</option>
                          <option value="Forceps">Forceps Delivery</option>
                          <option value="Breech">Breech Delivery</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Attended By</label>
                        <input type="text" name="attended_by" value={formData.attended_by} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Nurse Mariama" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Labour Duration (hours)</label>
                        <input type="number" name="labour_duration_hours" value={formData.labour_duration_hours || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Rupture of Membranes (hrs)</label>
                        <input type="number" name="rupture_of_membranes_hours" value={formData.rupture_of_membranes_hours || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="oxytocin_used" checked={formData.oxytocin_used} onChange={handleChange} />
                          <span className="font-medium">Oxytocin used during labour</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Baby Information */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="text-lg font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">👶 Baby Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Baby Name</label>
                        <input type="text" name="baby_name" value={formData.baby_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Baby Gender</label>
                        <select name="baby_gender" value={formData.baby_gender} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Intersex">Intersex</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Birth Weight (kg)</label>
                        <input type="number" step="0.01" name="birth_weight" value={formData.birth_weight || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Birth Length (cm)</label>
                        <input type="number" step="0.1" name="birth_length" value={formData.birth_length || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Head Circumference (cm)</label>
                        <input type="number" step="0.1" name="head_circumference" value={formData.head_circumference || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <label className="block text-gray-700 font-medium mb-2">APGAR Scores</label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600">1 Minute</label>
                          <input type="number" name="apgar_1min" value={formData.apgar_1min || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" min="0" max="10" />
                          {formData.apgar_1min !== null && formData.apgar_1min !== undefined && (
                            <span className="text-xs">{getApgarInterpretation(formData.apgar_1min)}</span>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">5 Minutes</label>
                          <input type="number" name="apgar_5min" value={formData.apgar_5min || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg ${(formData.apgar_5min !== null && formData.apgar_5min !== undefined && formData.apgar_5min < 7) ? 'bg-red-50 border-red-500' : ''}`} min="0" max="10" />
                          {formData.apgar_5min !== null && formData.apgar_5min !== undefined && (
                            <span className="text-xs">{getApgarInterpretation(formData.apgar_5min)}</span>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">10 Minutes</label>
                          <input type="number" name="apgar_10min" value={formData.apgar_10min || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" min="0" max="10" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="resuscitation" checked={formData.resuscitation} onChange={handleChange} />
                          <span>Resuscitation required</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Baby Condition</label>
                        <select name="baby_condition" value={formData.baby_condition} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Alive and well">Alive and well</option>
                          <option value="Alive with complications">Alive with complications</option>
                          <option value="Stillbirth">Stillbirth</option>
                          <option value="Neonatal death">Neonatal death</option>
                          <option value="Referred to NICU">Referred to NICU</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Maternal Assessment (PPH Risk & Blood Loss) */}
                  <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-100">
                    <h3 className="text-lg font-bold text-red-800 mb-3 border-b border-red-200 pb-2">⚠️ Maternal Assessment</h3>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 font-medium mb-2">PPH Background Risk Factors (Check all that apply)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Previous PPH', 'Multiple pregnancy', 'Grand multipara (≥5 deliveries)', 'Prolonged labour (>12 hours)', 'Placenta praevia', 'Pre-eclampsia', 'Anaemia (Hb <9)', 'Age >35'].map((factor, idx) => (
                          <label key={`pph-${idx}`} className="flex items-center gap-2">
                            <input type="checkbox" name="pph_risk_factors" value={factor} checked={pphRiskFactors.includes(factor)} onChange={handleChange} />
                            <span className="text-sm">{factor}</span>
                          </label>
                        ))}
                      </div>
                      {pphRisk.score > 0 && (
                        <div className={`mt-2 p-2 rounded text-sm font-bold ${pphRisk.risk === 'High' ? 'bg-red-200 text-red-800' : pphRisk.risk === 'Moderate' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                          PPH Background Risk Score: {pphRisk.score} - {pphRisk.risk} Risk
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-red-200 pt-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Estimated Blood Loss (mL)</label>
                        <input type="number" name="estimated_blood_loss" value={formData.estimated_blood_loss || ''} onChange={handleChange} 
                           className={`w-full px-3 py-2 border rounded-lg focus:border-red-500 ${(formData.estimated_blood_loss && formData.estimated_blood_loss >= 500) ? 'bg-red-100 border-red-500 font-bold text-red-700' : ''}`} 
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="placenta_complete" checked={formData.placenta_complete} onChange={handleChange} />
                          <span>Placenta delivered completely</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Perineal Tear</label>
                        <select name="perineal_tear" value={formData.perineal_tear} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="None">None</option>
                          <option value="1st degree">1st degree</option>
                          <option value="2nd degree">2nd degree</option>
                          <option value="3rd degree">3rd degree</option>
                          <option value="4th degree">4th degree</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="episiotomy" checked={formData.episiotomy} onChange={handleChange} />
                          <span>Episiotomy performed</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <label className="block text-gray-700 font-medium mb-2">Maternal Complications Occurred</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['PPH', 'Eclampsia', 'Retained placenta', 'Uterine rupture', 'Sepsis', 'Obstructed labour', 'Cord prolapse', 'Maternal death'].map((comp, idx) => (
                          <label key={`comp-${idx}`} className="flex items-center gap-2">
                            <input type="checkbox" name="maternal_complications" value={comp} checked={formData.maternal_complications?.includes(comp)} onChange={handleChange} />
                            <span className="text-sm">{comp}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Outcomes */}
                  <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
                    <h3 className="text-lg font-bold text-green-800 mb-3 border-b border-green-200 pb-2">📊 Outcomes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Maternal Outcome</label>
                        <select name="maternal_outcome" value={formData.maternal_outcome} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Alive">Alive - Well</option>
                          <option value="Alive with complications">Alive with complications</option>
                          <option value="Referred">Referred to another facility</option>
                          <option value="Maternal death">Maternal death</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Baby Outcome</label>
                        <select name="baby_outcome" value={formData.baby_outcome} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Alive">Alive - Well</option>
                          <option value="Alive with complications">Alive with complications</option>
                          <option value="Referred to NICU">Referred to NICU</option>
                          <option value="Stillbirth">Stillbirth</option>
                          <option value="Neonatal death">Neonatal death</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 font-medium mb-1">Referral To (if applicable)</label>
                        <input type="text" name="referral_to" value={formData.referral_to} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., PCMH Freetown" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-gray-700 font-medium mb-1">Clinical Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full mt-6 py-4 rounded-lg text-white font-bold text-lg shadow-lg ${loading ? 'bg-gray-400' : triageStatus.isCritical ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {loading ? 'Saving...' : triageStatus.isCritical ? '🚨 LOG CRITICAL DELIVERY' : '✅ Save Delivery Record'}
                  </button>
                </form>
              </div>

              {/* Right Side: The Clinical Dashboard */}
              <div className="space-y-6">
                
                {/* Real-time Triage Box */}
                <div className={`rounded-lg shadow-md p-6 border-t-8 ${triageStatus.isCritical ? 'bg-red-50 border-red-600' : triageStatus.alerts.length > 0 ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'}`}>
                  <h2 className={`text-xl font-black mb-4 flex items-center gap-2 ${triageStatus.isCritical ? 'text-red-700' : triageStatus.alerts.length > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                    {triageStatus.isCritical ? '🚨 EMERGENCY ALERTS' : triageStatus.alerts.length > 0 ? '⚠️ WARNINGS' : '🟢 SAFE DELIVERY'}
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
                    <p className="text-green-700 font-medium">Blood loss and neonatal vitals are within normal, safe limits.</p>
                  )}
                  
                  {triageStatus.isCritical && (
                    <div className="mt-4 p-3 bg-red-600 text-white font-bold rounded shadow text-center">
                      ACTIVATE CLINICAL PROTOCOL
                    </div>
                  )}
                </div>

                {/* Delivery History */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Previous Deliveries</h2>
                  {existingDeliveries.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No previous deliveries recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {existingDeliveries.map((del) => (
                        <div key={del.delivery_id} className="p-3 border border-gray-200 rounded text-sm">
                          <div className="flex justify-between font-bold mb-1">
                            <span>{new Date(del.delivery_date).toLocaleDateString('en-GB')}</span>
                            <span className="text-purple-700">{del.mode_of_delivery}</span>
                          </div>
                          <div className="text-gray-600">Baby: {del.baby_gender} ({del.birth_weight}kg)</div>
                          {del.estimated_blood_loss && <div className="text-gray-600">Blood Loss: {del.estimated_blood_loss}mL</div>}
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