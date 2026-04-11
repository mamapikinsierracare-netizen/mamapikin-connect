'use client'

import Navigation from '@/components/Navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Patient {
  id: string
  full_name: string
  phone: string
  date_of_birth: string
  village: string
}

// Sierra Leone EPI Vaccine Schedule
const VACCINE_SCHEDULE = [
  { name: 'BCG', dose: 1, due_age_weeks: 0, due_age_label: 'At Birth' },
  { name: 'OPV0', dose: 1, due_age_weeks: 0, due_age_label: 'At Birth' },
  { name: 'HepB0', dose: 1, due_age_weeks: 0, due_age_label: 'At Birth' },
  { name: 'Penta', dose: 1, due_age_weeks: 6, due_age_label: '6 weeks' },
  { name: 'PCV', dose: 1, due_age_weeks: 6, due_age_label: '6 weeks' },
  { name: 'Rota', dose: 1, due_age_weeks: 6, due_age_label: '6 weeks' },
  { name: 'OPV', dose: 1, due_age_weeks: 6, due_age_label: '6 weeks' },
  { name: 'Penta', dose: 2, due_age_weeks: 10, due_age_label: '10 weeks' },
  { name: 'PCV', dose: 2, due_age_weeks: 10, due_age_label: '10 weeks' },
  { name: 'Rota', dose: 2, due_age_weeks: 10, due_age_label: '10 weeks' },
  { name: 'OPV', dose: 2, due_age_weeks: 10, due_age_label: '10 weeks' },
  { name: 'Penta', dose: 3, due_age_weeks: 14, due_age_label: '14 weeks' },
  { name: 'PCV', dose: 3, due_age_weeks: 14, due_age_label: '14 weeks' },
  { name: 'Rota', dose: 3, due_age_weeks: 14, due_age_label: '14 weeks' },
  { name: 'OPV', dose: 3, due_age_weeks: 14, due_age_label: '14 weeks' },
  { name: 'Measles', dose: 1, due_age_weeks: 36, due_age_label: '9 months' },
  { name: 'Yellow Fever', dose: 1, due_age_weeks: 36, due_age_label: '9 months' },
  { name: 'Measles', dose: 2, due_age_weeks: 72, due_age_label: '18 months' },
  { name: 'DPT Booster', dose: 4, due_age_weeks: 72, due_age_label: '18 months' },
]

export default function ImmunisationPage() {
  // State for patient search
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)
  
  // State for immunisation form
  const [selectedVaccine, setSelectedVaccine] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [administrationSite, setAdministrationSite] = useState('Left arm')
  const [adverseEvents, setAdverseEvents] = useState(false)
  const [adverseDescription, setAdverseDescription] = useState('')
  
  // State for existing immunisations
  const [existingImmunisations, setExistingImmunisations] = useState<any[]>([])
  const [dueVaccines, setDueVaccines] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  // Calculate age in weeks from date of birth
  function calculateAgeWeeks(dob: string): number {
    const birthDate = new Date(dob)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - birthDate.getTime())
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
    return diffWeeks
  }

  // Calculate which vaccines are due
  function calculateDueVaccines(ageWeeks: number, givenVaccines: string[]) {
    const due = VACCINE_SCHEDULE.filter(vaccine => {
      const vaccineKey = `${vaccine.name}-${vaccine.dose}`
      const isNotGiven = !givenVaccines.includes(vaccineKey)
      const isDue = ageWeeks >= vaccine.due_age_weeks
      const isNotTooOld = ageWeeks <= vaccine.due_age_weeks + 52 // 1 year grace period
      return isNotGiven && isDue && isNotTooOld
    })
    return due
  }

  // Search for patients
  async function searchPatients() {
    if (searchTerm.length < 2) return
    
    setSearching(true)
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone, date_of_birth, village')
      .ilike('full_name', `%${searchTerm}%`)
      .limit(10)
    
    if (error) {
      console.error('Search error:', error)
    } else {
      setPatients(data || [])
    }
    setSearching(false)
  }

  // Handle search input change
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value)
    if (e.target.value.length >= 2) {
      searchPatients()
    } else {
      setPatients([])
    }
  }

  // Select a patient and load their immunisation history
  async function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setPatients([])
    
    // Load existing immunisations
    const { data, error } = await supabase
      .from('immunisations')
      .select('*')
      .eq('patient_id', patient.id)
    
    if (!error && data) {
      setExistingImmunisations(data)
      
      // Create list of given vaccines
      const givenVaccines = data.map(v => `${v.vaccine_name}-${v.dose_number}`)
      
      // Calculate age
      const ageWeeks = patient.date_of_birth ? calculateAgeWeeks(patient.date_of_birth) : 0
      
      // Calculate due vaccines
      const due = calculateDueVaccines(ageWeeks, givenVaccines)
      setDueVaccines(due)
    }
  }

  // Submit immunisation record
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedPatient) {
      setMessageType('error')
      setMessage('Please select a patient first')
      return
    }
    
    if (!selectedVaccine) {
      setMessageType('error')
      setMessage('Please select a vaccine')
      return
    }
    
    setLoading(true)
    setMessage('')
    
    try {
      // Parse vaccine name and dose
      const [vaccineName, doseStr] = selectedVaccine.split('-')
      const doseNumber = parseInt(doseStr)
      
      const immunisationData = {
        patient_id: selectedPatient.id,
        vaccine_name: vaccineName,
        dose_number: doseNumber,
        administered_date: new Date().toISOString().split('T')[0],
        batch_number: batchNumber || null,
        administration_site: administrationSite,
        route: vaccineName === 'Rota' ? 'Oral' : 'IM',
        adverse_events: adverseEvents,
        adverse_events_description: adverseDescription || null,
        administered_by: 'nurse', // Will be dynamic with login
      }
      
      const { error } = await supabase
        .from('immunisations')
        .insert([immunisationData])
      
      if (error) throw new Error(error.message)
      
      setMessageType('success')
      setMessage(`✅ ${vaccineName} dose ${doseNumber} recorded successfully!`)
      
      // Reset form
      setSelectedVaccine('')
      setBatchNumber('')
      setAdministrationSite('Left arm')
      setAdverseEvents(false)
      setAdverseDescription('')
      
      // Reload immunisations
      const { data: newData } = await supabase
        .from('immunisations')
        .select('*')
        .eq('patient_id', selectedPatient.id)
      
      if (newData) {
        setExistingImmunisations(newData)
        const givenVaccines = newData.map(v => `${v.vaccine_name}-${v.dose_number}`)
        const ageWeeks = selectedPatient.date_of_birth ? calculateAgeWeeks(selectedPatient.date_of_birth) : 0
        const due = calculateDueVaccines(ageWeeks, givenVaccines)
        setDueVaccines(due)
      }
      
    } catch (err: any) {
      setMessageType('error')
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Get unique vaccine options for dropdown
  const vaccineOptions = VACCINE_SCHEDULE.map(v => ({
    value: `${v.name}-${v.dose}`,
    label: `${v.name} (Dose ${v.dose}) - Due at: ${v.due_age_label}`
  }))

  return (
  <>
    <Navigation />
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
          <p className="text-gray-600">Immunisation Tracking - Sierra Leone EPI Schedule</p>
        </div>
        
        {/* Message display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 'bg-red-100 text-red-700 border border-red-400'
          }`}>
            {message}
          </div>
        )}
        
        {/* Patient Search */}
        {!selectedPatient ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Step 1: Find Child Patient</h2>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by child's name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
            {searching && <p className="text-gray-500 mt-2">Searching...</p>}
            
            {patients.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden">
                {patients.map(patient => (
                  <div
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                    className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                  >
                    <p className="font-medium">{patient.full_name}</p>
                    <p className="text-sm text-gray-500">
                      ID: {patient.id} | DOB: {patient.date_of_birth || 'Unknown'} | Phone: {patient.phone || 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Selected Patient Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-green-600">Selected Child</p>
                  <p className="font-bold text-lg">{selectedPatient.full_name}</p>
                  <p className="text-sm">ID: {selectedPatient.id}</p>
                  <p className="text-sm">DOB: {selectedPatient.date_of_birth || 'Not recorded'}</p>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  Change Patient
                </button>
              </div>
            </div>
            
            {/* Due Vaccines Section */}
            {dueVaccines.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-yellow-800 mb-2">📋 Vaccines Due Now:</h3>
                <div className="flex flex-wrap gap-2">
                  {dueVaccines.map(v => (
                    <span key={`${v.name}-${v.dose}`} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                      {v.name} (Dose {v.dose})
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Immunisation History */}
            {existingImmunisations.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-3">📜 Immunisation History</h3>
                <div className="space-y-2">
                  {existingImmunisations.map(v => (
                    <div key={v.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{v.vaccine_name} (Dose {v.dose_number})</span>
                      <span className="text-sm text-gray-500">{v.administered_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Immunisation Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Step 2: Record Vaccine</h2>
              
              {/* Vaccine Selection */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Select Vaccine <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedVaccine}
                  onChange={(e) => setSelectedVaccine(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="">Select a vaccine...</option>
                  {vaccineOptions.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Batch Number */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Batch / Lot Number
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  placeholder="e.g., ABC123"
                />
              </div>
              
              {/* Administration Site */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Administration Site
                </label>
                <select
                  value={administrationSite}
                  onChange={(e) => setAdministrationSite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="Left arm">Left arm</option>
                  <option value="Right arm">Right arm</option>
                  <option value="Left thigh">Left thigh</option>
                  <option value="Right thigh">Right thigh</option>
                </select>
              </div>
              
              {/* Adverse Events */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={adverseEvents}
                    onChange={(e) => setAdverseEvents(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="ml-2 text-gray-700">Any adverse events after vaccination?</span>
                </label>
              </div>
              
              {adverseEvents && (
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Describe Adverse Event
                  </label>
                  <textarea
                    value={adverseDescription}
                    onChange={(e) => setAdverseDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                    rows={3}
                    placeholder="e.g., Fever, swelling at site, rash..."
                  />
                </div>
              )}
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-medium ${
                  loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                } transition-colors`}
              >
                {loading ? 'Recording...' : 'Record Vaccination'}
              </button>
            </form>
          </>
        )}
      </div>
          </div>
    </>
  )
}