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

// Check if Supabase is reachable
async function isSupabaseReachable(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) return false
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    return response.ok
  } catch {
    return false
  }
}

// Check if patient already exists in Supabase (by patient_id)
async function patientExistsInCloud(patientId: string): Promise<{ exists: boolean; id?: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) return { exists: false }
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?patient_id=eq.${patientId}&select=id,patient_id`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data && data.length > 0) {
        return { exists: true, id: data[0].id }
      }
    }
    return { exists: false }
  } catch (error) {
    console.error('Error checking patient existence:', error)
    return { exists: false }
  }
}

// Sync a single patient to Supabase (only if not exists)
async function syncPatientToSupabase(patientData: PatientData): Promise<{ success: boolean; alreadyExists: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, alreadyExists: false, error: 'Missing Supabase credentials' }
  }
  
  // FIRST: Check if patient already exists in cloud
  const { exists, id } = await patientExistsInCloud(patientData.patient_id)
  
  if (exists) {
    console.log(`✅ Patient ${patientData.patient_id} already exists in cloud. Marking as synced.`)
    return { success: true, alreadyExists: true }
  }
  
  // If not exists, proceed with insert
  try {
    const { id: _, ...dataWithoutId } = patientData as any
    
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
    
    if (response.ok) {
      console.log(`✅ Patient ${patientData.patient_id} synced to cloud!`)
      return { success: true, alreadyExists: false }
    } else {
      const errorText = await response.text()
      console.error(`❌ Sync error for ${patientData.patient_id}:`, response.status, errorText)
      return { success: false, alreadyExists: false, error: `${response.status}: ${errorText}` }
    }
  } catch (error) {
    console.error(`❌ Network error for ${patientData.patient_id}:`, error)
    return { success: false, alreadyExists: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

export default function SyncPage() {
  const [pendingPatients, setPendingPatients] = useState<PatientData[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isOnline, setIsOnline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, success: 0, failed: 0, alreadyExists: 0 })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  // Load pending patients from localStorage (only those not synced)
  const loadPendingPatients = () => {
    const existing = localStorage.getItem('offline_patients')
    if (existing) {
      const allPatients = JSON.parse(existing)
      // Show patients that are NOT synced to cloud
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
    
    const interval = setInterval(checkAndLoad, 10000)
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
      setSelectedIds(new Set())
    } else {
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

  // Perform the actual sync operation with duplicate detection
  const performSync = async (patients: PatientData[]) => {
    setIsSyncing(true)
    setMessage('')
    setSyncProgress({ current: 0, total: patients.length, success: 0, failed: 0, alreadyExists: 0 })
    
    let successCount = 0
    let failCount = 0
    let alreadyExistsCount = 0
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i]
      const result = await syncPatientToSupabase(patient)
      
      if (result.success) {
        if (result.alreadyExists) {
          alreadyExistsCount++
          console.log(`📌 Patient ${patient.patient_id} already exists in cloud - marking as synced`)
        } else {
          successCount++
        }
        
        // Update localStorage: mark this patient as synced
        const all = JSON.parse(localStorage.getItem('offline_patients') || '[]')
        const updated = all.map((p: PatientData) =>
          p.patient_id === patient.patient_id ? { ...p, synced_to_cloud: true } : p
        )
        localStorage.setItem('offline_patients', JSON.stringify(updated))
      } else {
        failCount++
        console.error(`❌ Failed to sync ${patient.patient_id}: ${result.error}`)
      }
      
      setSyncProgress({
        current: i + 1,
        total: patients.length,
        success: successCount,
        failed: failCount,
        alreadyExists: alreadyExistsCount
      })
    }
    
    // Refresh the pending list
    loadPendingPatients()
    setSelectedIds(new Set())
    
    // Build success message
    let messageText = ''
    if (successCount > 0 && alreadyExistsCount > 0 && failCount === 0) {
      messageText = `✅ Synced ${successCount} new patient(s). 📌 ${alreadyExistsCount} patient(s) already existed in cloud and were marked as synced.`
    } else if (successCount > 0 && failCount === 0 && alreadyExistsCount === 0) {
      messageText = `✅ Successfully synced ${successCount} patient(s) to the cloud!`
    } else if (successCount > 0 && alreadyExistsCount > 0 && failCount > 0) {
      messageText = `⚠️ Synced ${successCount} new, ${alreadyExistsCount} already existed, ${failCount} failed. Please try again for failed ones.`
    } else if (alreadyExistsCount > 0 && successCount === 0 && failCount === 0) {
      messageText = `📌 ${alreadyExistsCount} patient(s) already existed in cloud. They have been removed from sync queue.`
    } else if (failCount > 0 && successCount === 0 && alreadyExistsCount === 0) {
      messageText = `❌ Failed to sync ${failCount} patient(s). Check your connection and try again.`
    } else {
      messageText = `✅ Sync complete: ${successCount} new, ${alreadyExistsCount} already existed, ${failCount} failed.`
    }
    
    setMessage(messageText)
    setMessageType(successCount > 0 || alreadyExistsCount > 0 ? 'success' : 'error')
    
    setIsSyncing(false)
    
    // Clear progress after 5 seconds
    setTimeout(() => {
      setSyncProgress({ current: 0, total: 0, success: 0, failed: 0, alreadyExists: 0 })
    }, 5000)
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
              <p className="text-sm text-blue-600 mt-1">⚠️ Duplicate detection: System will check if patient already exists before syncing</p>
            </div>

            {/* Online/Offline Status */}
            <div className={`p-3 rounded-lg mb-4 ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{isOnline ? '✅' : '❌'}</span>
                <span className="font-medium">
                  {isOnline ? 'Online - Ready to sync (duplicate detection active)' : 'Offline - Connect to internet to sync'}
                </span>
              </div>
            </div>

            {/* Sync Progress Bar */}
            {syncProgress.total > 0 && (
              <div className="mb-4 p-3 bg-blue-100 rounded-lg">
                <div className="flex justify-between text-sm mb-1 flex-wrap gap-2">
                  <span>📊 Syncing: {syncProgress.current} / {syncProgress.total}</span>
                  <span>✅ New: {syncProgress.success}</span>
                  <span>📌 Already existed: {syncProgress.alreadyExists}</span>
                  <span>❌ Failed: {syncProgress.failed}</span>
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
                <p className="text-sm">All patient records are already in the cloud or nothing to sync.</p>
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
              <p>💾 Patients are stored locally until synced. Sync when online to backup to cloud.</p>
              <p className="text-xs text-blue-600 mt-1">🔍 Duplicate detection: System checks cloud before syncing to prevent duplicates.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}