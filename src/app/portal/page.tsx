// src/app/portal/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

type Patient = {
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
  edd: string | null
  registered_at: string
  account_opening_date: string | null
  account_closing_date: string | null
  account_status: string
}

type AncVisit = {
  id: number
  visit_number: number
  visit_date: string
  gestational_age: number | null
  weight: number | null
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  is_high_risk: boolean
}

type PncVisit = {
  id: number
  visit_type: string
  visit_date: string
  mother_weight: number | null
  baby_weight: number | null
}

type Delivery = {
  id: number
  delivery_date: string
  mode_of_delivery: string
  baby_name: string | null
  birth_weight: number | null
}

type Immunisation = {
  id: number
  vaccine_name: string
  dose_number: number
  administration_date: string
}

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchPatient(patientId: string): Promise<Patient | null> {
  try {
    const response = await fetch(`${getSupabaseUrl()}/rest/v1/patients?patient_id=eq.${patientId}`, {
      headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
    })
    if (response.ok) {
      const data = await response.json()
      if (data && data.length > 0) return data[0]
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
  
  // Try localStorage as fallback
  const offlinePatients = localStorage.getItem('offline_patients')
  if (offlinePatients) {
    const patients: Patient[] = JSON.parse(offlinePatients)
    const found = patients.find(p => p.patient_id === patientId)
    if (found) return found
  }
  return null
}

async function fetchAncVisits(patientId: string): Promise<AncVisit[]> {
  try {
    const response = await fetch(`${getSupabaseUrl()}/rest/v1/anc_visits?patient_id=eq.${patientId}&order=visit_number.asc`, {
      headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
    })
    if (response.ok) return await response.json()
  } catch { /* ignore */ }
  return []
}

async function fetchPncVisits(patientId: string): Promise<PncVisit[]> {
  try {
    const response = await fetch(`${getSupabaseUrl()}/rest/v1/pnc_visits?patient_id=eq.${patientId}&order=visit_date.desc`, {
      headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
    })
    if (response.ok) return await response.json()
  } catch { /* ignore */ }
  return []
}

async function fetchDeliveries(patientId: string): Promise<Delivery[]> {
  try {
    const response = await fetch(`${getSupabaseUrl()}/rest/v1/deliveries?patient_id=eq.${patientId}&order=delivery_date.desc`, {
      headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
    })
    if (response.ok) return await response.json()
  } catch { /* ignore */ }
  return []
}

async function fetchImmunisations(patientId: string): Promise<Immunisation[]> {
  try {
    const response = await fetch(`${getSupabaseUrl()}/rest/v1/immunisations?patient_id=eq.${patientId}&order=administration_date.desc`, {
      headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
    })
    if (response.ok) return await response.json()
  } catch { /* ignore */ }
  return []
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

function getDaysRemaining(closingDate: string | null): number | null {
  if (!closingDate) return null
  const today = new Date()
  const closing = new Date(closingDate)
  const diffTime = closing.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export default function PortalPage() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [ancVisits, setAncVisits] = useState<AncVisit[]>([])
  const [pncVisits, setPncVisits] = useState<PncVisit[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [immunisations, setImmunisations] = useState<Immunisation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [patientIdInput, setPatientIdInput] = useState('')
  const [searchedId, setSearchedId] = useState('')
  const [emergencyToken, setEmergencyToken] = useState('')
  const [tokenMessage, setTokenMessage] = useState('')

  useEffect(() => {
    if (!searchedId) return

    async function loadData() {
      setLoading(true)
      setError('')
      
      const patientData = await fetchPatient(searchedId)
      
      if (patientData) {
        setPatient(patientData)
        
        const [anc, pnc, deliveriesData, immunisationsData] = await Promise.all([
          fetchAncVisits(searchedId),
          fetchPncVisits(searchedId),
          fetchDeliveries(searchedId),
          fetchImmunisations(searchedId)
        ])
        
        setAncVisits(anc)
        setPncVisits(pnc)
        setDeliveries(deliveriesData)
        setImmunisations(immunisationsData)
      } else {
        setError('Patient not found. Please check the Patient ID.')
        setPatient(null)
      }
      setLoading(false)
    }
    
    loadData()
  }, [searchedId])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (patientIdInput.trim()) {
      setSearchedId(patientIdInput.trim())
    }
  }

  function generateEmergencyToken() {
    const token = Math.floor(10000000 + Math.random() * 90000000).toString()
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 24)
    setEmergencyToken(token)
    setTokenMessage(`✅ Token: ${token}\nValid until: ${expiry.toLocaleString()}`)
    
    const tokenData = {
      token,
      patient_id: patient?.patient_id,
      expiry: expiry.toISOString(),
      created_at: new Date().toISOString()
    }
    const existing = localStorage.getItem('emergency_tokens')
    const tokens = existing ? JSON.parse(existing) : []
    tokens.push(tokenData)
    localStorage.setItem('emergency_tokens', JSON.stringify(tokens))
    
    setTimeout(() => {
      setEmergencyToken('')
      setTokenMessage('')
    }, 60000)
  }

  function copyToken() {
    navigator.clipboard.writeText(emergencyToken)
    setTokenMessage(`✅ Token ${emergencyToken} copied!`)
    setTimeout(() => setTokenMessage(''), 3000)
  }

  const daysRemaining = patient?.account_closing_date ? getDaysRemaining(patient.account_closing_date) : null
  const isExpired = daysRemaining !== null && daysRemaining < 0

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Patient Portal</h1>
            <p className="text-gray-600">View your medical records using your Patient ID</p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={patientIdInput}
                onChange={(e) => setPatientIdInput(e.target.value)}
                placeholder="Enter Patient ID (e.g., MCH-KAB-2026-XXXX)"
                className="flex-1 px-3 py-2 border rounded-lg"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Search
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">Your Patient ID is on your MamaPikin Connect card</p>
          </div>

          {loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-gray-500">Loading patient data...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          {patient && !loading && (
            <>
              {/* Patient Info Card */}
              <div className={`bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 ${isExpired ? 'border-red-500' : 'border-green-500'}`}>
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{patient.full_name}</h2>
                    <p className="text-gray-500 font-mono text-sm">ID: {patient.patient_id}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        {patient.is_pregnant ? '🤰 Pregnant' : patient.is_breastfeeding ? '🤱 Breastfeeding' : patient.is_child_under_5 ? '👶 Child' : 'Patient'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {isExpired ? 'Account Expired' : daysRemaining ? `${daysRemaining} days left` : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Registered: {formatDate(patient.registered_at)}</p>
                    <p className="text-sm text-gray-500">Account closes: {formatDate(patient.account_closing_date)}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Token Section */}
              <div className="bg-yellow-50 rounded-lg shadow-md p-6 mb-6 border border-yellow-300">
                <h3 className="text-lg font-bold text-yellow-800 mb-2">🚨 Emergency Access Token</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Generate a token to share your records with another facility in case of emergency. Valid for 24 hours.
                </p>
                {tokenMessage && (
                  <div className="mb-3 p-3 bg-green-100 text-green-800 rounded-lg whitespace-pre-line">
                    {tokenMessage}
                  </div>
                )}
                {emergencyToken ? (
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-white border rounded-lg font-mono text-center text-2xl tracking-wider">
                      {emergencyToken}
                    </div>
                    <button onClick={copyToken} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Copy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generateEmergencyToken}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Generate Emergency Token
                  </button>
                )}
              </div>

              {/* Personal Info */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Full Name:</span> {patient.full_name}</div>
                  <div><span className="text-gray-500">Date of Birth:</span> {formatDate(patient.date_of_birth)}</div>
                  <div><span className="text-gray-500">Phone:</span> {patient.phone || 'N/A'}</div>
                  <div><span className="text-gray-500">Village:</span> {patient.village || 'N/A'}</div>
                  <div><span className="text-gray-500">District:</span> {patient.district || 'N/A'}</div>
                  <div><span className="text-gray-500">Blood Group:</span> {patient.blood_group || 'N/A'}</div>
                  <div><span className="text-gray-500">Allergies:</span> {patient.allergies || 'None'}</div>
                  <div><span className="text-gray-500">Guardian:</span> {patient.guardian_name || 'N/A'}</div>
                  {patient.is_pregnant && <div><span className="text-gray-500">EDD:</span> {formatDate(patient.edd)}</div>}
                </div>
              </div>

              {/* ANC Visits */}
              {ancVisits.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-bold text-pink-700 mb-3">🤰 ANC Visits ({ancVisits.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-pink-50">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Weeks</th>
                          <th className="p-2">Weight</th>
                          <th className="p-2">BP</th>
                          <th className="p-2">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ancVisits.map((v) => (
                          <tr key={v.id} className="border-t">
                            <td className="p-2">{v.visit_number}</td>
                            <td className="p-2">{formatDate(v.visit_date)}</td>
                            <td className="p-2">{v.gestational_age || '-'}</td>
                            <td className="p-2">{v.weight || '-'}</td>
                            <td className="p-2">{v.blood_pressure_systolic && v.blood_pressure_diastolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '-'}</td>
                            <td className="p-2">{v.is_high_risk ? '🔴 High' : '🟢 Normal'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PNC Visits */}
              {pncVisits.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-bold text-purple-700 mb-3">🤱 PNC Visits ({pncVisits.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-purple-50">
                        <tr>
                          <th className="p-2">Type</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Mother Weight</th>
                          <th className="p-2">Baby Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pncVisits.map((v) => (
                          <tr key={v.id} className="border-t">
                            <td className="p-2">{v.visit_type}</td>
                            <td className="p-2">{formatDate(v.visit_date)}</td>
                            <td className="p-2">{v.mother_weight || '-'}</td>
                            <td className="p-2">{v.baby_weight ? `${v.baby_weight} kg` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Deliveries */}
              {deliveries.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-bold text-yellow-700 mb-3">👶 Deliveries ({deliveries.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-yellow-50">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Mode</th>
                          <th className="p-2">Baby Name</th>
                          <th className="p-2">Birth Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map((d) => (
                          <tr key={d.id} className="border-t">
                            <td className="p-2">{formatDate(d.delivery_date)}</td>
                            <td className="p-2">{d.mode_of_delivery}</td>
                            <td className="p-2">{d.baby_name || '-'}</td>
                            <td className="p-2">{d.birth_weight ? `${d.birth_weight} kg` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Immunisations */}
              {immunisations.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-bold text-teal-700 mb-3">💉 Immunisations ({immunisations.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-teal-50">
                        <tr>
                          <th className="p-2">Vaccine</th>
                          <th className="p-2">Dose</th>
                          <th className="p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {immunisations.map((i) => (
                          <tr key={i.id} className="border-t">
                            <td className="p-2">{i.vaccine_name}</td>
                            <td className="p-2">{i.dose_number}</td>
                            <td className="p-2">{formatDate(i.administration_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ancVisits.length === 0 && pncVisits.length === 0 && deliveries.length === 0 && immunisations.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                  No medical records found.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}