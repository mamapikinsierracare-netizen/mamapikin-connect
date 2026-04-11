'use client'

import Navigation from '@/components/Navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Patient {
  id: string
  full_name: string
  phone: string
  village: string
  is_pregnant: boolean
}

export default function ANCPage() {
  // State for patient search
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)
  
  // State for ANC form
  const [formData, setFormData] = useState({
    visit_number: 1,
    gestational_age_weeks: '',
    weight_kg: '',
    bp_systolic: '',
    bp_diastolic: '',
    fundal_height_cm: '',
    fetal_heart_rate: '',
    danger_signs: [] as string[],
    next_visit_date: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [alertLevel, setAlertLevel] = useState('normal')

  // Search for patients
  async function searchPatients() {
    if (searchTerm.length < 2) return
    
    setSearching(true)
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone, village, is_pregnant')
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

  // Select a patient
  function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setPatients([])
    
    // Load previous visits to determine next visit number
    loadPreviousVisits(patient.id)
  }

  // Load previous visits
  async function loadPreviousVisits(patientId: string) {
    const { data, error } = await supabase
      .from('anc_visits')
      .select('visit_number')
      .eq('patient_id', patientId)
      .order('visit_number', { ascending: false })
      .limit(1)
    
    if (!error && data && data.length > 0) {
      setFormData(prev => ({
        ...prev,
        visit_number: data[0].visit_number + 1
      }))
    }
  }

  // Handle form input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Check for danger signs based on vitals
    checkDangerSigns(name, value)
  }

  // Handle danger signs checkbox
  function handleDangerSignChange(sign: string, checked: boolean) {
    const newDangerSigns = checked
      ? [...formData.danger_signs, sign]
      : formData.danger_signs.filter(s => s !== sign)
    
    setFormData(prev => ({ ...prev, danger_signs: newDangerSigns }))
    
    if (newDangerSigns.length > 0) {
      setAlertLevel('red')
      setMessageType('error')
      setMessage('⚠️ DANGER SIGNS DETECTED! Immediate referral required.')
    } else if (alertLevel === 'red') {
      setAlertLevel('normal')
      setMessage('')
    }
  }

  // Check vitals for danger signs
  function checkDangerSigns(fieldName: string, value: string) {
    const numValue = parseFloat(value)
    
    if (fieldName === 'bp_systolic' && numValue >= 140) {
      setAlertLevel('red')
      setMessageType('error')
      setMessage('🔴 RED ALERT: High blood pressure - Possible pre-eclampsia!')
    } else if (fieldName === 'bp_systolic' && numValue < 90 && numValue > 0) {
      setAlertLevel('orange')
      setMessageType('warning')
      setMessage('🟠 ORANGE ALERT: Low blood pressure - Monitor closely')
    } else if (fieldName === 'gestational_age_weeks' && numValue >= 42) {
      setAlertLevel('red')
      setMessageType('error')
      setMessage('🔴 RED ALERT: Post-term pregnancy - Consider induction')
    }
  }

  // Submit the ANC visit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedPatient) {
      setMessageType('error')
      setMessage('Please select a patient first')
      return
    }
    
    setLoading(true)
    setMessage('')
    
    try {
      const visitData = {
        patient_id: selectedPatient.id,
        visit_number: formData.visit_number,
        gestational_age_weeks: parseInt(formData.gestational_age_weeks) || null,
        weight_kg: parseFloat(formData.weight_kg) || null,
        bp_systolic: parseInt(formData.bp_systolic) || null,
        bp_diastolic: parseInt(formData.bp_diastolic) || null,
        fundal_height_cm: parseFloat(formData.fundal_height_cm) || null,
        fetal_heart_rate: parseInt(formData.fetal_heart_rate) || null,
        danger_signs_present: formData.danger_signs.length > 0,
        danger_signs_list: formData.danger_signs.join(', '),
        alert_level: alertLevel,
        next_visit_date: formData.next_visit_date || null,
        visit_date: new Date().toISOString().split('T')[0],
      }
      
      const { error } = await supabase
        .from('anc_visits')
        .insert([visitData])
      
      if (error) throw new Error(error.message)
      
      setMessageType('success')
      setMessage('✅ ANC visit recorded successfully!')
      
      // Reset form (keep patient selected)
      setFormData({
        visit_number: formData.visit_number + 1,
        gestational_age_weeks: '',
        weight_kg: '',
        bp_systolic: '',
        bp_diastolic: '',
        fundal_height_cm: '',
        fetal_heart_rate: '',
        danger_signs: [],
        next_visit_date: '',
      })
      setAlertLevel('normal')
      
    } catch (err: any) {
      setMessageType('error')
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Danger signs checklist items
  const dangerSignsList = [
    'Severe headache',
    'Blurred vision',
    'Swelling of hands/face',
    'Fever (>38.5°C)',
    'Severe abdominal pain',
    'Reduced fetal movement',
    'Vaginal bleeding',
    'Convulsions',
    'Difficulty breathing'
  ]

  return (
  <>
    <Navigation />
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
          <p className="text-gray-600">Antenatal Care (ANC) - Record Visit</p>
        </div>
        
        {/* Alert Banner */}
        {alertLevel === 'red' && (
          <div className="mb-6 p-4 bg-red-600 text-white rounded-lg text-center font-bold">
            🚨 EMERGENCY ALERT 🚨
            <br />
            {message || 'DANGER SIGNS PRESENT - Immediate referral required!'}
          </div>
        )}
        
        {/* Message display */}
        {message && alertLevel !== 'red' && (
          <div className={`mb-6 p-4 rounded-lg ${
            messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 'bg-red-100 text-red-700 border border-red-400'
          }`}>
            {message}
          </div>
        )}
        
        {/* Patient Search */}
        {!selectedPatient ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Step 1: Find Patient</h2>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by patient name..."
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
                    <p className="text-sm text-gray-500">ID: {patient.id} | Phone: {patient.phone || 'N/A'} | Village: {patient.village || 'N/A'}</p>
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
                  <p className="text-sm text-green-600">Selected Patient</p>
                  <p className="font-bold text-lg">{selectedPatient.full_name}</p>
                  <p className="text-sm">ID: {selectedPatient.id}</p>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  Change Patient
                </button>
              </div>
            </div>
            
            {/* ANC Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Step 2: Record ANC Visit</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visit Number */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Visit Number
                  </label>
                  <input
                    type="number"
                    name="visit_number"
                    value={formData.visit_number}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                
                {/* Gestational Age */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Gestational Age (weeks)
                  </label>
                  <input
                    type="number"
                    name="gestational_age_weeks"
                    value={formData.gestational_age_weeks}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                    placeholder="e.g., 24"
                  />
                </div>
                
                {/* Weight */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="weight_kg"
                    value={formData.weight_kg}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                    placeholder="e.g., 65.5"
                  />
                </div>
                
                {/* Blood Pressure */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Blood Pressure
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="bp_systolic"
                      value={formData.bp_systolic}
                      onChange={handleChange}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                      placeholder="Systolic"
                    />
                    <span className="flex items-center">/</span>
                    <input
                      type="number"
                      name="bp_diastolic"
                      value={formData.bp_diastolic}
                      onChange={handleChange}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                      placeholder="Diastolic"
                    />
                  </div>
                </div>
                
                {/* Fundal Height */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Fundal Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="fundal_height_cm"
                    value={formData.fundal_height_cm}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                    placeholder="e.g., 28"
                  />
                </div>
                
                {/* Fetal Heart Rate */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Fetal Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    name="fetal_heart_rate"
                    value={formData.fetal_heart_rate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                    placeholder="e.g., 140"
                  />
                </div>
              </div>
              
              {/* Danger Signs Checklist */}
              <div className="mb-6 mt-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Danger Signs (Check if present)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
                  {dangerSignsList.map(sign => (
                    <label key={sign} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.danger_signs.includes(sign)}
                        onChange={(e) => handleDangerSignChange(sign, e.target.checked)}
                        className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                      />
                      <span className="ml-2 text-gray-700">{sign}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Next Visit Date */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Next Visit Date
                </label>
                <input
                  type="date"
                  name="next_visit_date"
                  value={formData.next_visit_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-medium ${
                  loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                } transition-colors`}
              >
                {loading ? 'Saving...' : 'Record ANC Visit'}
              </button>
            </form>
          </>
        )}
      </div>
         </div>
    </>
  )
}