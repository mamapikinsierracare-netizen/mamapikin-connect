'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/auth'
import Navigation from '@/components/Navigation'

interface Patient {
  id: string
  full_name: string
  phone: string
  date_of_birth: string
  blood_group: string
  allergies: string
}

interface ANCVisit {
  id: string
  visit_number: number
  gestational_age_weeks: number
  weight_kg: number
  bp_systolic: number
  bp_diastolic: number
  visit_date: string
  next_visit_date: string
}

interface Prescription {
  id: string
  medicines: { generic_name: string }
  dosage: string
  frequency: string
  duration_days: number
  status: string
  created_at: string
}

interface LabResult {
  id: string
  lab_tests: { test_name: string; unit: string }
  result_value: string
  result_flag: string
  result_entered_at: string
}

export default function PatientPortalPage() {
  const [patientId, setPatientId] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [ancVisits, setAncVisits] = useState<ANCVisit[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [labResults, setLabResults] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  async function searchPatient() {
    if (!patientId.trim()) {
      setError('Please enter your Patient ID')
      return
    }

    setLoading(true)
    setError('')
    
    // Search for patient by ID
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()
    
    if (patientError || !patientData) {
      setError('Patient not found. Please check your Patient ID.')
      setLoading(false)
      return
    }
    
    setPatient(patientData)
    
    // Load ANC visits
    const { data: ancData } = await supabase
      .from('anc_visits')
      .select('*')
      .eq('patient_id', patientData.id)
      .order('visit_date', { ascending: false })
    
    if (ancData) setAncVisits(ancData)
    
    // Load prescriptions
    const { data: rxData } = await supabase
      .from('prescriptions')
      .select(`
        *,
        medicines (generic_name)
      `)
      .eq('patient_id', patientData.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (rxData) setPrescriptions(rxData)
    
    // Load lab results
    const { data: labData } = await supabase
      .from('lab_requests')
      .select(`
        *,
        lab_tests (test_name, unit)
      `)
      .eq('patient_id', patientData.id)
      .eq('status', 'Completed')
      .order('result_entered_at', { ascending: false })
      .limit(10)
    
    if (labData) setLabResults(labData)
    
    setLoading(false)
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      searchPatient()
    }
  }

  // Get result flag color
  function getFlagColor(flag: string): string {
    switch (flag) {
      case 'Critical Low': return 'text-red-600 font-bold'
      case 'Critical High': return 'text-red-600 font-bold'
      case 'Low': return 'text-orange-600'
      case 'High': return 'text-orange-600'
      case 'Abnormal': return 'text-red-600'
      default: return 'text-green-600'
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
            <p className="text-gray-600">Patient Portal - Your Health Records</p>
          </div>
          
          {/* Patient ID Entry */}
          {!patient ? (
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">📋</div>
                <h2 className="text-xl font-bold">Access Your Records</h2>
                <p className="text-gray-500 text-sm mt-2">
                  Enter your Patient ID from your registration card
                </p>
              </div>
              
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., MCH-KAB-2026-0042"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 text-center"
              />
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  ❌ {error}
                </div>
              )}
              
              <button
                onClick={searchPatient}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
              >
                {loading ? 'Searching...' : 'View My Records'}
              </button>
              
              <p className="text-xs text-gray-400 text-center mt-4">
                Protected Health Information - Secure Access Only
              </p>
            </div>
          ) : (
            <>
              {/* Patient Info Header */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-start flex-wrap">
                  <div>
                    <p className="text-sm text-green-600">Welcome,</p>
                    <p className="text-2xl font-bold text-green-800">{patient.full_name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Patient ID: {patient.id} | Blood Group: {patient.blood_group || 'Not recorded'}
                    </p>
                    {patient.allergies && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠️ Allergies: {patient.allergies}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setPatient(null)}
                    className="text-green-600 hover:text-green-800 text-sm"
                  >
                    ← Change Patient
                  </button>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex border-b mb-6">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'overview'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📊 Overview
                </button>
                <button
                  onClick={() => setActiveTab('anc')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'anc'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🤰 ANC Visits
                </button>
                <button
                  onClick={() => setActiveTab('medications')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'medications'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  💊 Medications
                </button>
                <button
                  onClick={() => setActiveTab('lab')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'lab'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🔬 Lab Results
                </button>
                <button
                  onClick={() => setActiveTab('education')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'education'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📚 Education
                </button>
              </div>
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold mb-3">Quick Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <div className="text-2xl font-bold text-blue-600">{ancVisits.length}</div>
                        <div className="text-sm text-gray-600">ANC Visits</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <div className="text-2xl font-bold text-green-600">{prescriptions.length}</div>
                        <div className="text-sm text-gray-600">Prescriptions</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded">
                        <div className="text-2xl font-bold text-purple-600">{labResults.length}</div>
                        <div className="text-sm text-gray-600">Lab Results</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded">
                        <div className="text-2xl font-bold text-yellow-600">
                          {ancVisits.filter(v => v.next_visit_date).length}
                        </div>
                        <div className="text-sm text-gray-600">Upcoming Visits</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Next Appointment */}
                  {ancVisits.filter(v => v.next_visit_date).length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="font-bold text-yellow-800">📅 Next Appointment</p>
                      <p className="text-sm">
                        {new Date(ancVisits.find(v => v.next_visit_date)?.next_visit_date || '').toLocaleDateString()}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Please bring your patient card
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* ANC Visits Tab */}
              {activeTab === 'anc' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold mb-4">Antenatal Care Visits</h3>
                  {ancVisits.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No ANC visits recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {ancVisits.map(visit => (
                        <div key={visit.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">Visit #{visit.visit_number}</p>
                              <p className="text-sm text-gray-500">{new Date(visit.visit_date).toLocaleDateString()}</p>
                            </div>
                            {visit.next_visit_date && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Next: {new Date(visit.next_visit_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                            <div>
                              <span className="text-gray-500">Weight:</span> {visit.weight_kg} kg
                            </div>
                            <div>
                              <span className="text-gray-500">BP:</span> {visit.bp_systolic}/{visit.bp_diastolic}
                            </div>
                            <div>
                              <span className="text-gray-500">Gestation:</span> {visit.gestational_age_weeks} weeks
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Medications Tab */}
              {activeTab === 'medications' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold mb-4">Prescription History</h3>
                  {prescriptions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No prescriptions recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {prescriptions.map(rx => (
                        <div key={rx.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{rx.medicines?.generic_name || 'Medicine'}</p>
                              <p className="text-sm text-gray-500">{rx.dosage} - {rx.frequency}</p>
                              <p className="text-xs text-gray-400 mt-1">Duration: {rx.duration_days} days</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              rx.status === 'Dispensed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {rx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Lab Results Tab */}
              {activeTab === 'lab' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold mb-4">Laboratory Results</h3>
                  {labResults.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No lab results available yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {labResults.map(result => (
                        <div key={result.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{result.lab_tests?.test_name}</p>
                              <p className="text-sm">
                                Result: <span className={getFlagColor(result.result_flag)}>
                                  {result.result_value} {result.lab_tests?.unit}
                                </span>
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(result.result_entered_at).toLocaleDateString()}
                              </p>
                            </div>
                            {result.result_flag !== 'Normal' && result.result_flag !== 'Normal' && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                {result.result_flag}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Education Tab */}
              {activeTab === 'education' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold mb-4">Health Education</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl mb-2">🤰</div>
                      <h4 className="font-bold">Danger Signs in Pregnancy</h4>
                      <p className="text-sm text-gray-600 mt-1">Severe headache, blurred vision, swelling, bleeding, reduced fetal movement.</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl mb-2">🍼</div>
                      <h4 className="font-bold">Breastfeeding Tips</h4>
                      <p className="text-sm text-gray-600 mt-1">Feed on demand, ensure good latch, breastfeed exclusively for 6 months.</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="text-3xl mb-2">💉</div>
                      <h4 className="font-bold">Immunisation Schedule</h4>
                      <p className="text-sm text-gray-600 mt-1">BCG at birth, Penta at 6,10,14 weeks, Measles at 9 months.</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl mb-2">🥗</div>
                      <h4 className="font-bold">Nutrition During Pregnancy</h4>
                      <p className="text-sm text-gray-600 mt-1">Eat iron-rich foods, take folic acid, stay hydrated.</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}