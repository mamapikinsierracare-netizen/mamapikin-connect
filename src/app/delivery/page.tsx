'use client'

import { useState } from 'react'
import { supabase } from '@/lib/auth'
import Navigation from '@/components/Navigation'

interface Patient {
  id: string
  full_name: string
  phone: string
  is_pregnant: boolean
}

export default function DeliveryPage() {
  // State for patient search
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)
  
  // State for delivery form
  const [deliveryData, setDeliveryData] = useState({
    mode_of_delivery: '',
    delivery_place: 'Facility',
    baby1_gender: '',
    baby1_birth_weight_kg: '',
    baby1_birth_length_cm: '',
    baby1_apgar_1min: '',
    baby1_apgar_5min: '',
    is_multiple_pregnancy: false,
    baby2_gender: '',
    baby2_birth_weight_kg: '',
    baby2_birth_length_cm: '',
    estimated_blood_loss_ml: '',
    amtsl_oxytocin_given: true,
    amtsl_controlled_cord_traction: true,
    amtsl_uterine_massage: true,
  })
  
  const [complications, setComplications] = useState({
    pph: false,
    retained_placenta: false,
    uterine_rupture: false,
    eclampsia: false,
  })
  
  const [pphRiskScore, setPphRiskScore] = useState(0)
  const [pphRiskLevel, setPphRiskLevel] = useState('')
  const [apgarColor, setApgarColor] = useState('')
  
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
      .select('id, full_name, phone, is_pregnant')
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setDeliveryData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Calculate APGAR score and color
  function getApgarColor(score: number): string {
    if (score >= 7) return 'text-green-600'
    if (score >= 4) return 'text-orange-600'
    return 'text-red-600'
  }

  function getApgarInterpretation(score: number): string {
    if (score >= 7) return 'Good - Routine care'
    if (score >= 4) return 'Moderate - Some assistance needed'
    return 'Critical - Resuscitation required!'
  }

  // Calculate PPH Risk Score
  function calculatePPHRisk() {
    let score = 0
    let reasons = []
    
    if (deliveryData.mode_of_delivery === 'C-section') {
      score += 2
      reasons.push('C-section')
    }
    if (deliveryData.baby1_birth_weight_kg && parseFloat(deliveryData.baby1_birth_weight_kg) > 4) {
      score += 2
      reasons.push('Large baby (>4kg)')
    }
    if (deliveryData.is_multiple_pregnancy) {
      score += 2
      reasons.push('Multiple pregnancy')
    }
    if (complications.retained_placenta) {
      score += 3
      reasons.push('History of retained placenta')
    }
    
    setPphRiskScore(score)
    
    let level = ''
    let alert = ''
    if (score >= 5) {
      level = 'High'
      alert = '🔴 HIGH PPH RISK - Cross-match blood, prepare PPH kit, senior staff present'
      setAlertLevel('red')
    } else if (score >= 3) {
      level = 'Moderate'
      alert = '🟠 MODERATE PPH RISK - Prepare oxytocin, senior staff advised'
      setAlertLevel('orange')
    } else {
      level = 'Low'
      alert = '🟢 Low PPH risk - Routine AMTSL'
      setAlertLevel('normal')
    }
    
    setPphRiskLevel(level)
    if (alert) setMessage(alert)
  }

  // Update PPH risk when relevant fields change
  function handleWithRiskUpdate(e: any) {
    handleChange(e)
    setTimeout(calculatePPHRisk, 100)
  }

  function handleComplicationChange(complication: string, checked: boolean) {
    setComplications(prev => ({ ...prev, [complication]: checked }))
    setTimeout(calculatePPHRisk, 100)
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
      // Calculate APGAR interpretation
      const apgar1 = parseInt(deliveryData.baby1_apgar_1min) || 0
      const resuscitationNeeded = apgar1 < 7
      
      const deliveryRecord = {
        patient_id: selectedPatient.id,
        delivery_date: new Date().toISOString().split('T')[0],
        delivery_time: new Date().toLocaleTimeString(),
        mode_of_delivery: deliveryData.mode_of_delivery,
        delivery_place: deliveryData.delivery_place,
        baby1_gender: deliveryData.baby1_gender,
        baby1_birth_weight_kg: parseFloat(deliveryData.baby1_birth_weight_kg) || null,
        baby1_birth_length_cm: parseFloat(deliveryData.baby1_birth_length_cm) || null,
        baby1_apgar_1min: parseInt(deliveryData.baby1_apgar_1min) || null,
        baby1_apgar_5min: parseInt(deliveryData.baby1_apgar_5min) || null,
        baby1_resuscitation_required: resuscitationNeeded,
        is_multiple_pregnancy: deliveryData.is_multiple_pregnancy,
        baby2_gender: deliveryData.is_multiple_pregnancy ? deliveryData.baby2_gender : null,
        baby2_birth_weight_kg: deliveryData.is_multiple_pregnancy ? parseFloat(deliveryData.baby2_birth_weight_kg) || null : null,
        baby2_birth_length_cm: deliveryData.is_multiple_pregnancy ? parseFloat(deliveryData.baby2_birth_length_cm) || null : null,
        estimated_blood_loss_ml: parseInt(deliveryData.estimated_blood_loss_ml) || null,
        pph_occurred: complications.pph,
        retained_placenta: complications.retained_placenta,
        uterine_rupture: complications.uterine_rupture,
        eclampsia_occurred: complications.eclampsia,
        pph_risk_score: pphRiskScore,
        pph_risk_level: pphRiskLevel,
        amtsl_oxytocin_given: deliveryData.amtsl_oxytocin_given,
        amtsl_controlled_cord_traction: deliveryData.amtsl_controlled_cord_traction,
        amtsl_uterine_massage: deliveryData.amtsl_uterine_massage,
        maternal_outcome: complications.pph || complications.retained_placenta ? 'Complicated' : 'Stable',
        baby1_outcome: 'Alive',
        attended_by: 'nurse'
      }
      
      const { error } = await supabase
        .from('deliveries')
        .insert([deliveryRecord])
      
      if (error) throw new Error(error.message)
      
      setMessageType('success')
      setMessage(`✅ Delivery recorded successfully! Baby weight: ${deliveryData.baby1_birth_weight_kg}kg, APGAR: ${deliveryData.baby1_apgar_1min}`)
      
      // Reset form
      setDeliveryData({
        mode_of_delivery: '',
        delivery_place: 'Facility',
        baby1_gender: '',
        baby1_birth_weight_kg: '',
        baby1_birth_length_cm: '',
        baby1_apgar_1min: '',
        baby1_apgar_5min: '',
        is_multiple_pregnancy: false,
        baby2_gender: '',
        baby2_birth_weight_kg: '',
        baby2_birth_length_cm: '',
        estimated_blood_loss_ml: '',
        amtsl_oxytocin_given: true,
        amtsl_controlled_cord_traction: true,
        amtsl_uterine_massage: true,
      })
      setComplications({
        pph: false, retained_placenta: false, uterine_rupture: false, eclampsia: false
      })
      setPphRiskScore(0)
      setPphRiskLevel('')
      setAlertLevel('normal')
      
    } catch (err: any) {
      setMessageType('error')
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
            <p className="text-gray-600">Labour & Delivery - Birth Recording</p>
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
              
              {/* Delivery Form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                {/* Delivery Information */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-bold text-green-700 mb-4">🤱 Delivery Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-1">Mode of Delivery *</label>
                      <select
                        name="mode_of_delivery"
                        value={deliveryData.mode_of_delivery}
                        onChange={handleWithRiskUpdate}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select...</option>
                        <option value="SVD">SVD (Spontaneous Vaginal Delivery)</option>
                        <option value="C-section">C-section</option>
                        <option value="Vacuum">Vacuum Assisted</option>
                        <option value="Forceps">Forceps Assisted</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Delivery Place</label>
                      <select
                        name="delivery_place"
                        value={deliveryData.delivery_place}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="Facility">Health Facility</option>
                        <option value="Home">Home</option>
                        <option value="En Route">En Route to Facility</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Baby Information */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-bold text-green-700 mb-4">👶 Baby Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-1">Baby Gender *</label>
                      <select
                        name="baby1_gender"
                        value={deliveryData.baby1_gender}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Intersex">Intersex</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Birth Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="baby1_birth_weight_kg"
                        value={deliveryData.baby1_birth_weight_kg}
                        onChange={handleWithRiskUpdate}
                        placeholder="e.g., 3.2"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Birth Length (cm)</label>
                      <input
                        type="number"
                        step="0.5"
                        name="baby1_birth_length_cm"
                        value={deliveryData.baby1_birth_length_cm}
                        onChange={handleChange}
                        placeholder="e.g., 50"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">APGAR Score (1 minute)</label>
                      <input
                        type="number"
                        name="baby1_apgar_1min"
                        value={deliveryData.baby1_apgar_1min}
                        onChange={(e) => {
                          handleChange(e)
                          const score = parseInt(e.target.value)
                          if (!isNaN(score)) {
                            setApgarColor(getApgarColor(score))
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      {deliveryData.baby1_apgar_1min && (
                        <p className={`text-sm mt-1 ${getApgarColor(parseInt(deliveryData.baby1_apgar_1min))}`}>
                          {getApgarInterpretation(parseInt(deliveryData.baby1_apgar_1min))}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">APGAR Score (5 minutes)</label>
                      <input
                        type="number"
                        name="baby1_apgar_5min"
                        value={deliveryData.baby1_apgar_5min}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  
                  {/* Multiple Pregnancy */}
                  <div className="mt-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_multiple_pregnancy"
                        checked={deliveryData.is_multiple_pregnancy}
                        onChange={handleWithRiskUpdate}
                        className="mr-2"
                      />
                      <span>Multiple pregnancy (twins/triplets)</span>
                    </label>
                  </div>
                  
                  {deliveryData.is_multiple_pregnancy && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium mb-2">Baby 2 Information:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <select
                          name="baby2_gender"
                          value={deliveryData.baby2_gender}
                          onChange={handleChange}
                          className="px-3 py-2 border rounded-lg"
                        >
                          <option value="">Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          name="baby2_birth_weight_kg"
                          value={deliveryData.baby2_birth_weight_kg}
                          onChange={handleChange}
                          placeholder="Weight (kg)"
                          className="px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* PPH Risk Assessment */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-bold text-green-700 mb-4">🩸 PPH Risk Assessment</h3>
                  
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">Risk Factors:</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={complications.retained_placenta}
                          onChange={(e) => handleComplicationChange('retained_placenta', e.target.checked)}
                          className="mr-2"
                        />
                        Previous retained placenta
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={calculatePPHRisk}
                      className="mt-2 text-sm text-green-600 hover:text-green-700"
                    >
                      Recalculate Risk
                    </button>
                  </div>
                  
                  {pphRiskLevel && (
                    <div className={`p-3 rounded-lg text-center ${
                      pphRiskLevel === 'High' ? 'bg-red-100 text-red-700' :
                      pphRiskLevel === 'Moderate' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      PPH Risk Score: {pphRiskScore} - {pphRiskLevel} Risk
                    </div>
                  )}
                </div>
                
                {/* AMTSL (Active Management) */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-bold text-green-700 mb-4">💊 Active Management of Third Stage (AMTSL)</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="amtsl_oxytocin_given"
                        checked={deliveryData.amtsl_oxytocin_given}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      Oxytocin given (10 IU IM)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="amtsl_controlled_cord_traction"
                        checked={deliveryData.amtsl_controlled_cord_traction}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      Controlled cord traction performed
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="amtsl_uterine_massage"
                        checked={deliveryData.amtsl_uterine_massage}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      Uterine massage after delivery
                    </label>
                  </div>
                </div>
                
                {/* Complications */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-bold text-red-600 mb-4">⚠️ Complications (if any)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={complications.pph}
                        onChange={(e) => handleComplicationChange('pph', e.target.checked)}
                        className="mr-2"
                      />
                      Postpartum Haemorrhage (PPH)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={complications.uterine_rupture}
                        onChange={(e) => handleComplicationChange('uterine_rupture', e.target.checked)}
                        className="mr-2"
                      />
                      Uterine Rupture
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={complications.eclampsia}
                        onChange={(e) => handleComplicationChange('eclampsia', e.target.checked)}
                        className="mr-2"
                      />
                      Eclampsia
                    </label>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-gray-700 mb-1">Estimated Blood Loss (mL)</label>
                    <input
                      type="number"
                      name="estimated_blood_loss_ml"
                      value={deliveryData.estimated_blood_loss_ml}
                      onChange={handleChange}
                      placeholder="e.g., 500"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-lg text-white font-medium ${
                    loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? 'Saving...' : 'Record Delivery'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}