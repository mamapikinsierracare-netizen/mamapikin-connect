// src/app/immunization/page.tsx
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
  id?: string | number
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
  return new Date(dateString).toLocaleDateString('en-GB')
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

// Get all children (patients)
async function getAllChildren(): Promise<Child[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const results: Child[] = []
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
            date_of_birth: p.date_of_birth || null
          })
        }
      })
    } catch(e) { console.error(e) }
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
      headers: {
        'apikey': supabaseAnonKey || '',
        'Authorization': `Bearer ${supabaseAnonKey || ''}`
      } as HeadersInit
    })
    if (response.ok) {
      return await response.json()
    }
  } catch { /* ignore */ }
  
  // Fallback schedule
  return [
    { id: 1, vaccine_name: 'BCG', dose_number: 1, due_age_weeks: null, due_age_months: 0, description: 'At birth - tuberculosis', is_active: true },
    { id: 2, vaccine_name: 'OPV', dose_number: 0, due_age_weeks: null, due_age_months: 0, description: 'At birth - oral polio', is_active: true },
    { id: 3, vaccine_name: 'HepB', dose_number: 0, due_age_weeks: null, due_age_months: 0, description: 'At birth - hepatitis B', is_active: true },
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
  ]
}

// Get existing immunisations
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

// Get due vaccines
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

// 💉 CLINICAL GUARDRAILS (AEFI & Logistics)
function checkAlerts(form: Partial<Immunisation>, existingHistory: Immunisation[]): { alerts: string[], isCritical: boolean } {
  const alerts: string[] = []
  let isCritical = false

  if (form.cold_chain_broken) {
    alerts.push(`🚨 COLD CHAIN BROKEN: Vaccine efficacy compromised. Do not administer without supervisor approval!`)
    isCritical = true
  }

  if (form.vial_monitor_stage && form.vial_monitor_stage >= 3) {
    alerts.push(`🚨 VVM STAGE ${form.vial_monitor_stage}: Vaccine has exceeded heat exposure limits. DO NOT USE.`)
    isCritical = true
  }

  if (form.adverse_reaction) {
    alerts.push(`⚠️ AEFI LOGGED: Monitor child for 30 mins and document reaction thoroughly.`)
  }

  const pastReactions = existingHistory.filter(record => record.adverse_reaction)
  if (pastReactions.length > 0) {
    alerts.push(`⚠️ AEFI HISTORY: Child had adverse reactions to previous vaccines (${pastReactions.map(r => r.vaccine_name).join(', ')}). Proceed with caution.`)
  }

  return { alerts, isCritical }
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
  const [triageStatus, setTriageStatus] = useState<{alerts: string[], isCritical: boolean}>({alerts: [], isCritical: false})
  
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
    vial_monitor_stage: 1,
    cold_chain_broken: false,
    adverse_reaction: false,
    reaction_description: '',
    contraindications: '',
    next_dose_due_date: null,
    is_completed: true,
    was_missed: false,
    missed_reason: '',
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
    async function loadData() {
      const children = await getAllChildren()
      setAllChildren(children)
      setFilteredChildren(children)
      const schedule = await getVaccineSchedule()
      setVaccineSchedule(schedule)
    }
    loadData()
  }, [])

  // SILENT POSTMAN (EPI EDITION)
  useEffect(() => {
    async function triggerSync() {
      if (!navigator.onLine) return;
      try {
        const { getPendingSyncQueue, markAsSynced } = await import('@/lib/db');
        const queue = await getPendingSyncQueue();
        if (queue.length === 0) return;

        for (const item of queue) {
          if (item.table === 'immunisations' && item.operation === 'INSERT') {
            const { pending_sync, synced, last_modified, id, ...cleanData } = item.data;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            
            const response = await fetch(`${supabaseUrl}/rest/v1/immunisations`, {
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
              console.log(`✅ Postman Delivered: EPI Record to cloud.`);
            }
          }
        }
      } catch (error) { console.error("❌ EPI Postman error:", error); }
    }
    triggerSync();
    window.addEventListener('online', triggerSync);
    return () => window.removeEventListener('online', triggerSync);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredChildren(allChildren)
    } else {
      const lowerSearch = searchTerm.toLowerCase()
      setFilteredChildren(allChildren.filter(c => {
        if (!c) return false
        const fullName = safeString(c.full_name).toLowerCase()
        const patientId = safeString(c.patient_id).toLowerCase()
        return fullName.includes(lowerSearch) || patientId.includes(lowerSearch)
      }))
    }
  }, [searchTerm, allChildren])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  useEffect(() => {
    setTriageStatus(checkAlerts(formData, existingImmunisations))
  }, [formData, existingImmunisations])

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
    } else if (name === 'vial_monitor_stage' || name === 'dose_number') {
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
      
      const immunisationData = {
        id: immunisationId, // For Dexie Outbox
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
      }
      
      // Save directly to Dexie.js Offline Outbox
      await saveOffline('immunisations', immunisationData);
      
      setMessageType('success')
      setMessage(`✅ ${formData.vaccine_name} Dose ${formData.dose_number} recorded safely in Offline Outbox!`)
      
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
        vial_monitor_stage: 1,
        cold_chain_broken: false,
        adverse_reaction: false,
        reaction_description: '',
        contraindications: '',
        next_dose_due_date: null,
        is_completed: true,
        was_missed: false,
        missed_reason: '',
        notes: '',
      })
      
      const updated = await getChildImmunisations(selectedChild.patient_id)
      setExistingImmunisations(updated)
      const due = getDueVaccines(selectedChild.date_of_birth, vaccineSchedule, updated)
      setDueVaccines(due)

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

  const childAgeMonths = selectedChild?.date_of_birth ? calculateAgeInMonths(selectedChild.date_of_birth) : 0
  const childAgeWeeks = selectedChild?.date_of_birth ? calculateAgeInWeeks(selectedChild.date_of_birth) : 0

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
              {connectionStatus === 'online' ? '✅ ONLINE MODE' : 
               connectionStatus === 'offline' ? '📡 OFFLINE MODE - Data will sync automatically' :
               '⏳ CHECKING CONNECTION...'}
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-indigo-700">Immunisation (EPI) Dashboard</h1>
            <p className="text-gray-600">Administer vaccines, manage logistics, and monitor coverage</p>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 
              'bg-red-100 text-red-700 border border-red-400'
            }`}>
              {message}
            </div>
          )}
          
          {/* Child Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Patient (Child)</h2>
            <div ref={searchRef} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by child name or patient ID..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {filteredChildren.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">No children found.</div>
                  ) : (
                    filteredChildren.map((child, index) => (
                      <div
                        key={`${child.patient_id}-${index}`}
                        onClick={() => handleSelectChild(child)}
                        className="p-3 hover:bg-indigo-50 cursor-pointer border-b transition-colors"
                      >
                        <div className="font-medium text-gray-800">{safeString(child.full_name)}</div>
                        <div className="text-sm text-gray-500">ID: {safeString(child.patient_id)} | Age: {calculateAgeInMonths(child.date_of_birth)} months</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {selectedChild && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-indigo-800 text-lg">{safeString(selectedChild.full_name)}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">ID:</span> {safeString(selectedChild.patient_id)} | 
                    <span className="font-medium ml-2">DOB:</span> {formatDate(selectedChild.date_of_birth)} | 
                    <span className="font-medium ml-2">Age:</span> {childAgeMonths} months ({childAgeWeeks} weeks)
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedChild(null)} className="px-4 py-2 bg-red-100 text-red-700 rounded font-medium">Change</button>
              </div>
            )}
          </div>
          
          {selectedChild && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: FULL EPI Form Restored */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                    2. Record Immunisation
                  </h2>
                  
                  {/* Vaccine Selection */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="text-lg font-bold text-blue-800 mb-3">💉 Vaccine Selection</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 font-medium mb-1">Select Vaccine</label>
                        <select name="vaccine_name" value={formData.vaccine_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:border-indigo-500" required>
                          <option value="">-- Select a vaccine --</option>
                          {vaccineSchedule.map((vaccine, idx) => (
                            <option key={idx} value={vaccine.vaccine_name}>{vaccine.vaccine_name} Dose {vaccine.dose_number} - {vaccine.description}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Dose Number</label>
                        <input type="number" name="dose_number" value={formData.dose_number || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Administration Date</label>
                        <input type="date" name="administration_date" value={formData.administration_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
                      </div>
                    </div>
                  </div>

                  {/* Logistics & Administration */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">📦 Logistics & Administration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Admin Route</label>
                        <select name="administration_route" value={formData.administration_route} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Intramuscular">IM</option>
                          <option value="Oral">Oral</option>
                          <option value="Subcutaneous">SC</option>
                          <option value="Intradermal">ID</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Admin Site</label>
                        <select name="administration_site" value={formData.administration_site} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="Left thigh">Left thigh</option>
                          <option value="Right thigh">Right thigh</option>
                          <option value="Left arm">Left arm</option>
                          <option value="Right arm">Right arm</option>
                          <option value="Oral">Oral (mouth)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Administered By</label>
                        <input type="text" name="administered_by" value={formData.administered_by} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Batch Number</label>
                        <input type="text" name="batch_number" value={formData.batch_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg uppercase" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Manufacturer</label>
                        <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Expiry Date</label>
                        <input type="date" name="expiry_date" value={formData.expiry_date || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">VVM Stage (1-4)</label>
                        <select name="vial_monitor_stage" value={formData.vial_monitor_stage || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg ${(formData.vial_monitor_stage && formData.vial_monitor_stage >= 3) ? 'bg-red-50 text-red-700 border-red-500 font-bold' : ''}`}>
                          <option value="">-- Select --</option>
                          <option value="1">Stage 1 - Valid</option>
                          <option value="2">Stage 2 - Valid</option>
                          <option value="3">Stage 3 - DO NOT USE</option>
                          <option value="4">Stage 4 - DO NOT USE</option>
                        </select>
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="flex items-center gap-2 mt-4">
                          <input type="checkbox" name="cold_chain_broken" checked={formData.cold_chain_broken} onChange={handleChange} className="w-5 h-5 text-red-600" />
                          <span className="font-bold text-gray-800">Cold Chain Broken</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status & Reactions */}
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <h3 className="text-lg font-bold text-orange-800 mb-2">⚠️ Reactions & Limits</h3>
                      <label className="flex items-center gap-2 mb-2">
                        <input type="checkbox" name="adverse_reaction" checked={formData.adverse_reaction} onChange={handleChange} />
                        <span className="font-medium text-gray-800">Adverse Reaction Logged</span>
                      </label>
                      {formData.adverse_reaction && (
                        <textarea name="reaction_description" value={formData.reaction_description} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg mb-2" placeholder="Describe AEFI..." />
                      )}
                      <label className="block text-gray-700 font-medium mb-1 text-sm">Contraindications</label>
                      <input type="text" name="contraindications" value={formData.contraindications} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Any future limits..." />
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="text-lg font-bold text-yellow-800 mb-2">⏸️ Missed Doses</h3>
                      <label className="flex items-center gap-2 mb-2">
                        <input type="checkbox" name="was_missed" checked={formData.was_missed} onChange={handleChange} />
                        <span className="font-medium text-gray-800">Vaccine Was Missed</span>
                      </label>
                      {formData.was_missed && (
                        <textarea name="missed_reason" value={formData.missed_reason} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-yellow-400 rounded-lg mb-2" placeholder="Reason (e.g. out of stock, sick)..." />
                      )}
                      <label className="block text-gray-700 font-medium mb-1 text-sm">Next Due Date (If rescheduled)</label>
                      <input type="date" name="next_dose_due_date" value={formData.next_dose_due_date || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>

                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-1">General Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-lg text-white font-black text-lg shadow-lg uppercase tracking-wide transition-colors ${loading ? 'bg-gray-400' : triageStatus.isCritical ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {loading ? 'Saving...' : triageStatus.isCritical ? '🚨 VACCINE BLOCKED (CHECK ALERTS)' : '✅ Save Immunisation'}
                  </button>
                </form>
              </div>

              {/* Right Side: Clinical Dashboard */}
              <div className="space-y-6">
                
                {/* Real-time Triage Box */}
                <div className={`rounded-lg shadow-md p-6 border-t-8 ${triageStatus.isCritical ? 'bg-red-50 border-red-600' : triageStatus.alerts.length > 0 ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'}`}>
                  <h2 className={`text-xl font-black mb-4 flex items-center gap-2 ${triageStatus.isCritical ? 'text-red-700' : triageStatus.alerts.length > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                    {triageStatus.isCritical ? '🚨 CLINICAL BLOCK' : triageStatus.alerts.length > 0 ? '⚠️ WARNINGS' : '🟢 ON TRACK'}
                  </h2>
                  
                  <div className="space-y-4">
                    {triageStatus.alerts.length > 0 ? (
                      <ul className="space-y-2">
                        {triageStatus.alerts.map((alert, i) => (
                          <li key={i} className={`p-3 rounded font-bold text-sm ${alert.includes('🚨') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-orange-100 text-orange-800 border border-orange-300'}`}>{alert}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-green-700 font-medium">Logistics are valid and no adverse reactions present.</p>
                    )}
                  </div>
                </div>

                {/* Due Vaccines Action Box */}
                {dueVaccines.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg shadow-md p-6 border border-yellow-300">
                    <h2 className="text-lg font-bold text-yellow-800 mb-3">📋 Vaccines Due Now</h2>
                    <div className="flex flex-wrap gap-2">
                      {dueVaccines.map((vaccine, idx) => (
                        <button key={idx} type="button" onClick={() => selectVaccine(vaccine)} className="px-3 py-1.5 bg-yellow-600 text-white rounded font-bold hover:bg-yellow-700 text-sm shadow-sm transition-colors">
                          {vaccine.vaccine_name} {vaccine.dose_number}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coverage Summary */}
                {vaccineSchedule.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">📊 Immunisation Coverage</h2>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-green-600 h-4 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(((existingImmunisations.filter(v => v.is_completed && !v.was_missed).length) / vaccineSchedule.length) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-sm font-bold text-gray-700">
                        {Math.round(((existingImmunisations.filter(v => v.is_completed && !v.was_missed).length) / vaccineSchedule.length) * 100)}%
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Completed {existingImmunisations.filter(v => v.is_completed && !v.was_missed).length} of {vaccineSchedule.length} scheduled doses</p>
                  </div>
                )}

                {/* Vaccination History */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">History</h2>
                  {existingImmunisations.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No vaccines recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {existingImmunisations.map((record) => (
                        <div key={record.immunisation_id} className={`p-3 border rounded text-sm relative overflow-hidden ${record.was_missed ? 'bg-yellow-50 border-yellow-200' : 'border-gray-200'}`}>
                          {record.adverse_reaction && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                          <div className="flex justify-between font-bold mb-1">
                            <span className="text-indigo-700">{record.vaccine_name} {record.dose_number}</span>
                            <span className={record.was_missed ? 'text-yellow-700' : 'text-gray-600'}>{record.was_missed ? 'MISSED' : formatDate(record.visit_date)}</span>
                          </div>
                          {!record.was_missed && <div className="text-xs text-gray-500">Batch: {record.batch_number || 'N/A'} | Route: {record.administration_route}</div>}
                          {record.adverse_reaction && <div className="mt-1 text-xs font-bold text-red-600">AEFI Logged</div>}
                          {record.was_missed && <div className="mt-1 text-xs italic text-yellow-700">{record.missed_reason}</div>}
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