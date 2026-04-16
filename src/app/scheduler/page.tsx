// src/app/scheduler/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

type Patient = {
  patient_id: string
  full_name: string
  phone: string | null
  district: string | null
  is_pregnant: boolean
  is_breastfeeding: boolean
  is_child_under_5: boolean
}

type Appointment = {
  id?: number
  appointment_id: string
  patient_id: string
  patient_name: string
  visit_type: string
  appointment_date: string
  appointment_time: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes: string
}

const getSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

const getSupabaseAnonKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

async function fetchFromSupabase<T>(endpoint: string): Promise<T[]> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    if (response.ok) return await response.json()
    return []
  } catch { return [] }
}

async function postToSupabase(endpoint: string, data: unknown): Promise<boolean> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return response.ok
  } catch { return false }
}

async function patchToSupabase(endpoint: string, filter: string, data: unknown): Promise<boolean> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}?${filter}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return response.ok
  } catch { return false }
}

async function searchPatients(term: string): Promise<Patient[]> {
  if (term.length < 2) return []
  const results: Patient[] = []
  const seenIds = new Set<string>()
  
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
    const localList = JSON.parse(localPatients)
    const filtered = localList.filter((p: Patient) => 
      p.full_name?.toLowerCase().includes(term.toLowerCase()) ||
      p.patient_id?.toLowerCase().includes(term.toLowerCase())
    )
    filtered.forEach((p: Patient) => {
      if (!seenIds.has(p.patient_id)) {
        seenIds.add(p.patient_id)
        results.push(p)
      }
    })
  }
  
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?full_name=ilike.%${term}%&select=patient_id,full_name,phone,district,is_pregnant,is_breastfeeding,is_child_under_5&limit=20`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudPatients = await response.json()
        cloudPatients.forEach((p: Patient) => {
          if (!seenIds.has(p.patient_id)) {
            seenIds.add(p.patient_id)
            results.push(p)
          }
        })
      }
    } catch { /* ignore */ }
  }
  return results
}

async function getAppointments(): Promise<Appointment[]> {
  const appointments = await fetchFromSupabase<Appointment>('appointments?order=appointment_date.asc')
  return appointments
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function getStatusBadge(status: string) {
  switch(status) {
    case 'scheduled': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Scheduled</span>
    case 'confirmed': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Confirmed</span>
    case 'completed': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>
    case 'cancelled': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Cancelled</span>
    case 'no_show': return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">No Show</span>
    default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>
  }
}

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'list'>('schedule')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const searchRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    visit_type: 'ANC',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '09:00',
    notes: '',
  })

  useEffect(() => {
    loadAppointments()
  }, [])

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
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        const results = await searchPatients(searchTerm)
        setSearchResults(results)
        setShowDropdown(true)
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  async function loadAppointments() {
    const apps = await getAppointments()
    setAppointments(apps)
  }

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setShowDropdown(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) {
      setMessage('❌ Please select a patient')
      setMessageType('error')
      return
    }
    
    setLoading(true)
    setMessage('')
    
    try {
      const appointmentId = `APP-${selectedPatient.patient_id}-${Date.now()}`
      
      let patientType = ''
      if (selectedPatient.is_pregnant) patientType = 'Pregnant'
      else if (selectedPatient.is_breastfeeding) patientType = 'Breastfeeding'
      else if (selectedPatient.is_child_under_5) patientType = 'Child'
      else patientType = 'General'
      
      const visitTypeDisplay = `${formData.visit_type} - ${patientType}`
      
      const appointment: Appointment = {
        appointment_id: appointmentId,
        patient_id: selectedPatient.patient_id,
        patient_name: selectedPatient.full_name,
        visit_type: visitTypeDisplay,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        status: 'scheduled',
        notes: formData.notes,
      }
      
      const saved = await postToSupabase('appointments', appointment)
      
      if (saved) {
        setMessageType('success')
        setMessage(`✅ Appointment scheduled for ${selectedPatient.full_name} on ${formatDate(formData.appointment_date)} at ${formData.appointment_time}`)
        
        await loadAppointments()
        
        setSelectedPatient(null)
        setFormData({
          visit_type: 'ANC',
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: '09:00',
          notes: '',
        })
      } else {
        setMessageType('error')
        setMessage('❌ Failed to save appointment')
      }
    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function updateAppointmentStatus(appointmentId: string, newStatus: Appointment['status']) {
    const success = await patchToSupabase('appointments', `appointment_id=eq.${appointmentId}`, { status: newStatus })
    if (success) {
      await loadAppointments()
      setMessage(`✅ Appointment status updated to ${newStatus}`)
      setMessageType('success')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Appointment Scheduler</h1>
            <p className="text-gray-600">Schedule and manage patient appointments</p>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'schedule' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            >
              📅 Schedule Appointment
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'list' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            >
              📋 Appointments List ({appointments.length})
            </button>
          </div>
          
          {/* Schedule Appointment Tab */}
          {activeTab === 'schedule' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Schedule New Appointment</h2>
              
              {/* Patient Selection */}
              <div className="mb-6">
                <label className="block font-medium mb-2">Select Patient</label>
                <div ref={searchRef} className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or patient ID..."
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {searchResults.map(p => (
                        <div key={p.patient_id} onClick={() => handleSelectPatient(p)} className="p-3 hover:bg-green-50 cursor-pointer border-b">
                          <div className="font-medium">{p.full_name}</div>
                          <div className="text-sm text-gray-500">ID: {p.patient_id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPatient && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg flex justify-between">
                    <span>✅ Selected: {selectedPatient.full_name}</span>
                    <button onClick={() => setSelectedPatient(null)} className="text-red-600 text-sm">Change</button>
                  </div>
                )}
              </div>
              
              {/* Appointment Form */}
              {selectedPatient && (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block font-medium mb-1">Visit Type</label>
                      <select name="visit_type" value={formData.visit_type} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                        <option value="ANC">ANC - Antenatal Care</option>
                        <option value="PNC">PNC - Postnatal Care</option>
                        <option value="Immunisation">Immunisation</option>
                        <option value="General">General Consultation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Appointment Date</label>
                      <input type="date" name="appointment_date" value={formData.appointment_date} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Appointment Time</label>
                      <input type="time" name="appointment_time" value={formData.appointment_time} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Notes</label>
                      <input type="text" name="notes" value={formData.notes} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Bring lab results" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                    {loading ? 'Scheduling...' : 'Schedule Appointment'}
                  </button>
                </form>
              )}
            </div>
          )}
          
          {/* Appointments List Tab */}
          {activeTab === 'list' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {appointments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No appointments scheduled.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Date & Time</th>
                        <th className="px-4 py-3 text-left">Patient</th>
                        <th className="px-4 py-3 text-left">Visit Type</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {appointments.map((apt) => (
                        <tr key={apt.appointment_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {formatDate(apt.appointment_date)} at {apt.appointment_time}
                           </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <Link href={`/patient/${apt.patient_id}`} className="text-green-600 hover:underline">
                              {apt.patient_name}
                            </Link>
                           </td>
                          <td className="px-4 py-3 text-sm">{apt.visit_type}</td>
                          <td className="px-4 py-3 text-sm">{getStatusBadge(apt.status)}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-1 flex-wrap">
                              {apt.status === 'scheduled' && (
                                <button onClick={() => updateAppointmentStatus(apt.appointment_id, 'confirmed')} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Confirm</button>
                              )}
                              {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                                <button onClick={() => updateAppointmentStatus(apt.appointment_id, 'completed')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Complete</button>
                              )}
                              {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                                <button onClick={() => updateAppointmentStatus(apt.appointment_id, 'cancelled')} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Cancel</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}