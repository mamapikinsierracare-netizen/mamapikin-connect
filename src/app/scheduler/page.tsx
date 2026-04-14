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
  edd: string | null
  date_of_birth: string | null
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

async function isSupabaseReachable(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return false
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?limit=1`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    return response.ok
  } catch { return false }
}

async function searchPatients(searchTerm: string): Promise<Patient[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const results: Patient[] = []
  const seenIds = new Set<string>()
  
  if (!searchTerm || searchTerm.length < 2) return results
  
  // Search in localStorage
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
    try {
      const localList = JSON.parse(localPatients)
      const filtered = localList.filter((p: Patient) => 
        p.full_name && p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.patient_id && p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      filtered.forEach((p: Patient) => {
        if (!seenIds.has(p.patient_id)) {
          seenIds.add(p.patient_id)
          results.push({
            patient_id: p.patient_id,
            full_name: p.full_name || 'Unknown',
            phone: p.phone || null,
            district: p.district || null,
            is_pregnant: p.is_pregnant || false,
            is_breastfeeding: p.is_breastfeeding || false,
            is_child_under_5: p.is_child_under_5 || false,
            edd: p.edd || null,
            date_of_birth: p.date_of_birth || null
          })
        }
      })
    } catch (e) { console.error('Error parsing local patients:', e) }
  }
  
  // Search in Supabase
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const nameResponse = await fetch(`${supabaseUrl}/rest/v1/patients?full_name=ilike.%${searchTerm}%&select=patient_id,full_name,phone,district,is_pregnant,is_breastfeeding,is_child_under_5,edd,date_of_birth&limit=50`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (nameResponse.ok) {
        const cloudPatients = await nameResponse.json()
        cloudPatients.forEach((p: any) => {
          if (!seenIds.has(p.patient_id)) {
            seenIds.add(p.patient_id)
            results.push({
              patient_id: p.patient_id,
              full_name: p.full_name || 'Unknown',
              phone: p.phone || null,
              district: p.district || null,
              is_pregnant: p.is_pregnant || false,
              is_breastfeeding: p.is_breastfeeding || false,
              is_child_under_5: p.is_child_under_5 || false,
              edd: p.edd || null,
              date_of_birth: p.date_of_birth || null
            })
          }
        })
      }
      
      const idResponse = await fetch(`${supabaseUrl}/rest/v1/patients?patient_id=ilike.%${searchTerm}%&select=patient_id,full_name,phone,district,is_pregnant,is_breastfeeding,is_child_under_5,edd,date_of_birth&limit=50`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (idResponse.ok) {
        const cloudPatientsById = await idResponse.json()
        cloudPatientsById.forEach((p: any) => {
          if (!seenIds.has(p.patient_id)) {
            seenIds.add(p.patient_id)
            results.push({
              patient_id: p.patient_id,
              full_name: p.full_name || 'Unknown',
              phone: p.phone || null,
              district: p.district || null,
              is_pregnant: p.is_pregnant || false,
              is_breastfeeding: p.is_breastfeeding || false,
              is_child_under_5: p.is_child_under_5 || false,
              edd: p.edd || null,
              date_of_birth: p.date_of_birth || null
            })
          }
        })
      }
    } catch (e) { 
      console.error('Error searching Supabase:', e)
    }
  }
  
  return results
}

async function saveAppointment(appointment: Appointment): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const existing = localStorage.getItem('appointments')
  const appointments = existing ? JSON.parse(existing) : []
  appointments.push(appointment)
  localStorage.setItem('appointments', JSON.stringify(appointments))
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const { id, ...dataToSend } = appointment
      const response = await fetch(`${supabaseUrl}/rest/v1/appointments`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })
      return response.ok
    } catch { 
      return false 
    }
  }
  return true
}

async function getAppointments(): Promise<Appointment[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localAppointments = localStorage.getItem('appointments')
  const localList: Appointment[] = localAppointments ? JSON.parse(localAppointments) : []
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/appointments?order=appointment_date.asc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudList = await response.json()
        const allIds = new Set(localList.map(a => a.appointment_id))
        cloudList.forEach((a: Appointment) => {
          if (!allIds.has(a.appointment_id)) {
            localList.push(a)
          }
        })
      }
    } catch { /* ignore */ }
  }
  
  return localList.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
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
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [activeTab, setActiveTab] = useState<'schedule' | 'list'>('schedule')
  const searchRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    visit_type: 'ANC',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '09:00',
    notes: '',
  })

  useEffect(() => {
    async function checkConnection() {
      const online = await isSupabaseReachable()
      setConnectionStatus(online ? 'online' : 'offline')
    }
    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadAppointments() {
      const allAppointments = await getAppointments()
      setAppointments(allAppointments)
    }
    loadAppointments()
  }, [])

  useEffect(() => {
    async function doSearch() {
      if (searchTerm.length >= 2) {
        const results = await searchPatients(searchTerm)
        setSearchResults(results)
        setShowDropdown(true)
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }
    const timer = setTimeout(doSearch, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      setMessage('❌ Please select a patient first')
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
      
      const saved = await saveAppointment(appointment)
      
      if (saved) {
        setMessageType('success')
        setMessage(`✅ Appointment scheduled for ${selectedPatient.full_name} on ${formatDate(formData.appointment_date)} at ${formData.appointment_time}`)
        
        const updated = await getAppointments()
        setAppointments(updated)
        
        setSelectedPatient(null)
        setFormData({
          visit_type: 'ANC',
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: '09:00',
          notes: '',
        })
      } else {
        setMessageType('error')
        setMessage('❌ Failed to save appointment. Please try again.')
      }
      
    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function updateAppointmentStatus(appointmentId: string, newStatus: Appointment['status']) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const existing = localStorage.getItem('appointments')
    if (existing) {
      const appointmentsList = JSON.parse(existing)
      const updated = appointmentsList.map((a: Appointment) =>
        a.appointment_id === appointmentId ? { ...a, status: newStatus } : a
      )
      localStorage.setItem('appointments', JSON.stringify(updated))
    }
    
    if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/appointments?appointment_id=eq.${appointmentId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        })
      } catch { /* ignore */ }
    }
    
    const updated = await getAppointments()
    setAppointments(updated)
    
    setMessageType('success')
    setMessage(`Appointment status updated to ${newStatus}`)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          
          <div className={`mb-4 p-3 rounded-lg text-center ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800 border border-green-500' : 
            connectionStatus === 'offline' ? 'bg-red-100 text-red-800 border border-red-500' :
            'bg-gray-100 text-gray-800'
          }`}>
            {connectionStatus === 'online' ? '✅ ONLINE MODE' : 
             connectionStatus === 'offline' ? '📡 OFFLINE MODE' : 
             '⏳ Checking connection...'}
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Appointment Scheduler</h1>
            <p className="text-gray-600">Schedule and manage patient appointments</p>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'schedule' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              📅 Schedule Appointment
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'list' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              📋 Appointments List ({appointments.length})
            </button>
          </div>
          
          {activeTab === 'schedule' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Schedule New Appointment</h2>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Select Patient</label>
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
                      placeholder="Search by name or patient ID (min. 2 characters)..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
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
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.length === 0 && searchTerm.length >= 2 ? (
                        <div className="p-3 text-gray-500 text-center">No patients found. Try a different search term.</div>
                      ) : (
                        searchResults.map((patient) => (
                          <div
                            key={patient.patient_id}
                            onClick={() => handleSelectPatient(patient)}
                            className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-800">{patient.full_name}</div>
                            <div className="text-sm text-gray-500">
                              ID: {patient.patient_id} | 📞 {patient.phone || 'No phone'} | 📍 {patient.district || 'No district'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {selectedPatient && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-green-800">{selectedPatient.full_name}</div>
                        <div className="text-sm text-gray-600">
                          ID: {selectedPatient.patient_id} | 📞 {selectedPatient.phone || 'N/A'}
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
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Visit Type</label>
                    <select
                      name="visit_type"
                      value={formData.visit_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="ANC">ANC - Antenatal Care</option>
                      <option value="PNC">PNC - Postnatal Care</option>
                      <option value="Immunisation">Immunisation</option>
                      <option value="General">General Consultation</option>
                      <option value="Follow-up">Follow-up Visit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Appointment Date</label>
                    <input
                      type="date"
                      name="appointment_date"
                      value={formData.appointment_date}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Appointment Time</label>
                    <input
                      type="time"
                      name="appointment_time"
                      value={formData.appointment_time}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Notes (Optional)</label>
                    <input
                      type="text"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="e.g., Bring lab results"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !selectedPatient}
                  className={`w-full py-3 rounded-lg text-white font-medium ${
                    loading || !selectedPatient ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? 'Scheduling...' : 'Schedule Appointment'}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'list' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {appointments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No appointments scheduled yet.</p>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="text-green-600 underline mt-2"
                  >
                    Schedule your first appointment →
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visit Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                                <button
                                  onClick={() => updateAppointmentStatus(apt.appointment_id, 'confirmed')}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                >
                                  Confirm
                                </button>
                              )}
                              {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                                <button
                                  onClick={() => updateAppointmentStatus(apt.appointment_id, 'completed')}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                >
                                  Complete
                                </button>
                              )}
                              {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                                <button
                                  onClick={() => updateAppointmentStatus(apt.appointment_id, 'cancelled')}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                >
                                  Cancel
                                </button>
                              )}
                              {apt.status === 'scheduled' && (
                                <button
                                  onClick={() => updateAppointmentStatus(apt.appointment_id, 'no_show')}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                >
                                  No Show
                                </button>
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