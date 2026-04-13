'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'

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
  id?: number
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

// Helper function
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
  
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
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

// Get existing deliveries
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

// Save delivery
async function saveDelivery(delivery: Delivery, isOnline: boolean): Promise<{ local: boolean; cloud: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `deliveries_${delivery.patient_id}`
  const existing = localStorage.getItem(localKey)
  const deliveries = existing ? JSON.parse(existing) : []
  deliveries.push(delivery)
  localStorage.setItem(localKey, JSON.stringify(deliveries))
  console.log('💾 Saved to localStorage')
  
  let cloudSaved = false
  
  if (isOnline && supabaseUrl && supabaseAnonKey) {
    try {
      const { id, ...dataWithoutId } = delivery as any
      const response = await fetch(`${supabaseUrl}/rest/v1/deliveries`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataWithoutId)
      })
      
      if (response.ok) {
        cloudSaved = true
        console.log('✅ Saved to Supabase cloud!')
      } else {
        const errorText = await response.text()
        console.log('❌ Supabase save failed:', response.status, errorText)
      }
    } catch (error) {
      console.log('❌ Supabase save error:', error)
    }
  }
  
  return { local: true, cloud: cloudSaved }
}

// Calculate APGAR score display
function getApgarInterpretation(score: number | null): string {
  if (score === null) return ''
  if (score >= 7) return '✅ Normal'
  if (score >= 4) return '⚠️ Moderately abnormal'
  return '🔴 Critically low'
}

// Calculate PPH risk score (Postpartum Haemorrhage)
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
  const [pphRisk, setPphRisk] = useState<{ score: number; risk: string }>({ score: 0, risk: 'Low' })
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

  // PPH risk factors state
  const [pphRiskFactors, setPphRiskFactors] = useState<string[]>([])

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

  // Load existing deliveries
  useEffect(() => {
    if (selectedPatient) {
      getPatientDeliveries(selectedPatient.patient_id).then(deliveries => {
        setExistingDeliveries(deliveries)
      })
    }
  }, [selectedPatient])

  // Calculate PPH risk when risk factors change
  useEffect(() => {
    const result = calculatePphRisk(pphRiskFactors)
    setPphRisk(result)
    setFormData(prev => ({ ...prev, pph_risk_score: result.score }))
  }, [pphRiskFactors])

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
      
      const delivery: Delivery = {
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
        synced_to_cloud: false,
      }
      
      const isOnline = connectionStatus === 'online'
      const result = await saveDelivery(delivery, isOnline)
      
      if (result.cloud) {
        setMessageType('success')
        setMessage(`✅ Delivery recorded and saved to CLOUD!`)
      } else if (result.local && isOnline) {
        setMessageType('warning')
        setMessage(`⚠️ Delivery saved locally only. Cloud save failed.`)
      } else {
        setMessageType('success')
        setMessage(`✅ Delivery saved locally! Will sync when online.`)
      }
      
      // Reset form
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
              {connectionStatus === 'online' ? '✅ ONLINE MODE - Connected to Supabase' : 
               connectionStatus === 'offline' ? '📡 OFFLINE MODE - Saving locally only' :
               '⏳ CHECKING CONNECTION...'}
            </div>
            <div className="text-sm mt-1">
              {connectionStatus === 'online' ? 'Data will save to cloud immediately' : 
               connectionStatus === 'offline' ? 'Data will save to local storage. Sync when online.' :
               'Detecting network connection...'}
            </div>
          </div>
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Labour & Delivery</h1>
            <p className="text-gray-600">Record delivery information and maternal/baby outcomes</p>
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
          
          {/* Patient Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Patient</h2>
            
            <div ref={searchRef} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name, patient ID, or phone number..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">
                      No patients found. <a href="/register" className="text-green-600 hover:underline">Register a new patient</a>
                    </div>
                  ) : (
                    filteredPatients.map((patient, index) => (
                      <div
                        key={`${patient.patient_id}-${index}`}
                        onClick={() => handleSelectPatient(patient)}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-800">{safeString(patient.full_name) || 'Unnamed Patient'}</div>
                        <div className="text-sm text-gray-500">
                          ID: {safeString(patient.patient_id)} | 📞 {patient.phone || 'No phone'} | 📍 {patient.district || 'No district'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(true)
                  setSearchTerm('')
                }}
                className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Browse all patients ({allPatients.length})
              </button>
            </div>
            
            {selectedPatient && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-green-800 text-lg">{safeString(selectedPatient.full_name)}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Patient ID:</span> {safeString(selectedPatient.patient_id)}<br />
                      <span className="font-medium">Phone:</span> {selectedPatient.phone || 'N/A'}<br />
                      <span className="font-medium">District:</span> {selectedPatient.district || 'N/A'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Delivery Form */}
          {selectedPatient && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                2. Delivery Record for {safeString(selectedPatient.full_name)}
              </h2>
              
              {/* Delivery Information */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-bold text-purple-800 mb-3">📋 Delivery Information</h3>
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
                    <input type="text" name="attended_by" value={formData.attended_by} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Nurse Mariama, Dr. James" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Labour Duration (hours)</label>
                    <input type="number" name="labour_duration_hours" value={formData.labour_duration_hours || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Rupture of Membranes (hours before delivery)</label>
                    <input type="number" name="rupture_of_membranes_hours" value={formData.rupture_of_membranes_hours || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="oxytocin_used" checked={formData.oxytocin_used} onChange={handleChange} />
                      <span>Oxytocin used during labour</span>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Baby Information */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-bold text-blue-800 mb-3">👶 Baby Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Baby Name</label>
                    <input type="text" name="baby_name" value={formData.baby_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Fatmata Sesay" />
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
                
                {/* APGAR Scores */}
                <div className="mt-4">
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
                      <input type="number" name="apgar_5min" value={formData.apgar_5min || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" min="0" max="10" />
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
              
              {/* Maternal Complications */}
              <div className="mb-6 p-4 bg-red-50 rounded-lg">
                <h3 className="text-lg font-bold text-red-800 mb-3">⚠️ Maternal Assessment</h3>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">PPH Risk Factors (Check all that apply)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Previous PPH', 'Multiple pregnancy', 'Grand multipara (≥5 deliveries)', 'Prolonged labour (>12 hours)', 'Placenta praevia', 'Pre-eclampsia', 'Anaemia (Hb <9)', 'Age >35'].map((factor, idx) => (
                      <label key={`pph-${idx}`} className="flex items-center gap-2">
                        <input type="checkbox" name="pph_risk_factors" value={factor} checked={pphRiskFactors.includes(factor)} onChange={handleChange} />
                        <span className="text-sm">{factor}</span>
                      </label>
                    ))}
                  </div>
                  {pphRisk.score > 0 && (
                    <div className={`mt-2 p-2 rounded text-sm ${pphRisk.risk === 'High' ? 'bg-red-200 text-red-800' : pphRisk.risk === 'Moderate' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                      PPH Risk Score: {pphRisk.score} - {pphRisk.risk} Risk
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Estimated Blood Loss (mL)</label>
                    <input type="number" name="estimated_blood_loss" value={formData.estimated_blood_loss || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
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
                
                <div className="mt-3">
                  <label className="block text-gray-700 font-medium mb-2">Maternal Complications (Check all that apply)</label>
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
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-bold text-green-800 mb-3">📊 Outcomes</h3>
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
              
              {/* Notes */}
              <div className="mt-4">
                <label className="block text-gray-700 font-medium mb-1">Clinical Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Enter any additional clinical notes..." />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-6 py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Saving...' : 'Save Delivery Record'}
              </button>
            </form>
          )}
          
          {/* Delivery History */}
          {selectedPatient && existingDeliveries.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Delivery History - {safeString(selectedPatient.full_name)}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Mode</th>
                      <th className="p-2 text-left">Baby Name</th>
                      <th className="p-2 text-left">Weight</th>
                      <th className="p-2 text-left">APGAR 5min</th>
                      <th className="p-2 text-left">Maternal Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingDeliveries.map((delivery, idx) => (
                      <tr key={`del-${delivery.delivery_id}-${idx}`} className="border-t">
                        <td className="p-2">{new Date(delivery.delivery_date).toLocaleDateString()}</td>
                        <td className="p-2">{delivery.mode_of_delivery}</td>
                        <td className="p-2">{delivery.baby_name || '-'}</td>
                        <td className="p-2">{delivery.birth_weight ? `${delivery.birth_weight} kg` : '-'}</td>
                        <td className="p-2">{delivery.apgar_5min || '-'}</td>
                        <td className="p-2">{delivery.maternal_outcome || '-'}</td>
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