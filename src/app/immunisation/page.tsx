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

type Child = {
  patient_id: string
  full_name: string
  date_of_birth: string | null
}

type VaccineSchedule = {
  id: number
  vaccine_name: string
  dose_number: number
  due_age_weeks: number | null
  due_age_months: number | null
  description: string
  is_active: boolean
}

type Immunisation = {
  id?: number
  immunisation_id: string
  patient_id: string
  child_name: string
  child_dob: string | null
  vaccine_name: string
  dose_number: number
  administration_date: string
  administered_by: string
  administration_route: string
  administration_site: string
  batch_number: string
  expiry_date: string | null
  manufacturer: string
  vial_monitor_stage: number | null
  cold_chain_broken: boolean
  adverse_reaction: boolean
  reaction_description: string
  contraindications: string
  next_dose_due_date: string | null
  is_completed: boolean
  was_missed: boolean
  missed_reason: string
  notes: string
  visit_date: string
  synced_to_cloud: boolean
}

// Helper functions
function safeString(value: any): string {
  if (!value || value === null || value === undefined) return ''
  return String(value)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set'
  return new Date(dateString).toLocaleDateString()
}

function calculateAgeInMonths(dob: string | null): number {
  if (!dob) return 0
  const birthDate = new Date(dob)
  const today = new Date()
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12
  months += today.getMonth() - birthDate.getMonth()
  return months
}

function calculateAgeInWeeks(dob: string | null): number {
  if (!dob) return 0
  const birthDate = new Date(dob)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - birthDate.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
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

// Get all children (patients) - immunisations are for children under 5
async function getAllChildren(): Promise<Child[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const results: Child[] = []
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
          date_of_birth: p.date_of_birth || null
        })
      }
    })
  }
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?select=patient_id,full_name,date_of_birth&order=full_name`, {
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
              date_of_birth: p.date_of_birth || null
            })
          }
        })
      }
    } catch { /* ignore */ }
  }
  
  return results.sort((a, b) => safeString(a.full_name).localeCompare(safeString(b.full_name)))
}

// Get vaccine schedule
async function getVaccineSchedule(): Promise<VaccineSchedule[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/vaccine_schedule?is_active=eq.true&order=due_age_weeks.nullslast,due_age_months.nullslast`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    if (response.ok) {
      return await response.json()
    }
  } catch { /* ignore */ }
  
  // Fallback schedule if API fails
  return [
    { id: 1, vaccine_name: 'BCG', dose_number: 1, due_age_weeks: null, due_age_months: 0, description: 'At birth - tuberculosis', is_active: true },
    { id: 2, vaccine_name: 'OPV0', dose_number: 1, due_age_weeks: null, due_age_months: 0, description: 'At birth - oral polio', is_active: true },
    { id: 3, vaccine_name: 'HepB0', dose_number: 1, due_age_weeks: null, due_age_months: 0, description: 'At birth - hepatitis B', is_active: true },
    { id: 4, vaccine_name: 'Penta', dose_number: 1, due_age_weeks: 6, due_age_months: null, description: '6 weeks - DPT+HepB+Hib', is_active: true },
    { id: 5, vaccine_name: 'PCV', dose_number: 1, due_age_weeks: 6, due_age_months: null, description: '6 weeks - pneumococcal', is_active: true },
    { id: 6, vaccine_name: 'Rota', dose_number: 1, due_age_weeks: 6, due_age_months: null, description: '6 weeks - rotavirus', is_active: true },
    { id: 7, vaccine_name: 'Penta', dose_number: 2, due_age_weeks: 10, due_age_months: null, description: '10 weeks - 2nd dose', is_active: true },
    { id: 8, vaccine_name: 'PCV', dose_number: 2, due_age_weeks: 10, due_age_months: null, description: '10 weeks - 2nd dose', is_active: true },
    { id: 9, vaccine_name: 'Rota', dose_number: 2, due_age_weeks: 10, due_age_months: null, description: '10 weeks - 2nd dose', is_active: true },
    { id: 10, vaccine_name: 'Penta', dose_number: 3, due_age_weeks: 14, due_age_months: null, description: '14 weeks - 3rd dose', is_active: true },
    { id: 11, vaccine_name: 'PCV', dose_number: 3, due_age_weeks: 14, due_age_months: null, description: '14 weeks - 3rd dose', is_active: true },
    { id: 12, vaccine_name: 'Measles', dose_number: 1, due_age_weeks: null, due_age_months: 9, description: '9 months - measles', is_active: true },
    { id: 13, vaccine_name: 'Yellow Fever', dose_number: 1, due_age_weeks: null, due_age_months: 9, description: '9 months - yellow fever', is_active: true },
    { id: 14, vaccine_name: 'Measles', dose_number: 2, due_age_weeks: null, due_age_months: 18, description: '18 months - measles 2nd dose', is_active: true },
    { id: 15, vaccine_name: 'DPT Booster', dose_number: 4, due_age_weeks: null, due_age_months: 18, description: '18 months - booster', is_active: true },
  ]
}

// Get existing immunisations for a child
async function getChildImmunisations(patientId: string): Promise<Immunisation[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `immunisations_${patientId}`
  const localImmunisations = localStorage.getItem(localKey)
  const localList: Immunisation[] = localImmunisations ? JSON.parse(localImmunisations) : []
  
  let cloudList: Immunisation[] = []
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/immunisations?patient_id=eq.${patientId}&order=administration_date.desc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        cloudList = await response.json()
      }
    } catch { /* ignore */ }
  }
  
  const allImmunisations = [...localList, ...cloudList]
  return allImmunisations.sort((a, b) => new Date(b.administration_date).getTime() - new Date(a.administration_date).getTime())
}

// Save immunisation
async function saveImmunisation(immunisation: Immunisation, isOnline: boolean): Promise<{ local: boolean; cloud: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `immunisations_${immunisation.patient_id}`
  const existing = localStorage.getItem(localKey)
  const immunisations = existing ? JSON.parse(existing) : []
  immunisations.push(immunisation)
  localStorage.setItem(localKey, JSON.stringify(immunisations))
  console.log('💾 Saved to localStorage')
  
  let cloudSaved = false
  
  if (isOnline && supabaseUrl && supabaseAnonKey) {
    try {
      const { id, ...dataWithoutId } = immunisation as any
      const response = await fetch(`${supabaseUrl}/rest/v1/immunisations`, {
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

// Get due vaccines based on child's age
function getDueVaccines(childDob: string | null, schedule: VaccineSchedule[], existingVaccines: Immunisation[]): VaccineSchedule[] {
  if (!childDob) return []
  
  const ageWeeks = calculateAgeInWeeks(childDob)
  const ageMonths = calculateAgeInMonths(childDob)
  
  const receivedVaccines = new Set(existingVaccines.map(v => `${v.vaccine_name}-${v.dose_number}`))
  
  return schedule.filter(vaccine => {
    const key = `${vaccine.vaccine_name}-${vaccine.dose_number}`
    if (receivedVaccines.has(key)) return false
    
    if (vaccine.due_age_weeks !== null && ageWeeks >= vaccine.due_age_weeks) return true
    if (vaccine.due_age_months !== null && ageMonths >= vaccine.due_age_months) return true
    return false
  })
}

export default function ImmunisationPage() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [searchTerm, setSearchTerm] = useState('')
  const [allChildren, setAllChildren] = useState<Child[]>([])
  const [filteredChildren, setFilteredChildren] = useState<Child[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [vaccineSchedule, setVaccineSchedule] = useState<VaccineSchedule[]>([])
  const [existingImmunisations, setExistingImmunisations] = useState<Immunisation[]>([])
  const [dueVaccines, setDueVaccines] = useState<VaccineSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const searchRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState<Partial<Immunisation>>({
    child_name: '',
    child_dob: null,
    vaccine_name: '',
    dose_number: 1,
    administration_date: new Date().toISOString().split('T')[0],
    administered_by: '',
    administration_route: 'Intramuscular',
    administration_site: 'Left thigh',
    batch_number: '',
    expiry_date: null,
    manufacturer: '',
    vial_monitor_stage: null,
    cold_chain_broken: false,
    adverse_reaction: false,
    reaction_description: '',
    contraindications: '',
    next_dose_due_date: null,
    is_completed: false,
    was_missed: false,
    missed_reason: '',
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

  // Load children and vaccine schedule
  useEffect(() => {
    async function loadData() {
      const children = await getAllChildren()
      setAllChildren(children)
      setFilteredChildren(children)
      
      const schedule = await getVaccineSchedule()
      setVaccineSchedule(schedule)
    }
    loadData()
  }, [])

  // Filter children
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredChildren(allChildren)
    } else {
      const lowerSearch = searchTerm.toLowerCase()
      const filtered = allChildren.filter(c => {
        if (!c) return false
        const fullName = safeString(c.full_name).toLowerCase()
        const patientId = safeString(c.patient_id).toLowerCase()
        return fullName.includes(lowerSearch) || patientId.includes(lowerSearch)
      })
      setFilteredChildren(filtered)
    }
  }, [searchTerm, allChildren])

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

  // Load existing immunisations and calculate due vaccines
  useEffect(() => {
    if (selectedChild) {
      getChildImmunisations(selectedChild.patient_id).then(immunisations => {
        setExistingImmunisations(immunisations)
        
        const due = getDueVaccines(selectedChild.date_of_birth, vaccineSchedule, immunisations)
        setDueVaccines(due)
        
        setFormData(prev => ({
          ...prev,
          child_name: selectedChild.full_name,
          child_dob: selectedChild.date_of_birth,
        }))
      })
    }
  }, [selectedChild, vaccineSchedule])

  function handleSelectChild(child: Child) {
    setSelectedChild(child)
    setSearchTerm('')
    setShowDropdown(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked })
    } else if (name === 'vial_monitor_stage') {
      setFormData({ ...formData, [name]: value ? parseInt(value) : null })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  function selectVaccine(vaccine: VaccineSchedule) {
    setFormData({
      ...formData,
      vaccine_name: vaccine.vaccine_name,
      dose_number: vaccine.dose_number,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedChild) {
      setMessage('❌ Please select a child first')
      setMessageType('error')
      return
    }
    
    if (!formData.vaccine_name) {
      setMessage('❌ Please select a vaccine')
      setMessageType('error')
      return
    }
    
    setLoading(true)
    setMessage('')
    
    try {
      const immunisationId = `IMM-${selectedChild.patient_id}-${formData.vaccine_name}-${formData.dose_number}-${Date.now()}`
      
      const immunisation: Immunisation = {
        immunisation_id: immunisationId,
        patient_id: selectedChild.patient_id,
        child_name: formData.child_name || selectedChild.full_name,
        child_dob: formData.child_dob || selectedChild.date_of_birth,
        vaccine_name: formData.vaccine_name || '',
        dose_number: formData.dose_number || 1,
        administration_date: formData.administration_date || new Date().toISOString().split('T')[0],
        administered_by: formData.administered_by || '',
        administration_route: formData.administration_route || 'Intramuscular',
        administration_site: formData.administration_site || 'Left thigh',
        batch_number: formData.batch_number || '',
        expiry_date: formData.expiry_date || null,
        manufacturer: formData.manufacturer || '',
        vial_monitor_stage: formData.vial_monitor_stage || null,
        cold_chain_broken: formData.cold_chain_broken || false,
        adverse_reaction: formData.adverse_reaction || false,
        reaction_description: formData.reaction_description || '',
        contraindications: formData.contraindications || '',
        next_dose_due_date: formData.next_dose_due_date || null,
        is_completed: formData.is_completed || false,
        was_missed: formData.was_missed || false,
        missed_reason: formData.missed_reason || '',
        notes: formData.notes || '',
        visit_date: new Date().toISOString(),
        synced_to_cloud: false,
      }
      
      const isOnline = connectionStatus === 'online'
      const result = await saveImmunisation(immunisation, isOnline)
      
      if (result.cloud) {
        setMessageType('success')
        setMessage(`✅ ${formData.vaccine_name} Dose ${formData.dose_number} recorded and saved to CLOUD!`)
      } else if (result.local && isOnline) {
        setMessageType('warning')
        setMessage(`⚠️ Immunisation saved locally only. Cloud save failed.`)
      } else {
        setMessageType('success')
        setMessage(`✅ Immunisation saved locally! Will sync when online.`)
      }
      
      // Reset form
      setFormData({
        child_name: selectedChild.full_name,
        child_dob: selectedChild.date_of_birth,
        vaccine_name: '',
        dose_number: 1,
        administration_date: new Date().toISOString().split('T')[0],
        administered_by: '',
        administration_route: 'Intramuscular',
        administration_site: 'Left thigh',
        batch_number: '',
        expiry_date: null,
        manufacturer: '',
        vial_monitor_stage: null,
        cold_chain_broken: false,
        adverse_reaction: false,
        reaction_description: '',
        contraindications: '',
        next_dose_due_date: null,
        is_completed: false,
        was_missed: false,
        missed_reason: '',
        notes: '',
      })
      
      // Refresh data
      const updated = await getChildImmunisations(selectedChild.patient_id)
      setExistingImmunisations(updated)
      
      const due = getDueVaccines(selectedChild.date_of_birth, vaccineSchedule, updated)
      setDueVaccines(due)
      
    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const childAgeMonths = selectedChild?.date_of_birth ? calculateAgeInMonths(selectedChild.date_of_birth) : 0
  const childAgeWeeks = selectedChild?.date_of_birth ? calculateAgeInWeeks(selectedChild.date_of_birth) : 0

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
            <h1 className="text-3xl font-bold text-green-700">Immunisation (EPI Schedule)</h1>
            <p className="text-gray-600">Record childhood vaccines according to Sierra Leone EPI schedule</p>
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
          
          {/* Child Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Child</h2>
            
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
                  placeholder="Search by child name or patient ID..."
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
                  {filteredChildren.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">
                      No children found. <a href="/register" className="text-green-600 hover:underline">Register a patient</a>
                    </div>
                  ) : (
                    filteredChildren.map((child, index) => (
                      <div
                        key={`${child.patient_id}-${index}`}
                        onClick={() => handleSelectChild(child)}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-800">{safeString(child.full_name)}</div>
                        <div className="text-sm text-gray-500">
                          ID: {safeString(child.patient_id)} | DOB: {formatDate(child.date_of_birth)} | Age: {calculateAgeInMonths(child.date_of_birth)} months
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
                Browse all children ({allChildren.length})
              </button>
            </div>
            
            {selectedChild && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-green-800 text-lg">{safeString(selectedChild.full_name)}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Patient ID:</span> {safeString(selectedChild.patient_id)}<br />
                      <span className="font-medium">Date of Birth:</span> {formatDate(selectedChild.date_of_birth)}<br />
                      <span className="font-medium">Age:</span> {childAgeMonths} months ({childAgeWeeks} weeks)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedChild(null)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Due Vaccines Section */}
          {selectedChild && dueVaccines.length > 0 && (
            <div className="bg-yellow-50 rounded-lg shadow-md p-6 mb-6 border border-yellow-300">
              <h2 className="text-xl font-bold text-yellow-800 mb-3">📋 Due Vaccines</h2>
              <p className="text-sm text-yellow-700 mb-3">The following vaccines are due based on the child's age:</p>
              <div className="flex flex-wrap gap-2">
                {dueVaccines.map((vaccine, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectVaccine(vaccine)}
                    className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                  >
                    {vaccine.vaccine_name} Dose {vaccine.dose_number}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Immunisation Form */}
          {selectedChild && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                2. Record Immunisation for {safeString(selectedChild.full_name)}
              </h2>
              
              {/* Vaccine Selection */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Select Vaccine</label>
                <select
                  name="vaccine_name"
                  value={formData.vaccine_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">-- Select a vaccine --</option>
                  {vaccineSchedule.map((vaccine, idx) => (
                    <option key={idx} value={vaccine.vaccine_name}>
                      {vaccine.vaccine_name} Dose {vaccine.dose_number} - {vaccine.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Dose Number</label>
                  <input type="number" name="dose_number" value={formData.dose_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Administration Date</label>
                  <input type="date" name="administration_date" value={formData.administration_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Administered By</label>
                  <input type="text" name="administered_by" value={formData.administered_by} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Nurse Mariama" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Administration Route</label>
                  <select name="administration_route" value={formData.administration_route} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="Intramuscular">Intramuscular (IM)</option>
                    <option value="Oral">Oral</option>
                    <option value="Subcutaneous">Subcutaneous (SC)</option>
                    <option value="Intradermal">Intradermal (ID)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Administration Site</label>
                  <select name="administration_site" value={formData.administration_site} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="Left thigh">Left thigh</option>
                    <option value="Right thigh">Right thigh</option>
                    <option value="Left arm">Left arm</option>
                    <option value="Right arm">Right arm</option>
                    <option value="Oral">Oral (mouth)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Batch Number</label>
                  <input type="text" name="batch_number" value={formData.batch_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Expiry Date</label>
                  <input type="date" name="expiry_date" value={formData.expiry_date || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">VVM Stage (1-4)</label>
                  <select name="vial_monitor_stage" value={formData.vial_monitor_stage || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-- Select --</option>
                    <option value="1">Stage 1 - Valid</option>
                    <option value="2">Stage 2 - Valid</option>
                    <option value="3">Stage 3 - Do not use</option>
                    <option value="4">Stage 4 - Do not use</option>
                  </select>
                </div>
              </div>
              
              {/* Cold Chain */}
              <div className="mt-4 flex items-center">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="cold_chain_broken" checked={formData.cold_chain_broken} onChange={handleChange} />
                  <span>Cold chain was broken (vaccine may be compromised)</span>
                </label>
              </div>
              
              {/* Adverse Reactions */}
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <h3 className="text-lg font-bold text-red-800 mb-3">⚠️ Adverse Events</h3>
                <div className="flex items-center mb-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="adverse_reaction" checked={formData.adverse_reaction} onChange={handleChange} />
                    <span>Any adverse reaction observed</span>
                  </label>
                </div>
                {formData.adverse_reaction && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Reaction Description</label>
                    <textarea name="reaction_description" value={formData.reaction_description} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder="Describe the adverse reaction..." />
                  </div>
                )}
                <div className="mt-3">
                  <label className="block text-gray-700 font-medium mb-1">Contraindications for Future Doses</label>
                  <textarea name="contraindications" value={formData.contraindications} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder="Any contraindications for future doses..." />
                </div>
              </div>
              
              {/* Next Dose */}
              <div className="mt-4">
                <label className="block text-gray-700 font-medium mb-1">Next Dose Due Date</label>
                <input type="date" name="next_dose_due_date" value={formData.next_dose_due_date || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              
              {/* Notes */}
              <div className="mt-4">
                <label className="block text-gray-700 font-medium mb-1">Clinical Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder="Enter any additional notes..." />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-6 py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Saving...' : 'Save Immunisation Record'}
              </button>
            </form>
          )}
          
          {/* Immunisation History */}
          {selectedChild && existingImmunisations.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Immunisation History - {safeString(selectedChild.full_name)}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Vaccine</th>
                      <th className="p-2 text-left">Dose</th>
                      <th className="p-2 text-left">Admin By</th>
                      <th className="p-2 text-left">Batch</th>
                      <th className="p-2 text-left">Reaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingImmunisations.map((imm, idx) => (
                      <tr key={`imm-${imm.immunisation_id}-${idx}`} className="border-t">
                        <td className="p-2">{formatDate(imm.administration_date)}</td>
                        <td className="p-2 font-medium">{imm.vaccine_name}</td>
                        <td className="p-2">{imm.dose_number}</td>
                        <td className="p-2">{imm.administered_by || '-'}</td>
                        <td className="p-2">{imm.batch_number || '-'}</td>
                        <td className="p-2">{imm.adverse_reaction ? '⚠️ Yes' : '✅ No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Coverage Summary */}
          {selectedChild && vaccineSchedule.length > 0 && (
            <div className="bg-blue-50 rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-bold text-blue-800 mb-3">📊 Immunisation Coverage</h2>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-600 h-4 rounded-full transition-all"
                    style={{ width: `${(existingImmunisations.length / vaccineSchedule.length) * 100}%` }}
                  />
                </div>
                <div className="text-sm font-medium">
                  {existingImmunisations.length} / {vaccineSchedule.length} vaccines received
                  ({Math.round((existingImmunisations.length / vaccineSchedule.length) * 100)}%)
                </div>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                {dueVaccines.length} vaccine(s) currently due. Please schedule an appointment.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}