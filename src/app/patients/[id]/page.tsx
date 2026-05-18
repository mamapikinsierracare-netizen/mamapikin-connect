// src/app/patients/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { QRCodeSVG } from 'qrcode.react'

// --- Types ---
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

type TimelineEvent = {
  id: string
  type: 'ANC' | 'DELIVERY' | 'PNC' | 'IMMUNISATION'
  date: string
  title: string
  subtitle: string
  details: any
  isCritical: boolean
}

// --- Data Fetching ---
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
  
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
    const patients = JSON.parse(localPatients)
    const localPatient = patients.find((p: Patient) => p.patient_id === patientId)
    if (localPatient) return localPatient
  }
  
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

// --- Formatting Helpers ---
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

function downloadQRCode(patientId: string) {
  const svg = document.querySelector('#qr-code-container svg')
  if (!svg) return
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)
  const img = new Image()
  
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    ctx?.drawImage(img, 0, 0)
    const link = document.createElement('a')
    link.download = `QR-${patientId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
}

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = decodeURIComponent(params.id as string)
  
  const [patient, setPatient] = useState<Patient | null>(null)
  const [ancVisits, setAncVisits] = useState<AncVisit[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [pncVisits, setPncVisits] = useState<PncVisit[]>([])
  const [immunisations, setImmunisations] = useState<Immunisation[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'timeline' | 'info' | 'anc' | 'delivery' | 'pnc' | 'immunisation'>('info')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      const patientData = await fetchPatient(patientId)
      setPatient(patientData)
      
      if (patientData) {
        const anc = await fetchPatientAncVisits(patientId)
        const del = await fetchPatientDeliveries(patientId)
        const pnc = await fetchPatientPncVisits(patientId)
        const imm = await fetchPatientImmunisations(patientId)
        
        setAncVisits(anc)
        setDeliveries(del)
        setPncVisits(pnc)
        setImmunisations(imm)

        // Build Timeline Array
        const events: TimelineEvent[] = []
        
        anc.forEach(a => events.push({
          id: a.visit_id, type: 'ANC', date: a.visit_date,
          title: `ANC Visit #${a.visit_number}`, subtitle: `${a.gestational_age || '?'} Weeks Gestation`,
          details: a, isCritical: a.is_high_risk || (a.blood_pressure_systolic ?? 0) >= 140
        }))
        
        del.forEach(d => events.push({
          id: d.delivery_id, type: 'DELIVERY', date: d.delivery_date,
          title: `Labor & Delivery`, subtitle: `${d.mode_of_delivery} | Baby: ${d.baby_gender}`,
          details: d, isCritical: d.maternal_outcome !== 'Alive - Well' || d.baby_outcome !== 'Alive - Well'
        }))
        
        pnc.forEach(p => events.push({
          id: p.visit_id, type: 'PNC', date: p.visit_date,
          title: `PNC Visit #${p.visit_number} (${p.visit_type})`, subtitle: `BP: ${p.mother_bp_systolic}/${p.mother_bp_diastolic}`,
          details: p, isCritical: (p.epds_score ?? 0) >= 10
        }))
        
        imm.forEach(i => events.push({
          id: i.immunisation_id, type: 'IMMUNISATION', date: i.administration_date,
          title: `Vaccine: ${i.vaccine_name} (Dose ${i.dose_number})`, subtitle: `By: ${i.administered_by}`,
          details: i, isCritical: i.adverse_reaction
        }))

        // Deduplicate and Sort
        const uniqueEvents = Array.from(new Map(events.map(item => [item.id, item])).values())
        uniqueEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setTimeline(uniqueEvents)
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
              <div className="text-4xl mb-4 animate-bounce">⏳</div>
              <p className="text-gray-500 font-bold">Loading Unified Patient Record...</p>
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
              <p className="text-gray-600 mb-4">We couldn't locate ID: {patientId}</p>
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
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Header with Back Button */}
          <div className="flex justify-between items-center mb-6">
            <Link href="/patients" className="text-green-600 hover:text-green-800 font-medium">
              ← Back to Patient List
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link href={`/patient/${patientId}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
                ✏️ Edit
              </Link>
              <Link href={`/anc?patient=${patientId}`} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium shadow-sm">
                🤰 ANC
              </Link>
              <Link href={`/delivery?patient=${patientId}`} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium shadow-sm">
                👶 Delivery
              </Link>
              <Link href={`/immunisation?patient=${patientId}`} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium shadow-sm">
                💉 Vaccine
              </Link>
            </div>
          </div>
          
          {/* Patient Header Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-t-8 border-green-600">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-800">{patient.full_name}</h1>
                <p className="text-gray-500 font-mono text-sm mt-1">ID: {patient.patient_id}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold shadow-sm">{getPatientType()}</span>
                  {getStatusBadge()}
                </div>
              </div>
              <div className="text-right bg-gray-50 p-3 rounded-lg border">
                <p className="text-sm text-gray-600"><b>Registered:</b> {formatDate(patient.registered_at)}</p>
                <p className="text-sm text-gray-600 mt-1"><b>Acct Closes:</b> {formatDate(patient.account_closing_date)}</p>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm border">
            <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'info' ? 'bg-green-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              📋 Info
            </button>
            <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              ⏳ Master Timeline
            </button>
            <button onClick={() => setActiveTab('anc')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'anc' ? 'bg-pink-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              🤰 ANC ({ancVisits.length})
            </button>
            <button onClick={() => setActiveTab('delivery')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'delivery' ? 'bg-yellow-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              👶 Delivery ({deliveries.length})
            </button>
            <button onClick={() => setActiveTab('pnc')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'pnc' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              👩‍👧 PNC ({pncVisits.length})
            </button>
            <button onClick={() => setActiveTab('immunisation')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'immunisation' ? 'bg-teal-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              💉 EPI ({immunisations.length})
            </button>
          </div>
          
          {/* TAB: Master Timeline (NEW) */}
          {activeTab === 'timeline' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-black text-gray-800 mb-6 border-b pb-3">Complete Clinical Timeline</h2>
              
              {timeline.length === 0 ? (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">No clinical history recorded for this patient yet.</div>
              ) : (
                <div className="relative border-l-4 border-indigo-200 ml-4 md:ml-6 space-y-8 pb-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="relative pl-6 md:pl-8">
                      <div className={`absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 border-white shadow flex items-center justify-center
                        ${event.type === 'ANC' ? 'bg-pink-500' : event.type === 'DELIVERY' ? 'bg-yellow-500' : event.type === 'PNC' ? 'bg-purple-500' : 'bg-teal-500'}
                        ${event.isCritical ? 'animate-pulse ring-2 ring-red-500' : ''}
                      `}></div>
                      
                      <div className={`bg-gray-50 rounded-lg p-5 border-l-4 shadow-sm hover:shadow-md transition-shadow
                        ${event.type === 'ANC' ? 'border-pink-500' : event.type === 'DELIVERY' ? 'border-yellow-500' : event.type === 'PNC' ? 'border-purple-500' : 'border-teal-500'}
                        ${event.isCritical ? 'bg-red-50 border-red-500' : ''}
                      `}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs font-black px-2 py-1 rounded tracking-wide uppercase 
                            ${event.type === 'ANC' ? 'bg-pink-200 text-pink-800' : event.type === 'DELIVERY' ? 'bg-yellow-200 text-yellow-800' : event.type === 'PNC' ? 'bg-purple-200 text-purple-800' : 'bg-teal-200 text-teal-800'}`}>
                            {event.type}
                          </span>
                          <span className="text-sm font-bold text-gray-500">{formatDate(event.date)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                        <p className="text-gray-700 font-medium">{event.subtitle}</p>
                        {event.isCritical && <p className="text-red-600 text-sm font-bold mt-2">⚠️ Critical Alert Logged</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Personal Information */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📋 Demographics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Full Name:</span> <span className="font-medium">{patient.full_name}</span></div>
                  <div><span className="text-gray-500">Date of Birth:</span> <span className="font-medium">{formatDate(patient.date_of_birth)}</span></div>
                  <div><span className="text-gray-500">Phone Number:</span> <span className="font-medium">{patient.phone || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Village/Town:</span> <span className="font-medium">{patient.village || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">District:</span> <span className="font-medium">{patient.district || 'Not provided'}</span></div>
                  <div><span className="text-gray-500">Blood Group:</span> <span className="font-medium">{patient.blood_group || 'Not recorded'}</span></div>
                  <div className="md:col-span-2 bg-red-50 p-2 rounded"><span className="text-red-500 font-bold">Allergies:</span> <span className="font-bold text-red-700">{patient.allergies || 'None reported'}</span></div>
                </div>
              </div>
              
              {/* QR Code Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📱 Emergency QR Code</h2>
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div id="qr-code-container" className="bg-gray-50 p-4 rounded-lg shadow-inner">
                    <QRCodeSVG 
                      value={JSON.stringify({
                        patient_id: patient.patient_id,
                        full_name: patient.full_name,
                        blood_group: patient.blood_group,
                        allergies: patient.allergies,
                        emergency_contact: patient.next_of_kin_phone,
                      })}
                      size={180} level="H" includeMargin={true}
                    />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-sm text-gray-600 mb-2">🔐 <strong>Emergency Access QR Code</strong></p>
                    <p className="text-sm text-gray-600 mb-2">Scan this QR code for immediate access to critical patient information.</p>
                    <button onClick={() => downloadQRCode(patient.patient_id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-md transition-colors">
                      📥 Download QR Code
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Family Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">👨‍👩‍👧‍👦 Family Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Husband Name:</span> <span className="font-medium">{patient.husband_name || '-'}</span></div>
                  <div><span className="text-gray-500">Husband Phone:</span> <span className="font-medium">{patient.husband_phone || '-'}</span></div>
                  <div><span className="text-gray-500">Father's Name:</span> <span className="font-medium">{patient.father_name || '-'}</span></div>
                  <div><span className="text-gray-500">Father's Phone:</span> <span className="font-medium">{patient.father_phone || '-'}</span></div>
                </div>
              </div>
              
              {/* Emergency Contact */}
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-400">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📞 Next of Kin (Emergency)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Name:</span> <span className="font-medium">{patient.next_of_kin_name || '-'}</span></div>
                  <div><span className="text-gray-500">Relationship:</span> <span className="font-medium">{patient.next_of_kin_relationship || '-'}</span></div>
                  <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{patient.next_of_kin_phone || '-'}</span></div>
                  <div><span className="text-gray-500">Address:</span> <span className="font-medium">{patient.next_of_kin_address || '-'}</span></div>
                </div>
              </div>
              
              {/* Contextual Logic */}
              {patient.is_pregnant && (
                <div className="bg-pink-50 rounded-lg shadow-md p-6 border border-pink-200">
                  <h2 className="text-lg font-bold text-pink-800 mb-4 border-b border-pink-200 pb-2">🤰 Pregnancy Stats</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><span className="text-gray-600">EDD:</span> <span className="font-bold">{formatDate(patient.edd)}</span></div>
                    <div><span className="text-gray-600">Gravida/Para:</span> <span className="font-bold">{patient.gravida || '?'}/{patient.para || '?'}</span></div>
                  </div>
                </div>
              )}
              {patient.is_child_under_5 && (
                <div className="bg-teal-50 rounded-lg shadow-md p-6 border border-teal-200">
                  <h2 className="text-lg font-bold text-teal-800 mb-4 border-b border-teal-200 pb-2">👶 Child Stats</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><span className="text-gray-600">Birth Weight:</span> <span className="font-bold">{patient.birth_weight ? `${patient.birth_weight} kg` : '-'}</span></div>
                    <div><span className="text-gray-600">Guardian:</span> <span className="font-bold">{patient.guardian_name || '-'}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* TAB: ANC */}
          {activeTab === 'anc' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-pink-500">
              {ancVisits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No ANC visits recorded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-pink-50 text-pink-800 text-left text-xs font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3">Visit #</th><th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Weeks</th><th className="px-4 py-3">Weight</th>
                        <th className="px-4 py-3">BP</th><th className="px-4 py-3">FHR</th>
                        <th className="px-4 py-3">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ancVisits.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-bold">{v.visit_number}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(v.visit_date)}</td>
                          <td className="px-4 py-3 text-sm">{v.gestational_age || '-'}</td>
                          <td className="px-4 py-3 text-sm">{v.weight || '-'}</td>
                          <td className="px-4 py-3 text-sm">{v.blood_pressure_systolic && v.blood_pressure_diastolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{v.fetal_heart_rate || '-'}</td>
                          <td className="px-4 py-3 text-sm font-bold">{v.is_high_risk ? '🔴 High' : '🟢 Normal'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* TAB: Delivery */}
          {activeTab === 'delivery' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-yellow-500">
              {deliveries.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No delivery records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-yellow-50 text-yellow-800 text-left text-xs font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3">Date</th><th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Baby Name</th><th className="px-4 py-3">Weight</th>
                        <th className="px-4 py-3">APGAR 5min</th><th className="px-4 py-3">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {deliveries.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(d.delivery_date)}</td>
                          <td className="px-4 py-3 text-sm">{d.mode_of_delivery}</td>
                          <td className="px-4 py-3 text-sm font-bold">{d.baby_name || '-'}</td>
                          <td className="px-4 py-3 text-sm">{d.birth_weight ? `${d.birth_weight} kg` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{d.apgar_5min || '-'}</td>
                          <td className="px-4 py-3 text-sm">{d.maternal_outcome || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* TAB: PNC */}
          {activeTab === 'pnc' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-purple-500">
              {pncVisits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No PNC visits recorded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-purple-50 text-purple-800 text-left text-xs font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3">Type</th><th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Mother BP</th><th className="px-4 py-3">Baby Wt</th>
                        <th className="px-4 py-3">Feeding</th><th className="px-4 py-3">EPDS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pncVisits.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-bold">{p.visit_type}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(p.visit_date)}</td>
                          <td className="px-4 py-3 text-sm">{p.mother_bp_systolic && p.mother_bp_diastolic ? `${p.mother_bp_systolic}/${p.mother_bp_diastolic}` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{p.baby_weight ? `${p.baby_weight} kg` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{p.breastfeeding_status || '-'}</td>
                          <td className="px-4 py-3 text-sm font-bold">{p.epds_score ? `${p.epds_score}/30` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* TAB: Immunisations */}
          {activeTab === 'immunisation' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-teal-500">
              {immunisations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No EPI records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-teal-50 text-teal-800 text-left text-xs font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3">Date</th><th className="px-4 py-3">Vaccine</th>
                        <th className="px-4 py-3">Dose</th><th className="px-4 py-3">Admin By</th>
                        <th className="px-4 py-3">Reaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {immunisations.map((imm) => (
                        <tr key={imm.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(imm.administration_date)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-teal-700">{imm.vaccine_name}</td>
                          <td className="px-4 py-3 text-sm font-bold">{imm.dose_number}</td>
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