'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

type Patient = {
  id?: number
  patient_id: string
  full_name: string
  date_of_birth: string | null
  phone: string | null
  village: string | null
  district: string | null
  blood_group: string | null
  allergies: string | null
  is_pregnant: boolean
  is_breastfeeding: boolean
  is_child_under_5: boolean
  edd: string | null
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
  visit_number: number
  visit_type: string
  visit_date: string
  mother_weight: number | null
  baby_weight: number | null
  epds_score: number | null
}

type Delivery = {
  id: number
  delivery_date: string
  mode_of_delivery: string
  baby_name: string | null
  birth_weight: number | null
  maternal_outcome: string
  baby_outcome: string
}

type Immunisation = {
  id: number
  vaccine_name: string
  dose_number: number
  administration_date: string
}

export default function PortalPage() {
  const [patientData, setPatientData] = useState<Patient | null>(null)
  const [ancVisits, setAncVisits] = useState<AncVisit[]>([])
  const [pncVisits, setPncVisits] = useState<PncVisit[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [immunisations, setImmunisations] = useState<Immunisation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [patientIdInput, setPatientIdInput] = useState('')
  const [searchedId, setSearchedId] = useState('')

  // Load patient data from localStorage when searchedId changes
  useEffect(() => {
    if (!searchedId) return

    const loadData = async () => {
      setLoading(true)
      setError('')
      
      try {
        // Search in localStorage
        const offlinePatients = localStorage.getItem('offline_patients')
        let foundPatient: Patient | null = null
        
        if (offlinePatients) {
          const patients: Patient[] = JSON.parse(offlinePatients)
          foundPatient = patients.find(p => p.patient_id === searchedId) || null
        }
        
        if (foundPatient) {
          setPatientData(foundPatient)
          
          // Load related records from localStorage
          const ancKey = `anc_visits_${foundPatient.patient_id}`
          const ancStored = localStorage.getItem(ancKey)
          if (ancStored) setAncVisits(JSON.parse(ancStored))
          
          const pncKey = `pnc_visits_${foundPatient.patient_id}`
          const pncStored = localStorage.getItem(pncKey)
          if (pncStored) setPncVisits(JSON.parse(pncStored))
          
          const deliveryKey = `deliveries_${foundPatient.patient_id}`
          const deliveryStored = localStorage.getItem(deliveryKey)
          if (deliveryStored) setDeliveries(JSON.parse(deliveryStored))
          
          const immunisationKey = `immunisations_${foundPatient.patient_id}`
          const immunisationStored = localStorage.getItem(immunisationKey)
          if (immunisationStored) setImmunisations(JSON.parse(immunisationStored))
          
        } else {
          setError('Patient not found. Please check the Patient ID.')
          setPatientData(null)
        }
      } catch (err) {
        setError('Error loading patient data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [searchedId])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (patientIdInput.trim()) {
      setSearchedId(patientIdInput.trim())
    }
  }

  const getDaysRemaining = (closingDate: string | null) => {
    if (!closingDate) return null
    const today = new Date()
    const closing = new Date(closingDate)
    const diffTime = closing.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

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
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading patient data...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          {patientData && !loading && (
            <>
              {/* Patient Information Card */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-green-700 mb-4">Patient Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Full Name</div>
                    <div className="font-medium">{patientData.full_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Patient ID</div>
                    <div className="font-mono text-sm">{patientData.patient_id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date of Birth</div>
                    <div>{formatDate(patientData.date_of_birth)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Blood Group</div>
                    <div>{patientData.blood_group || 'Not recorded'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Allergies</div>
                    <div>{patientData.allergies || 'None recorded'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Account Status</div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        patientData.account_status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {patientData.account_status || 'active'}
                      </span>
                    </div>
                  </div>
                  {patientData.account_closing_date && (
                    <div className="col-span-2">
                      <div className="text-sm text-gray-500">Account Closing Date</div>
                      <div className="font-medium">
                        {formatDate(patientData.account_closing_date)}
                        {getDaysRemaining(patientData.account_closing_date) !== null && (
                          <span className={`ml-2 text-sm ${
                            getDaysRemaining(patientData.account_closing_date)! < 0 
                              ? 'text-red-600' 
                              : getDaysRemaining(patientData.account_closing_date)! < 30 
                              ? 'text-orange-600' 
                              : 'text-green-600'
                          }`}>
                            ({getDaysRemaining(patientData.account_closing_date)! < 0 
                              ? 'Expired' 
                              : `${getDaysRemaining(patientData.account_closing_date)} days remaining`})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ANC Visits */}
              {ancVisits.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-bold text-pink-700 mb-4">🤰 ANC Visits</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Visit #</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Weeks</th>
                          <th className="p-2 text-left">Weight</th>
                          <th className="p-2 text-left">BP</th>
                          <th className="p-2 text-left">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ancVisits.map((visit) => (
                          <tr key={visit.id} className="border-t">
                            <td className="p-2">{visit.visit_number}</td>
                            <td className="p-2">{formatDate(visit.visit_date)}</td>
                            <td className="p-2">{visit.gestational_age || '-'}</td>
                            <td className="p-2">{visit.weight || '-'}</td>
                            <td className="p-2">{visit.blood_pressure_systolic && visit.blood_pressure_diastolic 
                              ? `${visit.blood_pressure_systolic}/${visit.blood_pressure_diastolic}` 
                              : '-'}</td>
                            <td className="p-2">{visit.is_high_risk ? '🔴 High Risk' : '🟢 Normal'}</td>
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
                  <h2 className="text-xl font-bold text-blue-700 mb-4">🤱 PNC Visits</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Visit</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Mother Weight</th>
                          <th className="p-2 text-left">Baby Weight</th>
                          <th className="p-2 text-left">EPDS Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pncVisits.map((visit) => (
                          <tr key={visit.id} className="border-t">
                            <td className="p-2">{visit.visit_type}</td>
                            <td className="p-2">{formatDate(visit.visit_date)}</td>
                            <td className="p-2">{visit.mother_weight || '-'}</td>
                            <td className="p-2">{visit.baby_weight || '-'}</td>
                            <td className="p-2">{visit.epds_score !== null ? `${visit.epds_score}/30` : '-'}</td>
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
                  <h2 className="text-xl font-bold text-yellow-700 mb-4">👶 Deliveries</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Mode</th>
                          <th className="p-2 text-left">Baby Name</th>
                          <th className="p-2 text-left">Birth Weight</th>
                          <th className="p-2 text-left">Maternal Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map((delivery) => (
                          <tr key={delivery.id} className="border-t">
                            <td className="p-2">{formatDate(delivery.delivery_date)}</td>
                            <td className="p-2">{delivery.mode_of_delivery}</td>
                            <td className="p-2">{delivery.baby_name || '-'}</td>
                            <td className="p-2">{delivery.birth_weight ? `${delivery.birth_weight} kg` : '-'}</td>
                            <td className="p-2">{delivery.maternal_outcome || '-'}</td>
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
                  <h2 className="text-xl font-bold text-teal-700 mb-4">💉 Immunisations</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Vaccine</th>
                          <th className="p-2 text-left">Dose</th>
                          <th className="p-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {immunisations.map((imm) => (
                          <tr key={imm.id} className="border-t">
                            <td className="p-2">{imm.vaccine_name}</td>
                            <td className="p-2">{imm.dose_number}</td>
                            <td className="p-2">{formatDate(imm.administration_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ancVisits.length === 0 && pncVisits.length === 0 && deliveries.length === 0 && immunisations.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                  No medical records found for this patient.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}