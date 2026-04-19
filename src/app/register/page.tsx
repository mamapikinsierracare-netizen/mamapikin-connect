'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import QRCode from '@/components/QRCode'

type PatientData = {
  patient_id: string
  full_name: string
  date_of_birth: string | null
  phone: string | null
  village: string | null
  district: string | null
  blood_group: string | null
  allergies: string | null
  guardian_name: string | null
  guardian_phone: string | null
  is_pregnant: boolean
  is_breastfeeding: boolean
  is_child_under_5: boolean
  registered_at: string
  synced_to_cloud: boolean
  edd: string | null
  gestational_age: number | null
  gravida: number | null
  para: number | null
  birth_weight: number | null
  birth_length: number | null
  last_delivery_date: string | null
  exclusive_breastfeeding: boolean
  husband_name: string | null
  husband_phone: string | null
  husband_occupation: string | null
  father_name: string | null
  father_phone: string | null
  father_location: string | null
  next_of_kin_name: string | null
  next_of_kin_relationship: string | null
  next_of_kin_phone: string | null
  next_of_kin_address: string | null
  primary_decision_maker: string | null
  family_support_level: string | null
  account_opening_date: string
  account_closing_date: string
  account_status: string
}

function calculateClosingDate(
  patientType: 'pregnant' | 'breastfeeding' | 'child' | null,
  dateOfBirth: string | null,
  edd: string | null
): { openingDate: string; closingDate: string } {
  const today = new Date()
  const openingDate = today.toISOString().split('T')[0]
  let closingDate: Date = new Date(today)
  
  if (patientType === 'pregnant' && edd) {
    const eddDate = new Date(edd)
    closingDate = new Date(eddDate)
    closingDate.setDate(closingDate.getDate() + 90)
  } 
  else if ((patientType === 'breastfeeding' || patientType === 'child') && dateOfBirth) {
    const dob = new Date(dateOfBirth)
    closingDate = new Date(dob)
    closingDate.setFullYear(closingDate.getFullYear() + 5)
    closingDate.setDate(closingDate.getDate() + 90)
  }
  else {
    closingDate.setFullYear(closingDate.getFullYear() + 1)
  }
  
  return {
    openingDate,
    closingDate: closingDate.toISOString().split('T')[0]
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getDaysRemaining(closingDate: string): number {
  const today = new Date()
  const closing = new Date(closingDate)
  const diffTime = closing.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getStatusColor(daysRemaining: number): string {
  if (daysRemaining < 0) return 'bg-red-100 text-red-800 border-red-400'
  if (daysRemaining < 30) return 'bg-orange-100 text-orange-800 border-orange-400'
  if (daysRemaining < 90) return 'bg-yellow-100 text-yellow-800 border-yellow-400'
  return 'bg-green-100 text-green-800 border-green-400'
}

// ========== OFFLINE-FIRST STORAGE FUNCTIONS ==========

// Save patient to localStorage (always works offline)
function saveToLocalStorage(patientData: PatientData): boolean {
  try {
    const existing = localStorage.getItem('offline_patients')
    const patients = existing ? JSON.parse(existing) : []
    
    // Check if patient already exists
    const exists = patients.find((p: PatientData) => p.patient_id === patientData.patient_id)
    if (!exists) {
      patients.push(patientData)
      localStorage.setItem('offline_patients', JSON.stringify(patients))
      console.log('💾 Patient saved to localStorage:', patientData.patient_id)
    }
    return true
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
    return false
  }
}

// Mark patient as synced in localStorage
function markPatientAsSyncedInLocalStorage(patientId: string) {
  try {
    const existing = localStorage.getItem('offline_patients')
    if (existing) {
      const patients = JSON.parse(existing)
      const updated = patients.map((p: PatientData) =>
        p.patient_id === patientId ? { ...p, synced_to_cloud: true } : p
      )
      localStorage.setItem('offline_patients', JSON.stringify(updated))
      console.log('✅ Marked patient as synced:', patientId)
    }
  } catch (error) {
    console.error('Failed to mark patient as synced:', error)
  }
}

// Save to Supabase (online only)
async function saveToSupabase(patientData: PatientData): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Missing Supabase credentials' }
  }
  
  const { id, ...dataToSend } = patientData as any
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSend)
    })
    
    if (response.ok) {
      console.log('✅ Patient saved to Supabase!')
      return { success: true }
    } else {
      const errorText = await response.text()
      console.error('Supabase error:', response.status, errorText)
      return { success: false, error: `${response.status}: ${errorText}` }
    }
  } catch (error) {
    console.error('Network error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

// Check if Supabase is reachable
async function isSupabaseReachable(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return false
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?limit=1`, {
      headers: { 
        'apikey': supabaseAnonKey, 
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch { 
    return false 
  }
}

// Get all offline patients (for testing/sync)
function getAllOfflinePatients(): PatientData[] {
  try {
    const data = localStorage.getItem('offline_patients')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Sync all offline patients to cloud
async function syncAllOfflinePatients(): Promise<{ synced: number; failed: number }> {
  const patients = getAllOfflinePatients()
  const unsynced = patients.filter(p => !p.synced_to_cloud)
  
  let synced = 0
  let failed = 0
  
  for (const patient of unsynced) {
    const result = await saveToSupabase(patient)
    if (result.success) {
      markPatientAsSyncedInLocalStorage(patient.patient_id)
      synced++
    } else {
      failed++
    }
  }
  
  return { synced, failed }
}

export default function RegisterPage() {
  const [step, setStep] = useState<'who' | 'type' | 'form'>('who')
  const [registrationType, setRegistrationType] = useState<'staff' | 'emergency' | null>(null)
  const [patientType, setPatientType] = useState<'pregnant' | 'breastfeeding' | 'child' | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [calculatedDates, setCalculatedDates] = useState<{ openingDate: string; closingDate: string } | null>(null)
  const [daysRemaining, setDaysRemaining] = useState<number>(0)
  const [lastSavedPatientId, setLastSavedPatientId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    phone: '',
    village: '',
    district: '',
    blood_group: '',
    allergies: '',
    guardian_name: '',
    guardian_phone: '',
    husband_name: '',
    husband_phone: '',
    husband_occupation: '',
    father_name: '',
    father_phone: '',
    father_location: '',
    next_of_kin_name: '',
    next_of_kin_relationship: '',
    next_of_kin_phone: '',
    next_of_kin_address: '',
    primary_decision_maker: '',
    family_support_level: '',
    edd: '',
    gestational_age: '',
    gravida: '',
    para: '',
    birth_weight: '',
    birth_length: '',
    last_delivery_date: '',
    exclusive_breastfeeding: false,
  })

  // Check connection status
  useEffect(() => {
    async function checkConnection() {
      const online = await isSupabaseReachable()
      setConnectionStatus(online ? 'online' : 'offline')
      setIsOnline(online)
    }
    checkConnection()
    
    const interval = setInterval(checkConnection, 10000)
    return () => clearInterval(interval)
  }, [])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setConnectionStatus('online')
      // Try to sync when coming back online
      syncAllOfflinePatients().then(result => {
        if (result.synced > 0) {
          setMessageType('success')
          setMessage(`✅ ${result.synced} pending patient(s) synced to cloud!`)
          setTimeout(() => setMessage(''), 5000)
        }
      })
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setConnectionStatus('offline')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (patientType === 'pregnant' && formData.edd) {
      const dates = calculateClosingDate(patientType, null, formData.edd)
      setCalculatedDates(dates)
      setDaysRemaining(getDaysRemaining(dates.closingDate))
    } else if ((patientType === 'breastfeeding' || patientType === 'child') && formData.date_of_birth) {
      const dates = calculateClosingDate(patientType, formData.date_of_birth, null)
      setCalculatedDates(dates)
      setDaysRemaining(getDaysRemaining(dates.closingDate))
    } else {
      setCalculatedDates(null)
    }
  }, [patientType, formData.edd, formData.date_of_birth])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
  }

  function generatePatientId() {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `MCH-KAB-${year}-${random}`
  }

  function resetAndStartOver() {
    setStep('who')
    setRegistrationType(null)
    setPatientType(null)
    setCalculatedDates(null)
    setLastSavedPatientId(null)
    setFormData({
      full_name: '', date_of_birth: '', phone: '', village: '', district: '',
      blood_group: '', allergies: '', guardian_name: '', guardian_phone: '',
      husband_name: '', husband_phone: '', husband_occupation: '',
      father_name: '', father_phone: '', father_location: '',
      next_of_kin_name: '', next_of_kin_relationship: '', next_of_kin_phone: '', next_of_kin_address: '',
      primary_decision_maker: '', family_support_level: '',
      edd: '', gestational_age: '', gravida: '', para: '',
      birth_weight: '', birth_length: '', last_delivery_date: '', exclusive_breastfeeding: false,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setLastSavedPatientId(null)
    
    try {
      const patientId = generatePatientId()
      const dates = calculateClosingDate(patientType, formData.date_of_birth || null, formData.edd || null)
      
      const patientData: PatientData = {
        patient_id: patientId,
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth || null,
        phone: formData.phone || null,
        village: formData.village || null,
        district: formData.district || null,
        blood_group: formData.blood_group || null,
        allergies: formData.allergies || null,
        guardian_name: formData.guardian_name || null,
        guardian_phone: formData.guardian_phone || null,
        is_pregnant: patientType === 'pregnant',
        is_breastfeeding: patientType === 'breastfeeding',
        is_child_under_5: patientType === 'child',
        registered_at: new Date().toISOString(),
        synced_to_cloud: false,
        edd: formData.edd || null,
        gestational_age: formData.gestational_age ? parseInt(formData.gestational_age) : null,
        gravida: formData.gravida ? parseInt(formData.gravida) : null,
        para: formData.para ? parseInt(formData.para) : null,
        birth_weight: formData.birth_weight ? parseFloat(formData.birth_weight) : null,
        birth_length: formData.birth_length ? parseFloat(formData.birth_length) : null,
        last_delivery_date: formData.last_delivery_date || null,
        exclusive_breastfeeding: formData.exclusive_breastfeeding,
        husband_name: formData.husband_name || null,
        husband_phone: formData.husband_phone || null,
        husband_occupation: formData.husband_occupation || null,
        father_name: formData.father_name || null,
        father_phone: formData.father_phone || null,
        father_location: formData.father_location || null,
        next_of_kin_name: formData.next_of_kin_name || null,
        next_of_kin_relationship: formData.next_of_kin_relationship || null,
        next_of_kin_phone: formData.next_of_kin_phone || null,
        next_of_kin_address: formData.next_of_kin_address || null,
        primary_decision_maker: formData.primary_decision_maker || null,
        family_support_level: formData.family_support_level || null,
        account_opening_date: dates.openingDate,
        account_closing_date: dates.closingDate,
        account_status: 'active'
      }
      
      // STEP 1: ALWAYS save to localStorage first (offline-first)
      const localSaved = saveToLocalStorage(patientData)
      
      if (!localSaved) {
        throw new Error('Failed to save patient data locally')
      }
      
      setLastSavedPatientId(patientId)
      
      // STEP 2: Try to save to cloud if online
      let cloudSaved = false
      let cloudError = ''
      
      if (isOnline && connectionStatus === 'online') {
        const result = await saveToSupabase(patientData)
        cloudSaved = result.success
        cloudError = result.error || ''
        
        if (cloudSaved) {
          markPatientAsSyncedInLocalStorage(patientId)
        }
      }
      
      // STEP 3: Show appropriate message
      if (cloudSaved) {
        setMessageType('success')
        setMessage(`✅ PATIENT REGISTERED SUCCESSFULLY!\n\nID: ${patientId}\nAccount Opening: ${formatDate(dates.openingDate)}\nAccount Closing: ${formatDate(dates.closingDate)}\n✅ Data saved to CLOUD DATABASE`)
      } else if (isOnline && connectionStatus === 'online') {
        setMessageType('warning')
        setMessage(`⚠️ PATIENT SAVED LOCALLY ONLY\n\nID: ${patientId}\nCloud save failed: ${cloudError}\nData will sync automatically when connection improves.`)
      } else {
        setMessageType('info')
        setMessage(`📡 OFFLINE REGISTRATION SUCCESSFUL\n\nID: ${patientId}\nAccount Opening: ${formatDate(dates.openingDate)}\nAccount Closing: ${formatDate(dates.closingDate)}\n✅ Data saved to LOCAL STORAGE\n🔄 Will sync automatically when online.`)
      }
      
      // Don't reset form immediately - show QR code first
      // Reset after 10 seconds or when user clicks "Register Another"
      setTimeout(() => {
        if (lastSavedPatientId === patientId) {
          // Only reset if this is still the last saved patient
        }
      }, 10000)
      
    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  function registerAnother() {
    resetAndStartOver()
    setLastSavedPatientId(null)
    setMessage('')
  }

  if (step === 'who') {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-4">
            <div className={`mb-4 p-3 rounded-lg text-center ${
              connectionStatus === 'online' ? 'bg-green-100 text-green-800 border border-green-500' : 
              connectionStatus === 'offline' ? 'bg-yellow-100 text-yellow-800 border border-yellow-500' :
              'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus === 'online' ? '✅ ONLINE MODE - Data will save to cloud' : 
               connectionStatus === 'offline' ? '📡 OFFLINE MODE - Data will save locally and sync later' : 
               '⏳ Checking connection...'}
            </div>
            
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
              <p className="text-gray-600">Patient Registration - SierraCare</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Who is registering the patient?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => {
                    setRegistrationType('staff')
                    setStep('type')
                  }}
                  className="p-8 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 hover:border-green-400 transition-all text-center"
                >
                  <div className="text-6xl mb-3">👩‍⚕️</div>
                  <div className="text-xl font-bold text-green-800">Staff Registration</div>
                  <div className="text-sm text-gray-600 mt-2">Complete KYC with all required medical information</div>
                </button>
                
                <button
                  onClick={() => {
                    setRegistrationType('emergency')
                    setPatientType('pregnant')
                    setStep('form')
                  }}
                  className="p-8 bg-yellow-50 border-2 border-yellow-200 rounded-xl hover:bg-yellow-100 hover:border-yellow-400 transition-all text-center"
                >
                  <div className="text-6xl mb-3">🚨</div>
                  <div className="text-xl font-bold text-yellow-800">Emergency / Self Registration</div>
                  <div className="text-sm text-gray-600 mt-2">Minimal information required. Complete KYC within 36 hours</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (step === 'type') {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-4">
            <button onClick={resetAndStartOver} className="text-green-600 mb-4">← Back</button>
            
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Select Patient Type</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => {
                    setPatientType('pregnant')
                    setStep('form')
                  }}
                  className="p-6 bg-pink-50 border-2 border-pink-200 rounded-xl hover:bg-pink-100 transition-all text-center"
                >
                  <div className="text-5xl mb-3">🤰</div>
                  <div className="text-lg font-bold text-pink-800">Pregnant Woman</div>
                  <div className="text-xs text-gray-600 mt-2">Account closes: EDD + 90 days</div>
                </button>
                
                <button
                  onClick={() => {
                    setPatientType('breastfeeding')
                    setStep('form')
                  }}
                  className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-all text-center"
                >
                  <div className="text-5xl mb-3">🤱</div>
                  <div className="text-lg font-bold text-blue-800">Breastfeeding Mother</div>
                  <div className="text-xs text-gray-600 mt-2">Account closes: DOB + 5 years + 90 days</div>
                </button>
                
                <button
                  onClick={() => {
                    setPatientType('child')
                    setStep('form')
                  }}
                  className="p-6 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-all text-center"
                >
                  <div className="text-5xl mb-3">👶</div>
                  <div className="text-lg font-bold text-green-800">Child Under 5</div>
                  <div className="text-xs text-gray-600 mt-2">Account closes: DOB + 5 years + 90 days</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const isEmergency = registrationType === 'emergency'
  const isStaff = registrationType === 'staff'

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className={`mb-4 p-3 rounded-lg text-center ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800 border border-green-500' : 
            connectionStatus === 'offline' ? 'bg-yellow-100 text-yellow-800 border border-yellow-500' :
            'bg-gray-100 text-gray-800'
          }`}>
            {connectionStatus === 'online' ? '✅ ONLINE MODE - Data will save to cloud' : 
             connectionStatus === 'offline' ? '📡 OFFLINE MODE - Data will save locally and sync later' : 
             '⏳ Checking connection...'}
          </div>
          
          {message && (
            <div className={`mb-4 p-4 rounded-lg whitespace-pre-line ${
              messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-400' : 
              messageType === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-400' :
              messageType === 'info' ? 'bg-blue-100 text-blue-800 border border-blue-400' :
              'bg-red-100 text-red-800 border border-red-400'
            }`}>
              {message}
            </div>
          )}
          
          <div className="flex justify-between items-center mb-4">
            <button onClick={resetAndStartOver} className="text-green-600">← Back</button>
            {lastSavedPatientId && (
              <button onClick={registerAnother} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                + Register Another Patient
              </button>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {isEmergency ? 'Emergency Registration' : 
               patientType === 'pregnant' ? 'Register Pregnant Woman' :
               patientType === 'breastfeeding' ? 'Register Breastfeeding Mother' : 'Register Child Under 5'}
            </h2>
            {isEmergency && <p className="text-yellow-600 text-sm mb-4">Complete full KYC within 36 hours</p>}
            
            {calculatedDates && (
              <div className={`mb-6 p-4 rounded-lg border-2 ${getStatusColor(daysRemaining)}`}>
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <div className="text-sm font-medium">Account Opening Date</div>
                    <div className="text-lg font-bold">{formatDate(calculatedDates.openingDate)}</div>
                  </div>
                  <div className="text-2xl">→</div>
                  <div>
                    <div className="text-sm font-medium">Account Closing Date</div>
                    <div className="text-lg font-bold">{formatDate(calculatedDates.closingDate)}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    daysRemaining < 0 ? 'bg-red-200 text-red-800' :
                    daysRemaining < 30 ? 'bg-orange-200 text-orange-800' :
                    daysRemaining < 90 ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {daysRemaining < 0 ? 'ACCOUNT EXPIRED' : `${daysRemaining} days remaining`}
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              {/* Demographics */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Personal Information</h3>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Date of Birth</label>
                    <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Village / Town</label>
                    <input type="text" name="village" value={formData.village} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">District</label>
                    <select name="district" value={formData.district} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select District</option>
                      <option value="Kailahun">Kailahun</option><option value="Kenema">Kenema</option>
                      <option value="Kono">Kono</option><option value="Bombali">Bombali</option>
                      <option value="Kambia">Kambia</option><option value="Koinadugu">Koinadugu</option>
                      <option value="Tonkolili">Tonkolili</option><option value="Port Loko">Port Loko</option>
                      <option value="Western Area Urban">Western Area Urban</option>
                      <option value="Western Area Rural">Western Area Rural</option>
                      <option value="Bo">Bo</option><option value="Bonthe">Bonthe</option>
                      <option value="Pujehun">Pujehun</option><option value="Moyamba">Moyamba</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Blood Group</label>
                    <select name="blood_group" value={formData.blood_group} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Allergies</label>
                    <input type="text" name="allergies" value={formData.allergies} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Penicillin" />
                  </div>
                </div>
              </div>
              
              {/* Family Information */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-bold text-blue-800 mb-3">Family / Support System</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Husband/Partner Name</label>
                    <input type="text" name="husband_name" value={formData.husband_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Husband/Partner Phone</label>
                    <input type="tel" name="husband_phone" value={formData.husband_phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Husband/Partner Occupation</label>
                    <input type="text" name="husband_occupation" value={formData.husband_occupation} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Father&apos;s Name</label>
                    <input type="text" name="father_name" value={formData.father_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Father&apos;s Phone</label>
                    <input type="tel" name="father_phone" value={formData.father_phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Father&apos;s Location</label>
                    <input type="text" name="father_location" value={formData.father_location} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Village/Town" />
                  </div>
                </div>
              </div>
              
              {/* Next of Kin */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-bold text-purple-800 mb-3">Next of Kin (Emergency Contact)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Next of Kin Name</label>
                    <input type="text" name="next_of_kin_name" value={formData.next_of_kin_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Relationship</label>
                    <select name="next_of_kin_relationship" value={formData.next_of_kin_relationship} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Mother">Mother</option><option value="Father">Father</option>
                      <option value="Sister">Sister</option><option value="Brother">Brother</option>
                      <option value="Husband">Husband</option><option value="Grandparent">Grandparent</option>
                      <option value="Aunt">Aunt</option><option value="Uncle">Uncle</option><option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Next of Kin Phone</label>
                    <input type="tel" name="next_of_kin_phone" value={formData.next_of_kin_phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Next of Kin Address</label>
                    <input type="text" name="next_of_kin_address" value={formData.next_of_kin_address} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Primary Decision Maker</label>
                    <select name="primary_decision_maker" value={formData.primary_decision_maker} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Self">Self</option><option value="Husband">Husband</option>
                      <option value="Father">Father</option><option value="Mother">Mother</option>
                      <option value="Elder">Family Elder</option><option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Family Support Level</label>
                    <select name="family_support_level" value={formData.family_support_level} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="High">High - Strong family support</option>
                      <option value="Moderate">Moderate - Some support available</option>
                      <option value="Low">Low - Limited support</option>
                      <option value="None">None - No family support</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {(isEmergency || patientType === 'child') && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                  <h3 className="text-lg font-bold text-yellow-800 mb-3">Guardian Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Guardian Name</label>
                      <input type="text" name="guardian_name" value={formData.guardian_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Guardian Phone</label>
                      <input type="tel" name="guardian_phone" value={formData.guardian_phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
              )}
              
              {patientType === 'pregnant' && isStaff && (
                <div className="mb-6 p-4 bg-pink-50 rounded-lg">
                  <h3 className="text-lg font-bold text-pink-800 mb-3">Pregnancy Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Expected Delivery Date (EDD)</label>
                      <input type="date" name="edd" value={formData.edd} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Gestational Age (weeks)</label>
                      <input type="number" name="gestational_age" value={formData.gestational_age} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Gravida (# of pregnancies)</label>
                      <input type="number" name="gravida" value={formData.gravida} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Para (# of deliveries)</label>
                      <input type="number" name="para" value={formData.para} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
              )}
              
              {patientType === 'breastfeeding' && isStaff && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-bold text-blue-800 mb-3">Postnatal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Last Delivery Date</label>
                      <input type="date" name="last_delivery_date" value={formData.last_delivery_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Baby Birth Weight (kg)</label>
                      <input type="number" step="0.01" name="birth_weight" value={formData.birth_weight} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="exclusive_breastfeeding" checked={formData.exclusive_breastfeeding} onChange={handleChange} />
                        <span>Exclusive Breastfeeding</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {patientType === 'child' && isStaff && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <h3 className="text-lg font-bold text-green-800 mb-3">Child Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Birth Weight (kg)</label>
                      <input type="number" step="0.01" name="birth_weight" value={formData.birth_weight} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Birth Length (cm)</label>
                      <input type="number" step="0.1" name="birth_length" value={formData.birth_length} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* QR Code Display - Shows after successful registration */}
              {lastSavedPatientId && (
                <div className="mt-6 p-4 border-2 border-green-500 rounded-lg bg-green-50">
                  <h3 className="text-lg font-bold text-green-700 mb-3 text-center">
                    ✅ PATIENT REGISTERED SUCCESSFULLY
                  </h3>
                  <p className="text-center text-gray-600 mb-3">
                    Patient ID: <strong className="text-green-700">{lastSavedPatientId}</strong>
                  </p>
                  <div className="flex justify-center">
                    <QRCode value={lastSavedPatientId} size={200} />
                  </div>
                  <p className="text-sm text-gray-600 text-center mt-3">
                    📱 <strong>Give this QR code to the patient</strong><br />
                    They can scan it at future visits for faster registration.
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Click the "Download QR Code" button below the QR code to save and print.
                  </p>
                  <button
                    type="button"
                    onClick={registerAnother}
                    className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Register Another Patient
                  </button>
                </div>
              )}
              
              {!lastSavedPatientId && (
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-6 py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {loading ? 'Registering...' : 'Register Patient'}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  )
}