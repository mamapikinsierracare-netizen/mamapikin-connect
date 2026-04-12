'use client'

import { useState } from 'react'
import { supabase } from '@/lib/auth'
import Navigation from '@/components/Navigation'

interface Patient {
  id: string
  full_name: string
  phone: string
  date_of_birth: string
  is_pregnant: boolean
}

export default function PNCPage() {
  // State for patient search
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)
  
  // State for PNC form
  const [visitType, setVisitType] = useState('PNC1')
  const [motherData, setMotherData] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    temperature: '',
    lochia: '',
    perineal_condition: '',
    breastfeeding_status: '',
  })
  const [babyData, setBabyData] = useState({
    weight_kg: '',
    temperature: '',
    jaundice_present: false,
    feeding_status: '',
    cord_condition: '',
  })
  const [dangerSigns, setDangerSigns] = useState({
    mother: [] as string[],
    baby: [] as string[]
  })
  const [epdsScore, setEpdsScore] = useState<number | null>(null)
  const [nextVisitDate, setNextVisitDate] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [alertLevel, setAlertLevel] = useState('normal')

  // Danger signs lists
  const motherDangerSigns = [
    'Heavy bleeding', 'Foul-smelling discharge', 'Severe headache',
    'Blurred vision', 'Difficulty breathing', 'Chest pain', 'Severe abdominal pain'
  ]
  
  const babyDangerSigns = [
    'Difficulty breathing', 'Poor feeding', 'Lethargic/Unresponsive',
    'Fever (>38°C)', 'Hypothermia (<35.5°C)', 'Convulsions', 'Yellow palms/soles'
  ]

  // Search for patients
  async function searchPatients() {
    if (searchTerm.length < 2) return
    
    setSearching(true)
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone, date_of_birth, is_pregnant')
      .ilike('full_name', `%${searchTerm}%`)
      .limit(10)
    
    if (!error && data) {
      setPatients(data)
    }
    setSearching(false)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value)
    if (e.target.value.length >= 2) {
      searchPatients()
    } else {
      setPatients([])
    }
  }

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setPatients([])
  }

  function handleMotherChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setMotherData(prev => ({ ...prev, [name]: value }))
    
    // Check for high BP alert
    if (name === 'bp_systolic' && parseInt(value) >= 140) {
      setAlertLevel('red')
      setMessageType('error')
      setMessage('🔴 RED ALERT: High blood pressure - Possible pre-eclampsia!')
    } else if (name === 'bp_systolic' && parseInt(value) < 140) {
      setAlertLevel('normal')
      setMessage('')
    }
  }

  function handleBabyChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setBabyData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handleMotherDangerSign(sign: string, checked: boolean) {
    const newSigns = checked
      ? [...dangerSigns.mother, sign]
      : dangerSigns.mother.filter(s => s !== sign)
    
    setDangerSigns(prev => ({ ...prev, mother: newSigns }))
    
    if (newSigns.length > 0) {
      setAlertLevel('red')
      setMessage('🔴 RED ALERT: Mother danger signs detected! Immediate referral required.')
    }
  }

  function handleBabyDangerSign(sign: string, checked: boolean) {
    const newSigns = checked
      ? [...dangerSigns.baby, sign]
      : dangerSigns.baby.filter(s => s !== sign)
    
    setDangerSigns(prev => ({ ...prev, baby: newSigns }))
    
    if (newSigns.length > 0) {
      setAlertLevel('red')
      setMessage('🔴 RED ALERT: Baby danger signs detected! Immediate referral required.')
    }
  }

  // EPDS Questions (simplified 5-question version for faster screening)
  const epdsQuestions = [
    "I have been able to laugh and see the funny side of things",
    "I have looked forward with enjoyment to things",
    "I have blamed myself unnecessarily when things went wrong",
    "I have been anxious or worried for no good reason",
    "The thought of harming myself has occurred to me"
  ]
  
  const [epdsAnswers, setEpdsAnswers] = useState<number[]>([0, 0, 0, 0, 0])

  function handleEpdsAnswer(questionIndex: number, score: number) {
    const newAnswers = [...epdsAnswers]
    newAnswers[questionIndex] = score
    setEpdsAnswers(newAnswers)
    
    const total = newAnswers.reduce((a, b) => a + b, 0)
    setEpdsScore(total)
    
    // Determine risk level
    if (total >= 10) {
      setAlertLevel('orange')
      setMessage('🟠 ORANGE ALERT: Possible depression - Schedule follow-up counselling')
    }
    if (newAnswers[4] > 0) {
      setAlertLevel('red')
      setMessage('🔴 RED ALERT: Self-harm risk detected - Immediate psychiatric referral required!')
    }
  }

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
      const pncData = {
        patient_id: selectedPatient.id,
        visit_type: visitType,
        mother_bp_systolic: parseInt(motherData.bp_systolic) || null,
        mother_bp_diastolic: parseInt(motherData.bp_diastolic) || null,
        mother_temperature: parseFloat(motherData.temperature) || null,
        mother_lochia: motherData.lochia || null,
        mother_perineal_condition: motherData.perineal_condition || null,
        mother_breastfeeding_status: motherData.breastfeeding_status || null,
        mother_danger_signs_present: dangerSigns.mother.length > 0,
        mother_danger_signs_list: dangerSigns.mother.join(', '),
        baby_weight_kg: parseFloat(babyData.weight_kg) || null,
        baby_temperature: parseFloat(babyData.temperature) || null,
        baby_jaundice_present: babyData.jaundice_present,
        baby_feeding_status: babyData.feeding_status || null,
        baby_cord_condition: babyData.cord_condition || null,
        baby_danger_signs_present: dangerSigns.baby.length > 0,
        baby_danger_signs_list: dangerSigns.baby.join(', '),
        epds_score: epdsScore,
        epds_risk_level: getEpdsRiskLevel(epdsScore),
        next_visit_date: nextVisitDate || null,
        referral_made: dangerSigns.mother.length > 0 || dangerSigns.baby.length > 0,
        referral_reason: dangerSigns.mother.length > 0 || dangerSigns.baby.length > 0 ? 'Danger signs present' : null,
        created_by: 'nurse'
      }
      
      const { error } = await supabase
        .from('pnc_visits')
        .insert([pncData])
      
      if (error) throw new Error(error.message)
      
      setMessageType('success')
      setMessage(`✅ PNC ${visitType} recorded successfully!`)
      
      // Reset form
      setMotherData({
        bp_systolic: '', bp_diastolic: '', temperature: '',
        lochia: '', perineal_condition: '', breastfeeding_status: ''
      })
      setBabyData({
        weight_kg: '', temperature: '', jaundice_present: false,
        feeding_status: '', cord_condition: ''
      })
      setDangerSigns({ mother: [], baby: [] })
      setEpdsAnswers([0, 0, 0, 0, 0])
      setEpdsScore(null)
      setNextVisitDate('')
      setAlertLevel('normal')
      
    } catch (err: any) {
      setMessageType('error')
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function getEpdsRiskLevel(score: number | null): string {
    if (score === null) return 'Normal'
    if (score >= 13) return 'Urgent Referral'
    if (score >= 10) return 'Probable Depression'
    if (score >= 7) return 'Possible Depression'
    return 'Normal'
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
            <p className="text-gray-600">Postnatal Care (PNC) - Mother & Baby Assessment</p>
          </div>
          
          {/* Alert Banner */}
          {alertLevel === 'red' && (
            <div className="mb-6 p-4 bg-red-600 text-white rounded-lg text-center font-bold">
              🚨 EMERGENCY ALERT 🚨
              <br />
              {message}
            </div>
          )}
          
          {alertLevel === 'orange' && (
            <div className="mb-6 p-4 bg-orange-500 text-white rounded-lg text-center font-bold">
              ⚠️ WARNING ⚠️
              <br />
              {message}
            </div>
          )}
          
          {/* Message display */}
          {message && alertLevel === 'normal' && (
            <div className={`mb-6 p-4 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}
          
          {/* Patient Search */}
          {!selectedPatient ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Step 1: Find Mother</h2>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by mother's name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                      <p className="text-sm text-gray-500">ID: {patient.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected Patient */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-600">Selected Mother</p>
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
              
              {/* PNC Form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                {/* Visit Type */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    PNC Visit Type
                  </label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="PNC1">PNC1 - Within 48 hours of delivery</option>
                    <option value="PNC2">PNC2 - Day 7 (1 week)</option>
                    <option value="PNC3">PNC3 - Week 6 (42 days)</option>
                  </select>
                </div>
                
                {/* Mother Assessment Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-bold text-green-700 mb-4">👩 Mother Assessment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-1">Blood Pressure</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          name="bp_systolic"
                          value={motherData.bp_systolic}
                          onChange={handleMotherChange}
                          placeholder="Systolic"
                          className="w-1/2 px-3 py-2 border rounded-lg"
                        />
                        <span className="flex items-center">/</span>
                        <input
                          type="number"
                          name="bp_diastolic"
                          value={motherData.bp_diastolic}
                          onChange={handleMotherChange}
                          placeholder="Diastolic"
                          className="w-1/2 px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="temperature"
                        value={motherData.temperature}
                        onChange={handleMotherChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Lochia (Bleeding)</label>
                      <select
                        name="lochia"
                        value={motherData.lochia}
                        onChange={handleMotherChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select...</option>
                        <option value="Normal">Normal (moderate, decreasing)</option>
                        <option value="Heavy">Heavy - RED ALERT</option>
                        <option value="Foul-smelling">Foul-smelling - RED ALERT</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Perineal Condition</label>
                      <select
                        name="perineal_condition"
                        value={motherData.perineal_condition}
                        onChange={handleMotherChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select...</option>
                        <option value="Healing">Healing well</option>
                        <option value="Infection">Signs of infection - Refer</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Breastfeeding Status</label>
                      <select
                        name="breastfeeding_status"
                        value={motherData.breastfeeding_status}
                        onChange={handleMotherChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select...</option>
                        <option value="Exclusive">Exclusive breastfeeding</option>
                        <option value="Partial">Partial breastfeeding</option>
                        <option value="Problems">Breastfeeding problems</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Mother Danger Signs */}
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="font-medium text-red-700 mb-2">Mother Danger Signs:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {motherDangerSigns.map(sign => (
                        <label key={sign} className="flex items-center">
                          <input
                            type="checkbox"
                            onChange={(e) => handleMotherDangerSign(sign, e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">{sign}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Baby Assessment Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-bold text-green-700 mb-4">👶 Baby Assessment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="weight_kg"
                        value={babyData.weight_kg}
                        onChange={handleBabyChange}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., 3.2"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="temperature"
                        value={babyData.temperature}
                        onChange={handleBabyChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="jaundice_present"
                          checked={babyData.jaundice_present}
                          onChange={handleBabyChange}
                          className="mr-2"
                        />
                        <span className="text-gray-700">Jaundice present?</span>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Feeding Status</label>
                      <select
                        name="feeding_status"
                        value={babyData.feeding_status}
                        onChange={handleBabyChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select...</option>
                        <option value="Good">Feeding well</option>
                        <option value="Poor">Poor feeding - Monitor</option>
                        <option value="Not feeding">Not feeding - URGENT</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Cord Condition</label>
                      <select
                        name="cord_condition"
                        value={babyData.cord_condition}
                        onChange={handleBabyChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select...</option>
                        <option value="Dry">Dry, healing well</option>
                        <option value="Infection">Signs of infection - Refer</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Baby Danger Signs */}
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="font-medium text-red-700 mb-2">Baby Danger Signs:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {babyDangerSigns.map(sign => (
                        <label key={sign} className="flex items-center">
                          <input
                            type="checkbox"
                            onChange={(e) => handleBabyDangerSign(sign, e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">{sign}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* EPDS Depression Screening */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-bold text-green-700 mb-4">💚 Postnatal Depression Screening (EPDS)</h3>
                  <p className="text-sm text-gray-600 mb-3">In the past 7 days:</p>
                  
                  {epdsQuestions.map((question, idx) => (
                    <div key={idx} className="mb-3 p-2 bg-gray-50 rounded">
                      <p className="text-sm font-medium mb-2">{question}</p>
                      <div className="flex gap-4">
                        {[0, 1, 2, 3].map(score => (
                          <label key={score} className="flex items-center">
                            <input
                              type="radio"
                              name={`epds_${idx}`}
                              onChange={() => handleEpdsAnswer(idx, score)}
                              className="mr-1"
                            />
                            <span className="text-sm">{score}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {epdsScore !== null && (
                    <div className={`mt-3 p-2 rounded text-center ${
                      epdsScore >= 13 ? 'bg-red-100 text-red-700' :
                      epdsScore >= 10 ? 'bg-orange-100 text-orange-700' :
                      epdsScore >= 7 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      EPDS Score: {epdsScore} - {getEpdsRiskLevel(epdsScore)}
                    </div>
                  )}
                </div>
                
                {/* Next Visit */}
                <div className="border-t pt-4 mt-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Next Visit Date
                  </label>
                  <input
                    type="date"
                    value={nextVisitDate}
                    onChange={(e) => setNextVisitDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-6 py-3 rounded-lg text-white font-medium ${
                    loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? 'Saving...' : 'Record PNC Visit'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}