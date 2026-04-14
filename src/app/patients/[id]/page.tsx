'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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
  guardian_name: string | null
  guardian_phone: string | null
  is_pregnant: boolean
  is_breastfeeding: boolean
  is_child_under_5: boolean
  registered_at: string
  synced_to_cloud: boolean
  edd: string | null
  gestational_age: number | null
  gravida: number | null
  para: number | null
  birth_weight: number | null
  birth_length: number | null
  last_delivery_date: string | null
  exclusive_breastfeeding: boolean
  husband_name: string | null
  husband_phone: string | null
  husband_occupation: string | null
  father_name: string | null
  father_phone: string | null
  father_location: string | null
  next_of_kin_name: string | null
  next_of_kin_relationship: string | null
  next_of_kin_phone: string | null
  next_of_kin_address: string | null
  primary_decision_maker: string | null
  family_support_level: string | null
  account_opening_date: string
  account_closing_date: string
  account_status: string
}

type AncVisit = {
  id: number
  visit_id: string
  patient_id: string
  visit_number: number
  gestational_age: number | null
  weight: number | null
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  fundal_height: number | null
  fetal_heart_rate: number | null
  fetal_movements: string
  presentation: string
  urine_protein: string
  hemoglobin: number | null
  danger_signs: string[]
  is_high_risk: boolean
  visit_date: string
}

type Delivery = {
  id: number
  delivery_id: string
  patient_id: string
  delivery_date: string
  mode_of_delivery: string
  baby_name: string
  baby_gender: string
  birth_weight: number | null
  apgar_5min: number | null
  maternal_outcome: string
  baby_outcome: string
}

type PncVisit = {
  id: number
  visit_id: string
  patient_id: string
  visit_number: number
  visit_type: string
  mother_weight: number | null
  mother_bp_systolic: number | null
  mother_bp_diastolic: number | null
  breastfeeding_status: string
  baby_weight: number | null
  baby_jaundice: string
  epds_score: number | null
  visit_date: string
}

type Immunisation = {
  id: number
  immunisation_id: string
  patient_id: string
  vaccine_name: string
  dose_number: number
  administration_date: string
  administered_by: string
  adverse_reaction: boolean
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

async function fetchPatient(patientId: string): Promise<Patient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Check localStorage first
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
    const patients = JSON.parse(localPatients)
    const localPatient = patients.find((p: Patient) => p.patient_id === patientId)
    if (localPatient) return localPatient
  }
  
  // Check Supabase
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?patient_id=eq.${patientId}`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) return data[0]
      }
    } catch { /* ignore */ }
  }
  
  return null
}

async function fetchPatientAncVisits(patientId: string): Promise<AncVisit[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `anc_visits_${patientId}`
  const localVisits = localStorage.getItem(localKey)
  const localList: AncVisit[] = localVisits ? JSON.parse(localVisits) : []
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/anc_visits?patient_id=eq.${patientId}&order=visit_number.asc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudList = await response.json()
        return [...localList, ...cloudList].sort((a, b) => a.visit_number - b.visit_number)
      }
    } catch { /* ignore */ }
  }
  
  return localList.sort((a, b) => a.visit_number - b.visit_number)
}

async function fetchPatientDeliveries(patientId: string): Promise<Delivery[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `deliveries_${patientId}`
  const localDeliveries = localStorage.getItem(localKey)
  const localList: Delivery[] = localDeliveries ? JSON.parse(localDeliveries) : []
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/deliveries?patient_id=eq.${patientId}&order=delivery_date.desc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudList = await response.json()
        return [...localList, ...cloudList]
      }
    } catch { /* ignore */ }
  }
  
  return localList
}

async function fetchPatientPncVisits(patientId: string): Promise<PncVisit[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `pnc_visits_${patientId}`
  const localVisits = localStorage.getItem(localKey)
  const localList: PncVisit[] = localVisits ? JSON.parse(localVisits) : []
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/pnc_visits?patient_id=eq.${patientId}&order=visit_date.desc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudList = await response.json()
        return [...localList, ...cloudList]
      }
    } catch { /* ignore */ }
  }
  
  return localList
}

async function fetchPatientImmunisations(patientId: string): Promise<Immunisation[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localKey = `immunisations_${patientId}`
  const localImmunisations = localStorage.getItem(localKey)
  const localList: Immunisation[] = localImmunisations ? JSON.parse(localImmunisations) : []
  
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/immunisations?patient_id=eq.${patientId}&order=administration_date.desc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudList = await response.json()
        return [...localList, ...cloudList]
      }
    } catch { /* ignore */ }
  }
  
  return localList
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getDaysRemaining(closingDate: string): number {
  const today = new Date()
  const closing = new Date(closingDate)
  const diffTime = closing.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = params.id as string
  
  const [patient, setPatient] = useState<Patient | null>(null)
  const [ancVisits, setAncVisits] = useState<AncVisit[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [pncVisits, setPncVisits] = useState<PncVisit[]>([])
  const [immunisations, setImmunisations] = useState<Immunisation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'anc' | 'delivery' | 'pnc' | 'immunisation'>('info')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      const patientData = await fetchPatient(patientId)
      setPatient(patientData)
      
      if (patientData) {
        const anc = await fetchPatientAncVisits(patientId)
        const deliveries = await fetchPatientDeliveries(patientId)
        const pnc = await fetchPatientPncVisits(patientId)
        const immunisations = await fetchPatientImmunisations(patientId)
        
        setAncVisits(anc)
        setDeliveries(deliveries)
        setPncVisits(pnc)
        setImmunisations(immunisations)
      }
      
      setLoading(false)
    }
    
    if (patientId) {
      loadData()
    }
  }, [patientId])

  const getStatusBadge = () => {
    if (!patient) return null
    const daysLeft = patient.account_closing_date ? getDaysRemaining(patient.account_closing_date) : null
    
    if (daysLeft !== null && daysLeft < 0) {
      return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">Account Expired</span>
    }
    if (daysLeft !== null && daysLeft < 7) {
      return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">Expires in {daysLeft} days</span>
    }
    if (daysLeft !== null && daysLeft < 30) {
      return <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">Expires in {daysLeft} days</span>
    }
    return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Active</span>
  }

  const getPatientType = () => {
    if (!patient) return ''
    if (patient.is_pregnant) return '🤰 Pregnant Woman'
    if (patient.is_breastfeeding) return '🤱 Breastfeeding Mother'
    if (patient.is_child_under_5) return '👶 Child Under 5'
    return '📝 General Patient'
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-500">Loading patient data...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!patient) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Patient Not Found</h1>
              <p className="text-gray-600 mb-4">The patient you are looking for does not exist.</p>
              <Link href="/patients" className="text-green-600 hover:underline">← Back to Patient List</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          
          {/* Header with Back Button */}
          <div className="flex justify-between items-center mb-6">
            <Link href="/patients" className="text-green-600 hover:text-green-800">
              ← Back to Patient List
            </Link>
            <div className="flex gap-2">
              <Link 
                href={`/patient/${patientId}/edit`} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ✏️ Edit Patient
              </Link>
              <Link 
                href={`/anc?patient=${patientId}`} 
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
              >
                🤰 Record ANC
              </Link>
            </div>
          </div>
          
          {/* Patient Header Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{patient.full_name}</h1>
                <p className="text-gray-500 font-mono text-sm mt-1">ID: {patient.patient_id}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{getPatientType()}</span>
                  {getStatusBadge()}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Registered on {formatDate(patient.registered_at)}</p>
                <p className="text-sm text-gray-500">Account closes on {formatDate(patient.account_closing_date)}</p>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'info' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              📋 Personal Info
            </button>
            <button
              onClick={() => setActiveTab('anc')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'anc' ? 'bg-pink-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              🤰 ANC Visits ({ancVisits.length})
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'delivery' ? 'bg-yellow-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              👶 Deliveries ({deliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('pnc')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'pnc' ? 'bg-purple-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              👩‍👧 PNC Visits ({pncVisits.length})
            </button>
            <button
              onClick={() => setActiveTab('immunisation')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'immunisation' ? 'bg-teal-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              💉 Immunisations ({immunisations.length})
            </button>
          </div>
          
          {/* Tab Content: Personal Information */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Demographics */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📋 Demographics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Full Name:</span> <span className="font-medium">{patient.full_name}</span></div>
                  <div><span className="text-gray-500">Date of Birth:</span> <span className="font-medium">{formatDate(patient.date_of_birth)}</span></div>
                  <div><span className="text-gray-500">Phone Number:</span> <span className="font-medium">{patient.phone || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Village/Town:</span> <span className="font-medium">{patient.village || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">District:</span> <span className="font-medium">{patient.district || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Blood Group:</span> <span className="font-medium">{patient.blood_group || 'Not recorded'}</span></div>
                  <div><span className="text-gray-500">Allergies:</span> <span className="font-medium">{patient.allergies || 'None reported'}</span></div>
                </div>
              </div>
              
              {/* Family Information */}
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">👨‍👩‍👧‍👦 Family Information</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div><span className="text-gray-500">Husband/Partner Name:</span> <span className="font-medium">{patient.husband_name || 'Not provided'}</span></div>
    <div><span className="text-gray-500">Husband/Partner Phone:</span> <span className="font-medium">{patient.husband_phone || 'Not provided'}</span></div>
    <div><span className="text-gray-500">Husband/Partner Occupation:</span> <span className="font-medium">{patient.husband_occupation || 'Not provided'}</span></div>
    <div><span className="text-gray-500">Father&apos;s Name:</span> <span className="font-medium">{patient.father_name || 'Not provided'}</span></div>
    <div><span className="text-gray-500">Father&apos;s Phone:</span> <span className="font-medium">{patient.father_phone || 'Not provided'}</span></div>
    <div><span className="text-gray-500">Father&apos;s Location:</span> <span className="font-medium">{patient.father_location || 'Not provided'}</span></div>
  </div>
</div>
              
              {/* Next of Kin */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📞 Emergency Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Next of Kin Name:</span> <span className="font-medium">{patient.next_of_kin_name || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Relationship:</span> <span className="font-medium">{patient.next_of_kin_relationship || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Next of Kin Phone:</span> <span className="font-medium">{patient.next_of_kin_phone || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Next of Kin Address:</span> <span className="font-medium">{patient.next_of_kin_address || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Primary Decision Maker:</span> <span className="font-medium">{patient.primary_decision_maker || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Family Support Level:</span> <span className="font-medium">{patient.family_support_level || 'Not provided'}</span></div>
                </div>
              </div>
              
              {/* Pregnancy Specific (if applicable) */}
              {patient.is_pregnant && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-bold text-pink-800 mb-4 border-b pb-2">🤰 Pregnancy Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><span className="text-gray-500">Expected Delivery Date (EDD):</span> <span className="font-medium">{formatDate(patient.edd)}</span></div>
                    <div><span className="text-gray-500">Gestational Age:</span> <span className="font-medium">{patient.gestational_age ? `${patient.gestational_age} weeks` : 'Not recorded'}</span></div>
                    <div><span className="text-gray-500">Gravida:</span> <span className="font-medium">{patient.gravida || 'Not recorded'}</span></div>
                    <div><span className="text-gray-500">Para:</span> <span className="font-medium">{patient.para || 'Not recorded'}</span></div>
                  </div>
                </div>
              )}
              
              {/* Breastfeeding Specific (if applicable) */}
              {patient.is_breastfeeding && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-bold text-blue-800 mb-4 border-b pb-2">🤱 Breastfeeding Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><span className="text-gray-500">Last Delivery Date:</span> <span className="font-medium">{formatDate(patient.last_delivery_date)}</span></div>
                    <div><span className="text-gray-500">Baby Birth Weight:</span> <span className="font-medium">{patient.birth_weight ? `${patient.birth_weight} kg` : 'Not recorded'}</span></div>
                    <div><span className="text-gray-500">Exclusive Breastfeeding:</span> <span className="font-medium">{patient.exclusive_breastfeeding ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              )}
              
              {/* Child Specific (if applicable) */}
              {patient.is_child_under_5 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-bold text-teal-800 mb-4 border-b pb-2">👶 Child Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><span className="text-gray-500">Birth Weight:</span> <span className="font-medium">{patient.birth_weight ? `${patient.birth_weight} kg` : 'Not recorded'}</span></div>
                    <div><span className="text-gray-500">Birth Length:</span> <span className="font-medium">{patient.birth_length ? `${patient.birth_length} cm` : 'Not recorded'}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Tab Content: ANC Visits */}
          {activeTab === 'anc' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {ancVisits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No ANC visits recorded.</p>
                  <Link href={`/anc`} className="text-green-600 underline mt-2 inline-block">Record first ANC visit →</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-pink-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase">Visit #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase">Weeks</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase">Weight (kg)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase">BP</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase">FHR</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ancVisits.map((visit) => (
                        <tr key={visit.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{visit.visit_number}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(visit.visit_date)}</td>
                          <td className="px-4 py-3 text-sm">{visit.gestational_age || '-'}</td>
                          <td className="px-4 py-3 text-sm">{visit.weight || '-'}</td>
                          <td className="px-4 py-3 text-sm">{visit.blood_pressure_systolic && visit.blood_pressure_diastolic ? `${visit.blood_pressure_systolic}/${visit.blood_pressure_diastolic}` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{visit.fetal_heart_rate || '-'}</td>
                          <td className="px-4 py-3 text-sm">{visit.is_high_risk ? '🔴 High' : '🟢 Normal'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Tab Content: Deliveries */}
          {activeTab === 'delivery' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {deliveries.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No delivery records found.</p>
                  <Link href={`/delivery`} className="text-green-600 underline mt-2 inline-block">Record delivery →</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-yellow-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Mode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Baby Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">APGAR 5min</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {deliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(delivery.delivery_date)}</td>
                          <td className="px-4 py-3 text-sm">{delivery.mode_of_delivery}</td>
                          <td className="px-4 py-3 text-sm font-medium">{delivery.baby_name || 'Not named'}</td>
                          <td className="px-4 py-3 text-sm">{delivery.birth_weight ? `${delivery.birth_weight} kg` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{delivery.apgar_5min || '-'}</td>
                          <td className="px-4 py-3 text-sm">{delivery.maternal_outcome || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Tab Content: PNC Visits */}
          {activeTab === 'pnc' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {pncVisits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No PNC visits recorded.</p>
                  <Link href={`/pnc`} className="text-green-600 underline mt-2 inline-block">Record first PNC visit →</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Mother BP</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Baby Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Breastfeeding</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">EPDS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pncVisits.map((visit) => (
                        <tr key={visit.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{visit.visit_type}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(visit.visit_date)}</td>
                          <td className="px-4 py-3 text-sm">{visit.mother_bp_systolic && visit.mother_bp_diastolic ? `${visit.mother_bp_systolic}/${visit.mother_bp_diastolic}` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{visit.baby_weight ? `${visit.baby_weight} kg` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{visit.breastfeeding_status || '-'}</td>
                          <td className="px-4 py-3 text-sm">{visit.epds_score ? `${visit.epds_score}/30` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Tab Content: Immunisations */}
          {activeTab === 'immunisation' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {immunisations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No immunisation records found.</p>
                  <Link href={`/immunisation`} className="text-green-600 underline mt-2 inline-block">Record immunisation →</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-teal-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">Vaccine</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">Dose</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">Admin By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">Reaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {immunisations.map((imm) => (
                        <tr key={imm.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(imm.administration_date)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{imm.vaccine_name}</td>
                          <td className="px-4 py-3 text-sm">{imm.dose_number}</td>
                          <td className="px-4 py-3 text-sm">{imm.administered_by || '-'}</td>
                          <td className="px-4 py-3 text-sm">{imm.adverse_reaction ? '⚠️ Yes' : '✅ No'}</td>
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