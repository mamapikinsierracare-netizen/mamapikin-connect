'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

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

async function fetchPatientsFromCloud(): Promise<Patient[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return []
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?order=registered_at.desc&limit=50`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    if (response.ok) {
      return await response.json()
    }
  } catch { /* ignore */ }
  return []
}

function getDaysRemaining(closingDate: string): number {
  const today = new Date()
  const closing = new Date(closingDate)
  const diffTime = closing.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export default function HomePage() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      // Check connection
      const online = await isSupabaseReachable()
      setConnectionStatus(online ? 'online' : 'offline')
      
      // Load patients from cloud if online, else from localStorage
      let allPatients: Patient[] = []
      if (online) {
        const cloudPatients = await fetchPatientsFromCloud()
        allPatients = cloudPatients
      }
      
      // Also check localStorage for offline patients
      const localPatients = localStorage.getItem('offline_patients')
      if (localPatients) {
        const localList = JSON.parse(localPatients)
        // Count pending sync
        const unsynced = localList.filter((p: Patient) => !p.synced_to_cloud)
        setPendingSyncCount(unsynced.length)
        
        // Merge local patients (for display)
        const existingIds = new Set(allPatients.map(p => p.patient_id))
        const newLocalPatients = localList.filter((p: Patient) => !existingIds.has(p.patient_id))
        allPatients = [...newLocalPatients, ...allPatients]
      }
      
      setPatients(allPatients.slice(0, 20)) // Show last 20 patients
      setLoading(false)
    }
    
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate statistics
  const totalPatients = patients.length
  const pregnantCount = patients.filter(p => p.is_pregnant).length
  const breastfeedingCount = patients.filter(p => p.is_breastfeeding).length
  const childCount = patients.filter(p => p.is_child_under_5).length
  
  // Account expiry calculations
  const today = new Date()
  const expiredAccounts = patients.filter(p => {
    if (!p.account_closing_date) return false
    return getDaysRemaining(p.account_closing_date) < 0
  })
  const expiringSoon30 = patients.filter(p => {
    if (!p.account_closing_date) return false
    const days = getDaysRemaining(p.account_closing_date)
    return days >= 0 && days <= 30
  })
  const expiringSoon7 = patients.filter(p => {
    if (!p.account_closing_date) return false
    const days = getDaysRemaining(p.account_closing_date)
    return days >= 0 && days <= 7
  })

  // Recent registrations (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentRegistrations = patients.filter(p => {
    if (!p.registered_at) return false
    return new Date(p.registered_at) >= sevenDaysAgo
  })

  const features = [
    { name: 'Register Patient', path: '/register', icon: '📝', description: 'Register new patients', color: 'bg-green-100 hover:bg-green-200', badge: null },
    { name: 'Sync Queue', path: '/sync', icon: '🔄', description: `Sync offline data to cloud`, color: 'bg-blue-100 hover:bg-blue-200', badge: pendingSyncCount > 0 ? `${pendingSyncCount} pending` : null },
    { name: 'ANC Visit', path: '/anc', icon: '🤰', description: 'Antenatal care visits', color: 'bg-pink-100 hover:bg-pink-200', badge: null },
    { name: 'PNC Visit', path: '/pnc', icon: '👩‍👧', description: 'Postnatal care visits', color: 'bg-purple-100 hover:bg-purple-200', badge: null },
    { name: 'Delivery', path: '/delivery', icon: '👶', description: 'Labour and delivery', color: 'bg-yellow-100 hover:bg-yellow-200', badge: null },
    { name: 'Immunisation', path: '/immunisation', icon: '💉', description: 'Childhood vaccines', color: 'bg-teal-100 hover:bg-teal-200', badge: null },
    { name: 'Scheduler', path: '/scheduler', icon: '📅', description: 'Manage appointments', color: 'bg-indigo-100 hover:bg-indigo-200', badge: null },
    { name: 'Patient Search', path: '/patients', icon: '🔍', description: 'Search and view patients', color: 'bg-gray-100 hover:bg-gray-200', badge: null },
  ]

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Connection Status Banner */}
          <div className={`mb-6 p-4 rounded-lg text-center ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800 border border-green-500' : 
            connectionStatus === 'offline' ? 'bg-red-100 text-red-800 border border-red-500' :
            'bg-gray-100 text-gray-800'
          }`}>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{connectionStatus === 'online' ? '✅' : connectionStatus === 'offline' ? '📡' : '⏳'}</span>
              <span className="font-medium">
                {connectionStatus === 'online' ? 'ONLINE MODE - Connected to cloud database' : 
                 connectionStatus === 'offline' ? 'OFFLINE MODE - Working with local data only' : 
                 'Checking connection...'}
              </span>
            </div>
          </div>
          
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-green-700 mb-2">MamaPikin Connect</h1>
            <p className="text-xl text-gray-600">Sierra Leone Maternal & Child Health System</p>
            <p className="text-gray-500 mt-1">Protecting Mothers and Children in Sierra Leone</p>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 text-center border-l-4 border-green-500">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-2xl font-bold text-green-700">{totalPatients}</div>
              <div className="text-sm text-gray-500">Total Patients</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-l-4 border-pink-500">
              <div className="text-3xl mb-2">🤰</div>
              <div className="text-2xl font-bold text-pink-700">{pregnantCount}</div>
              <div className="text-sm text-gray-500">Pregnant Women</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-l-4 border-blue-500">
              <div className="text-3xl mb-2">🤱</div>
              <div className="text-2xl font-bold text-blue-700">{breastfeedingCount}</div>
              <div className="text-sm text-gray-500">Breastfeeding Mothers</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-l-4 border-teal-500">
              <div className="text-3xl mb-2">👶</div>
              <div className="text-2xl font-bold text-teal-700">{childCount}</div>
              <div className="text-sm text-gray-500">Children Under 5</div>
            </div>
          </div>
          
          {/* Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {pendingSyncCount > 0 && (
              <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <div className="font-bold text-yellow-800">{pendingSyncCount} Pending Sync</div>
                    <div className="text-sm text-yellow-600">Patients waiting to sync to cloud</div>
                    <Link href="/sync" className="text-xs text-yellow-700 underline mt-1 inline-block">Go to Sync Queue →</Link>
                  </div>
                </div>
              </div>
            )}
            
            {expiringSoon7.length > 0 && (
              <div className="bg-red-50 rounded-lg shadow p-4 border-l-4 border-red-500">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-bold text-red-800">{expiringSoon7.length} Accounts Expiring Soon</div>
                    <div className="text-sm text-red-600">Within 7 days</div>
                  </div>
                </div>
              </div>
            )}
            
            {expiringSoon30.length > 0 && expiringSoon7.length === 0 && (
              <div className="bg-orange-50 rounded-lg shadow p-4 border-l-4 border-orange-500">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="font-bold text-orange-800">{expiringSoon30.length} Accounts Expiring</div>
                    <div className="text-sm text-orange-600">Within 30 days</div>
                  </div>
                </div>
              </div>
            )}
            
            {recentRegistrations.length > 0 && (
              <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  <div>
                    <div className="font-bold text-green-800">{recentRegistrations.length} New Registrations</div>
                    <div className="text-sm text-green-600">In the last 7 days</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Features Grid */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {features.map((feature) => (
              <Link
                key={feature.path}
                href={feature.path}
                className={`${feature.color} rounded-lg p-4 transition-all transform hover:scale-105 shadow-md`}
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">{feature.name}</h3>
                  {feature.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
              </Link>
            ))}
          </div>
          
          {/* Recent Registrations Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-200">
              <h2 className="text-lg font-bold text-green-800">📋 Recent Patient Registrations</h2>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading patients...</div>
              ) : patients.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No patients registered yet.</p>
                  <Link href="/register" className="text-green-600 underline mt-2 inline-block">Register your first patient →</Link>
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patients.map((patient) => {
                      const daysLeft = patient.account_closing_date ? getDaysRemaining(patient.account_closing_date) : null
                      let statusColor = 'bg-green-100 text-green-800'
                      let statusText = 'Active'
                      
                      if (daysLeft !== null) {
                        if (daysLeft < 0) {
                          statusColor = 'bg-red-100 text-red-800'
                          statusText = 'Expired'
                        } else if (daysLeft < 7) {
                          statusColor = 'bg-red-100 text-red-800'
                          statusText = `${daysLeft} days left`
                        } else if (daysLeft < 30) {
                          statusColor = 'bg-orange-100 text-orange-800'
                          statusText = `${daysLeft} days left`
                        }
                      }
                      
                      let patientType = ''
                      if (patient.is_pregnant) patientType = '🤰 Pregnant'
                      else if (patient.is_breastfeeding) patientType = '🤱 Breastfeeding'
                      else if (patient.is_child_under_5) patientType = '👶 Child'
                      else patientType = '📝 General'
                      
                      return (
                        <tr key={patient.patient_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono">{patient.patient_id}</td>
                          <td className="px-4 py-3 text-sm font-medium">{patient.full_name}</td>
                          <td className="px-4 py-3 text-sm">{patientType}</td>
                          <td className="px-4 py-3 text-sm">{patient.phone || '-'}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(patient.registered_at)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {patients.length >= 20 && (
              <div className="px-6 py-3 bg-gray-50 text-center">
                <Link href="/patients" className="text-green-600 text-sm hover:underline">View all patients →</Link>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>© 2026 MamaPikin Connect - Sierra Leone Ministry of Health</p>
            <p className="mt-1">Offline-First Medical System | Protecting Mothers and Children</p>
          </div>
        </div>
      </div>
    </>
  )
}