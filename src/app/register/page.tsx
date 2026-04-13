'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

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
  synced_to_cloud: boolean  // false = needs sync, true = already in cloud
}

// Save to localStorage (always)
function saveToLocalStorage(patientData: PatientData) {
  const existing = localStorage.getItem('offline_patients')
  const patients = existing ? JSON.parse(existing) : []
  patients.push(patientData)
  localStorage.setItem('offline_patients', JSON.stringify(patients))
  console.log('💾 Saved to localStorage:', patientData.patient_id)
}

// Test Supabase connection (your working function)
async function testSupabaseConnection(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return false
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    return true
  } catch { return false }
}

// Save to Supabase (cloud)
async function saveToSupabase(patientData: PatientData): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials')
    return false
  }
  
  // IMPORTANT: Remove the 'id' field if it exists (let Supabase auto-generate it)
  const { id, ...dataWithoutId } = patientData as any
  
  console.log('📤 Saving to Supabase (without id):', dataWithoutId)
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(dataWithoutId)  // ← Send without 'id'
    })
    
    if (response.ok) {
      console.log('✅ Saved to Supabase!')
      return true
    } else {
      const errorText = await response.text()
      console.error('❌ Supabase error:', response.status, errorText)
      return false
    }
  } catch (error) {
    console.error('❌ Network error:', error)
    return false
  }
}

export default function RegisterPage() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  
  const [formData, setFormData] = useState({
    full_name: '', date_of_birth: '', phone: '', village: '', district: '',
    blood_group: '', allergies: '', guardian_name: '', guardian_phone: '', is_pregnant: false,
  })

  // Your working online/offline detection - UNCHANGED
  useEffect(() => {
    async function checkConnection() {
      const isConnected = await testSupabaseConnection()
      setConnectionStatus(isConnected ? 'online' : 'offline')
    }
    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    window.addEventListener('online', () => checkConnection())
    window.addEventListener('offline', () => setConnectionStatus('offline'))
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', () => checkConnection())
      window.removeEventListener('offline', () => setConnectionStatus('offline'))
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
  }

  function generatePatientId() {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `MCH-KAB-${year}-${random}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      const patientId = generatePatientId()
      const patientData: PatientData = {
        patient_id: patientId,
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth || null,
        phone: formData.phone || null,
        village: formData.village || null,
        district: formData.district || null,
        blood_group: formData.blood_group || null,
        allergies: formData.allergies || null,
        guardian_name: formData.guardian_name || null,
        guardian_phone: formData.guardian_phone || null,
        is_pregnant: formData.is_pregnant,
        registered_at: new Date().toISOString(),
        synced_to_cloud: false,
      }
      
      // 1. Always save to localStorage first (offline backup)
      saveToLocalStorage(patientData)
      
      let cloudSaved = false
      // 2. If online, try to save to Supabase immediately
      if (connectionStatus === 'online') {
        cloudSaved = await saveToSupabase(patientData)
        if (cloudSaved) {
          // Update localStorage record to mark as synced
          const existing = localStorage.getItem('offline_patients')
          if (existing) {
            const patients = JSON.parse(existing)
            const updated = patients.map((p: PatientData) =>
              p.patient_id === patientId ? { ...p, synced_to_cloud: true } : p
            )
            localStorage.setItem('offline_patients', JSON.stringify(updated))
          }
        }
      }
      
      // 3. Show appropriate message
      if (cloudSaved) {
        setMessageType('success')
        setMessage(`✅ Patient registered! ID: ${patientId}\n☁️ Saved to cloud and local storage.`)
      } else if (connectionStatus === 'online') {
        setMessageType('warning')
        setMessage(`⚠️ Patient saved locally! ID: ${patientId}\n🌐 Online but cloud save failed. It will appear in Sync Queue.`)
      } else {
        setMessageType('success')
        setMessage(`✅ Patient saved OFFLINE! ID: ${patientId}\n📡 Saved to local storage. Go to Sync Page when online.`)
      }
      
      // Reset form
      setFormData({
        full_name: '', date_of_birth: '', phone: '', village: '', district: '',
        blood_group: '', allergies: '', guardian_name: '', guardian_phone: '', is_pregnant: false,
      })
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessageType('error')
      setMessage(`❌ Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Your working status banner (unchanged)
  const getBannerStyle = () => {
    if (connectionStatus === 'online') return 'bg-green-100 text-green-800 border-green-500'
    if (connectionStatus === 'offline') return 'bg-red-100 text-red-800 border-red-500'
    return 'bg-gray-100 text-gray-800 border-gray-500'
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className={`mb-6 p-5 rounded-lg text-center border-2 ${getBannerStyle()}`}>
            <div className="text-4xl mb-2">{connectionStatus === 'online' ? '✅' : connectionStatus === 'offline' ? '📡' : '⏳'}</div>
            <div className="text-xl font-bold">{connectionStatus === 'online' ? 'ONLINE MODE' : connectionStatus === 'offline' ? 'OFFLINE MODE' : 'CHECKING...'}</div>
            <div className="text-sm mt-2">{connectionStatus === 'online' ? 'Connected to Supabase. Data saves to cloud.' : connectionStatus === 'offline' ? 'No internet. Data saved locally. Sync when online.' : 'Detecting...'}</div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
            <p className="text-gray-600">Patient Registration - SierraCare</p>
          </div>
          
          {message && (
            <div className={`mb-6 p-4 rounded-lg whitespace-pre-line ${
              messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' 
              : messageType === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-400'
              : 'bg-red-100 text-red-700 border border-red-400'
            }`}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            {/* Form fields - same as before, shortened for brevity */}
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">Full Name <span className="text-red-500">*</span></label>
            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Fatmata Kamara" /></div>
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">Date of Birth</label>
            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., 076123456" /></div>
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">Village / Town</label>
            <input type="text" name="village" value={formData.village} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">District</label>
            <select name="district" value={formData.district} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Select District</option>
              <option value="Kailahun">Kailahun</option><option value="Kenema">Kenema</option><option value="Kono">Kono</option>
              <option value="Bombali">Bombali</option><option value="Kambia">Kambia</option><option value="Koinadugu">Koinadugu</option>
              <option value="Tonkolili">Tonkolili</option><option value="Port Loko">Port Loko</option>
              <option value="Western Area Urban">Western Area Urban</option><option value="Western Area Rural">Western Area Rural</option>
              <option value="Bo">Bo</option><option value="Bonthe">Bonthe</option><option value="Pujehun">Pujehun</option><option value="Moyamba">Moyamba</option>
            </select></div>
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">Blood Group</label>
            <select name="blood_group" value={formData.blood_group} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
              <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
            </select></div>
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">Allergies</label>
            <input type="text" name="allergies" value={formData.allergies} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Penicillin" /></div>
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">Guardian / Next of Kin</label>
            <input type="text" name="guardian_name" value={formData.guardian_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            <div className="mb-4"><label className="block text-gray-700 font-medium mb-2">Guardian Phone</label>
            <input type="tel" name="guardian_phone" value={formData.guardian_phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            <div className="mb-6"><label className="flex items-center"><input type="checkbox" name="is_pregnant" checked={formData.is_pregnant} onChange={handleChange} className="w-4 h-4 text-green-600" /><span className="ml-2 text-gray-700">Patient is pregnant</span></label></div>
            <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>{loading ? 'Registering...' : 'Register Patient'}</button>
          </form>
        </div>
      </div>
    </>
  )
}