'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import QRCode from '@/components/QRCode'

type Patient = {
  patient_id: string
  full_name: string
  date_of_birth: string | null
  phone: string | null
  village: string | null
  district: string | null
  is_pregnant: boolean
  is_breastfeeding: boolean
  is_child_under_5: boolean
  registered_at: string
  synced_to_cloud: boolean
  account_opening_date: string
  account_closing_date: string
  account_status: string
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

async function fetchAllPatients(): Promise<Patient[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const allPatients: Patient[] = []
  const seenIds = new Set<string>()

  // Get from localStorage
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
    const localList = JSON.parse(localPatients)
    localList.forEach((p: Patient) => {
      if (!seenIds.has(p.patient_id)) {
        seenIds.add(p.patient_id)
        allPatients.push(p)
      }
    })
  }

  // Get from Supabase if online
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?order=registered_at.desc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudPatients = await response.json()
        cloudPatients.forEach((p: Patient) => {
          if (!seenIds.has(p.patient_id)) {
            seenIds.add(p.patient_id)
            allPatients.push(p)
          }
        })
      }
    } catch { /* ignore */ }
  }

  return allPatients.sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())
}

function formatDate(dateString: string): string {
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

// QR Code Modal Component
function QRCodeModal({ patientId, isOpen, onClose }: { patientId: string; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-center mb-4">Patient QR Code</h3>
        <div className="flex justify-center mb-4">
          <QRCode value={patientId} size={250} />
        </div>
        <p className="text-center text-sm text-gray-600 mb-4 break-all">{patientId}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedQRPatient, setSelectedQRPatient] = useState<string | null>(null)

  // Load patients on mount
  useEffect(() => {
    async function loadPatients() {
      setLoading(true)
      const allPatients = await fetchAllPatients()
      setPatients(allPatients)
      setFilteredPatients(allPatients)
      setLoading(false)
    }
    loadPatients()
  }, [])

  // Apply filters
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = [...patients]

      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filtered = filtered.filter(p =>
          p.full_name.toLowerCase().includes(term) ||
          p.patient_id.toLowerCase().includes(term) ||
          (p.phone && p.phone.toLowerCase().includes(term))
        )
      }

      // Apply type filter
      if (filterType !== 'all') {
        filtered = filtered.filter(p => {
          if (filterType === 'pregnant') return p.is_pregnant === true
          if (filterType === 'breastfeeding') return p.is_breastfeeding === true
          if (filterType === 'child') return p.is_child_under_5 === true
          return true
        })
      }

      setFilteredPatients(filtered)
    }, 0)

    return () => clearTimeout(timer)
  }, [patients, searchTerm, filterType])

  const getPatientType = (patient: Patient): string => {
    if (patient.is_pregnant) return '🤰 Pregnant'
    if (patient.is_breastfeeding) return '🤱 Breastfeeding'
    if (patient.is_child_under_5) return '👶 Child'
    return '📋 General'
  }

  const getStatusBadge = (patient: Patient) => {
    const daysLeft = patient.account_closing_date ? getDaysRemaining(patient.account_closing_date) : null

    if (daysLeft !== null && daysLeft < 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Expired</span>
    }
    if (daysLeft !== null && daysLeft < 7) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">{daysLeft} days left</span>
    }
    if (daysLeft !== null && daysLeft < 30) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">{daysLeft} days left</span>
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-green-700">Patient Registry</h1>
            <Link href="/register" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              + Register New Patient
            </Link>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-1">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, ID, or phone number..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Filter by Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="all">All Patients</option>
                  <option value="pregnant">🤰 Pregnant Women</option>
                  <option value="breastfeeding">🤱 Breastfeeding Mothers</option>
                  <option value="child">👶 Children Under 5</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-500">
            Found {filteredPatients.length} patient(s)
          </div>

          {/* Patients Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No patients found.</p>
                <Link href="/register" className="text-green-600 underline mt-2 inline-block">Register a patient →</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QR Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPatients.map((patient) => (
                      <tr key={patient.patient_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => setSelectedQRPatient(patient.patient_id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Click to view QR code"
                          >
                            📱 QR
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">{patient.patient_id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{patient.full_name}</td>
                        <td className="px-4 py-3 text-sm">{getPatientType(patient)}</td>
                        <td className="px-4 py-3 text-sm">{patient.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm">{patient.district || '-'}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(patient.registered_at)}</td>
                        <td className="px-4 py-3 text-sm">{getStatusBadge(patient)}</td>
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/patients/${patient.patient_id}`} className="text-green-600 hover:text-green-800">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        patientId={selectedQRPatient || ''}
        isOpen={selectedQRPatient !== null}
        onClose={() => setSelectedQRPatient(null)}
      />
    </>
  )
}