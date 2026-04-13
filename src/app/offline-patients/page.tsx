'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

interface OfflinePatient {
  id: string
  full_name: string
  phone: string
  village: string
  district: string
  blood_group: string
  registered_at: string
  synced: boolean
}

export default function OfflinePatientsPage() {
  const [patients, setPatients] = useState<OfflinePatient[]>([])
  const [loading, setLoading] = useState(true)

  // Load patients from localStorage
  function loadPatients() {
    const existing = localStorage.getItem('offline_patients')
    const patientsList = existing ? JSON.parse(existing) : []
    setPatients(patientsList)
    setLoading(false)
  }

  useEffect(() => {
    loadPatients()
  }, [])

  // Clear all offline patients
  function clearAllPatients() {
    if (confirm('Are you sure you want to clear all offline patients? This cannot be undone.')) {
      localStorage.removeItem('offline_patients')
      loadPatients()
    }
  }

  // Sync a single patient to Supabase
  async function syncToCloud(patient: OfflinePatient) {
    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { error } = await supabase
        .from('patients')
        .insert([{
          id: patient.id,
          full_name: patient.full_name,
          phone: patient.phone,
          village: patient.village,
          district: patient.district,
          blood_group: patient.blood_group,
          created_at: patient.registered_at
        }])
      
      if (error) throw error
      
      // Remove from local storage after successful sync
      const existing = localStorage.getItem('offline_patients')
      const allPatients = existing ? JSON.parse(existing) : []
      const updatedPatients = allPatients.filter((p: OfflinePatient) => p.id !== patient.id)
      localStorage.setItem('offline_patients', JSON.stringify(updatedPatients))
      
      alert(`✅ Patient ${patient.full_name} synced to cloud!`)
      loadPatients()
      
    } catch (err) {
      console.error('Sync failed:', err)
      alert('❌ Failed to sync. Please check your internet connection.')
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
            <p className="text-gray-600">Offline Patients - Pending Sync</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Offline Registrations ({patients.length})
              </h2>
              {patients.length > 0 && (
                <button
                  onClick={clearAllPatients}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {loading ? (
              <p className="text-center py-8">Loading...</p>
            ) : patients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-3">📭</div>
                <p>No offline patients found.</p>
                <p className="text-sm mt-2">When you register patients offline, they will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map((patient) => (
                  <div key={patient.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">{patient.full_name}</p>
                      <p className="text-sm text-gray-600">ID: {patient.id}</p>
                      <p className="text-sm text-gray-600">Phone: {patient.phone || 'N/A'}</p>
                      <p className="text-sm text-gray-600">District: {patient.district || 'N/A'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Registered: {new Date(patient.registered_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        Pending Sync
                      </span>
                      <button
  id={`sync-btn-${patient.id}`}
  onClick={() => syncToCloud(patient)}
  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
>
  Sync to Cloud
</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>How to sync:</strong> When you have internet, click "Sync to Cloud" for each patient.
              Once synced, they will appear in your Supabase patients table.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}