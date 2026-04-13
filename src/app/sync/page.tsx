'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

// Type definition for patient data
type PatientData = {
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
  registered_at: string
  synced_to_cloud: boolean
}

// Check if Supabase is reachable
async function isSupabaseReachable(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) return false
  
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    return true
  } catch {
    return false
  }
}

// Sync a single patient to Supabase
async function syncPatientToSupabase(patientData: PatientData): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) return false
  
  try {
    // Remove id field if exists (let Supabase auto-generate)
    const { id, ...dataWithoutId } = patientData as any
    
    const response = await fetch(`${supabaseUrl}/rest/v1/patients`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(dataWithoutId)
    })
    
    return response.ok
  } catch (error) {
    console.error('Sync error:', error)
    return false
  }
}

export default function SyncPage() {
  const [pendingPatients, setPendingPatients] = useState<PatientData[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isOnline, setIsOnline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  // Load pending patients from localStorage
  const loadPendingPatients = () => {
    const existing = localStorage.getItem('offline_patients')
    if (existing) {
      const allPatients = JSON.parse(existing)
      // Only show patients that are NOT synced to cloud
      const unsynced = allPatients.filter((p: PatientData) => !p.synced_to_cloud)
      setPendingPatients(unsynced)
    } else {
      setPendingPatients([])
    }
  }

  // Check online status and load patients
  useEffect(() => {
    async function checkAndLoad() {
      const online = await isSupabaseReachable()
      setIsOnline(online)
      loadPendingPatients()
    }
    
    checkAndLoad()
    
    // Check every 10 seconds
    const interval = setInterval(checkAndLoad, 10000)
    
    // Also listen to online/offline events
    window.addEventListener('online', () => checkAndLoad())
    window.addEventListener('offline', () => setIsOnline(false))
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', () => checkAndLoad())
      window.removeEventListener('offline', () => setIsOnline(false))
    }
  }, [])

  // Select or deselect all patients
  const toggleSelectAll = () => {
    if (selectedIds.size === pendingPatients.length && pendingPatients.length > 0) {
      // Deselect all
      setSelectedIds(new Set())
    } else {
      // Select all
      setSelectedIds(new Set(pendingPatients.map(p => p.patient_id)))
    }
  }

  // Select or deselect a single patient
  const toggleSelect = (patientId: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(patientId)) {
      newSet.delete(patientId)
    } else {
      newSet.add(patientId)
    }
    setSelectedIds(newSet)
  }

  // Sync selected patients
  const syncSelected = async () => {
    if (!isOnline) {
      setMessage('❌ Cannot sync: You are offline. Please connect to the internet.')
      setMessageType('error')
      return
    }
    
    if (selectedIds.size === 0) {
      setMessage('⚠️ Please select at least one patient to sync.')
      setMessageType('warning')
      return
    }
    
    const patientsToSync = pendingPatients.filter(p => selectedIds.has(p.patient_id))
    await performSync(patientsToSync)
  }

  // Sync ALL pending patients
  const syncAll = async () => {
    if (!isOnline) {
      setMessage('❌ Cannot sync: You are offline. Please connect to the internet.')
      setMessageType('error')
      return
    }
    
    if (pendingPatients.length === 0) {
      setMessage('⚠️ No pending patients to sync.')
      setMessageType('warning')
      return
    }
    
    await performSync(pendingPatients)
  }

  // Perform the actual sync operation
  const performSync = async (patients: PatientData[]) => {
    setIsSyncing(true)
    setMessage('')
    setSyncProgress({ current: 0, total: patients.length, success: 0, failed: 0 })
    
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i]
      const success = await syncPatientToSupabase(patient)
      
      if (success) {
        successCount++
        // Update localStorage: mark this patient as synced
        const all = JSON.parse(localStorage.getItem('offline_patients') || '[]')
        const updated = all.map((p: PatientData) =>
          p.patient_id === patient.patient_id ? { ...p, synced_to_cloud: true } : p
        )
        localStorage.setItem('offline_patients', JSON.stringify(updated))
      } else {
        failCount++
      }
      
      setSyncProgress({
        current: i + 1,
        total: patients.length,
        success: successCount,
        failed: failCount
      })
    }
    
    // Refresh the pending list
    loadPendingPatients()
    setSelectedIds(new Set())
    
    if (successCount > 0 && failCount === 0) {
      setMessage(`✅ Successfully synced ${successCount} patient(s) to the cloud!`)
      setMessageType('success')
    } else if (successCount > 0 && failCount > 0) {
      setMessage(`⚠️ Synced ${successCount} successfully, ${failCount} failed. Please try again for failed ones.`)
      setMessageType('warning')
    } else {
      setMessage(`❌ Failed to sync ${failCount} patient(s). Check your connection and try again.`)
      setMessageType('error')
    }
    
    setIsSyncing(false)
    
    // Clear progress after 3 seconds
    setTimeout(() => {
      setSyncProgress({ current: 0, total: 0, success: 0, failed: 0 })
    }, 3000)
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-green-700">Sync Offline Patients</h1>
              <p className="text-gray-600">Synchronize pending patient records to the cloud database</p>
            </div>

            {/* Online/Offline Status */}
            <div className={`p-3 rounded-lg mb-4 ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{isOnline ? '✅' : '❌'}</span>
                <span className="font-medium">
                  {isOnline ? 'Online - Ready to sync' : 'Offline - Connect to internet to sync'}
                </span>
              </div>
            </div>

            {/* Sync Progress Bar */}
            {syncProgress.total > 0 && (
              <div className="mb-4 p-3 bg-blue-100 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Syncing: {syncProgress.current} / {syncProgress.total}</span>
                  <span>✅ Success: {syncProgress.success} | ❌ Failed: {syncProgress.failed}</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`mb-4 p-3 rounded-lg ${
                messageType === 'success' ? 'bg-green-100 text-green-800' :
                messageType === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mb-4 flex flex-wrap gap-3">
              <button
                onClick={syncAll}
                disabled={isSyncing || !isOnline || pendingPatients.length === 0}
                className={`px-4 py-2 rounded-lg text-white font-medium ${
                  isSyncing || !isOnline || pendingPatients.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                🔄 Sync All ({pendingPatients.length})
              </button>
              
              <button
                onClick={syncSelected}
                disabled={isSyncing || !isOnline || selectedIds.size === 0}
                className={`px-4 py-2 rounded-lg text-white font-medium ${
                  isSyncing || !isOnline || selectedIds.size === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                ✓ Sync Selected ({selectedIds.size})
              </button>
            </div>

            {/* Patients Table */}
            {pendingPatients.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-lg">No pending patients to sync</p>
                <p className="text-sm">All patient records are already in the cloud.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === pendingPatients.length && pendingPatients.length > 0}
                          onChange={toggleSelectAll}
                          disabled={isSyncing}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="border p-3 text-left">Patient ID</th>
                      <th className="border p-3 text-left">Full Name</th>
                      <th className="border p-3 text-left">Phone</th>
                      <th className="border p-3 text-left">District</th>
                      <th className="border p-3 text-left">Registered</th>
                      <th className="border p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPatients.map(patient => (
                      <tr key={patient.patient_id} className="hover:bg-gray-50">
                        <td className="border p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(patient.patient_id)}
                            onChange={() => toggleSelect(patient.patient_id)}
                            disabled={isSyncing}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="border p-3 font-mono text-sm">{patient.patient_id}</td>
                        <td className="border p-3 font-medium">{patient.full_name}</td>
                        <td className="border p-3">{patient.phone || '-'}</td>
                        <td className="border p-3">{patient.district || '-'}</td>
                        <td className="border p-3 text-sm">{formatDate(patient.registered_at)}</td>
                        <td className="border p-3 text-center">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            Pending Sync
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Info */}
            <div className="mt-4 text-sm text-gray-500 text-center">
              💾 Patients are stored locally until synced. Sync when online to backup to cloud.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}