// src/app/pharmacy/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'

// Define types locally to avoid import issues
type Medicine = {
  id: number
  medicine_id: string
  generic_name: string
  brand_name: string | null
  drug_category: string
  dosage_form: string
  strength: string | null
  unit: string
  pregnancy_safety_category: string | null
  requires_prescription: boolean
  is_controlled_substance: boolean
  minimum_stock_level: number
  reorder_level: number
  reorder_quantity: number
  is_active: boolean
}

type Inventory = {
  id: number
  inventory_id: string
  medicine_id: string
  batch_number: string
  expiry_date: string
  quantity_received: number
  quantity_current: number
  quantity_dispensed: number
  quantity_wasted: number
  unit_cost: number | null
  selling_price: number | null
  received_date: string
  storage_location: string | null
  status: string
}

type Patient = {
  patient_id: string
  full_name: string
  phone: string | null
  district: string | null
}

type Prescription = {
  prescription_id: string
  patient_id: string
  patient_name: string
  prescribed_by: string
  prescribed_by_role: string
  prescription_date: string
  diagnosis: string
  notes: string
  status: string
  created_at: string
}

type Dispensing = {
  dispensing_id: string
  patient_id: string
  patient_name: string
  medicine_name: string
  quantity_dispensed: number
  dispensed_by: string
  dispensing_date: string
}

// Helper function to safely get environment variables
const getSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

const getSupabaseAnonKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

// API helper functions with proper error handling
async function fetchFromSupabase<T>(endpoint: string): Promise<T[]> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    
    if (response.ok) {
      return await response.json()
    }
    return []
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error)
    return []
  }
}

async function postToSupabase(endpoint: string, data: unknown): Promise<boolean> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    
    return response.ok
  } catch (error) {
    console.error(`Error posting to ${endpoint}:`, error)
    return false
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getExpiryStatus(expiryDate: string): { color: string; text: string } {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysRemaining < 0) return { color: 'bg-red-100 text-red-800', text: 'Expired' }
  if (daysRemaining < 30) return { color: 'bg-orange-100 text-orange-800', text: `${daysRemaining} days left` }
  if (daysRemaining < 90) return { color: 'bg-yellow-100 text-yellow-800', text: `${daysRemaining} days left` }
  return { color: 'bg-green-100 text-green-800', text: 'Good' }
}

export default function PharmacyPage() {
  const { user, hasPermission } = useRBAC()
  const [activeTab, setActiveTab] = useState<'inventory' | 'prescribe' | 'dispense' | 'history'>('inventory')
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [dispensings, setDispensings] = useState<Dispensing[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    medicine_id: '',
    dosage: '',
    frequency: '',
    quantity: 1,
    diagnosis: ''
  })

  const canDispense = hasPermission('canDispenseMedication')

  useEffect(() => {
    loadData()
    loadPrescriptionsAndDispensings()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadData() {
    setLoading(true)
    const [meds, inv] = await Promise.all([
      fetchFromSupabase<Medicine>('medicines?is_active=eq.true&order=generic_name.asc'),
      fetchFromSupabase<Inventory>('inventory?status=eq.active&order=expiry_date.asc')
    ])
    setMedicines(meds)
    setInventory(inv)
    setLoading(false)
  }

  async function loadPrescriptionsAndDispensings() {
    const [pres, disps] = await Promise.all([
      fetchFromSupabase<Prescription>('prescriptions?order=created_at.desc&limit=50'),
      fetchFromSupabase<Dispensing>('dispensings?order=dispensing_date.desc&limit=50')
    ])
    setPrescriptions(pres)
    setDispensings(disps)
  }

  async function searchPatients(term: string): Promise<Patient[]> {
    if (term.length < 2) return []
    
    const results: Patient[] = []
    const seenIds = new Set<string>()
    
    // Search in localStorage
    const localPatients = localStorage.getItem('offline_patients')
    if (localPatients) {
      const localList = JSON.parse(localPatients)
      const filtered = localList.filter((p: Patient) => 
        p.full_name?.toLowerCase().includes(term.toLowerCase()) ||
        p.patient_id?.toLowerCase().includes(term.toLowerCase())
      )
      filtered.forEach((p: Patient) => {
        if (!seenIds.has(p.patient_id)) {
          seenIds.add(p.patient_id)
          results.push(p)
        }
      })
    }
    
    return results
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        const results = await searchPatients(searchTerm)
        setSearchResults(results)
        setShowDropdown(true)
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setShowDropdown(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    if (name === 'quantity') {
      setFormData({ ...formData, [name]: parseInt(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  async function handleSubmitPrescription(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) {
      setMessage('❌ Please select a patient')
      setMessageType('error')
      return
    }
    if (!formData.medicine_id) {
      setMessage('❌ Please select a medicine')
      setMessageType('error')
      return
    }
    if (!formData.dosage) {
      setMessage('❌ Please enter dosage')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const prescriptionId = `RX-${selectedPatient.patient_id}-${Date.now()}`
      
      const prescription = {
        prescription_id: prescriptionId,
        patient_id: selectedPatient.patient_id,
        patient_name: selectedPatient.full_name,
        prescribed_by: user?.full_name || user?.email || 'Unknown',
        prescribed_by_role: user?.role || 'Unknown',
        prescription_date: new Date().toISOString().split('T')[0],
        diagnosis: formData.diagnosis,
        notes: '',
        status: 'pending'
      }
      
      const success = await postToSupabase('prescriptions', prescription)
      
      if (success) {
        setMessage('✅ Prescription created successfully')
        setMessageType('success')
        
        setSelectedPatient(null)
        setFormData({
          medicine_id: '',
          dosage: '',
          frequency: '',
          quantity: 1,
          diagnosis: ''
        })
        await loadPrescriptionsAndDispensings()
      } else {
        setMessage('❌ Failed to create prescription')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('❌ Error creating prescription')
      setMessageType('error')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const selectedMedicine = medicines.find(m => m.medicine_id === formData.medicine_id)
  const totalStock = inventory
    .filter(i => i.medicine_id === selectedMedicine?.medicine_id)
    .reduce((sum, i) => sum + i.quantity_current, 0)
  const isLowStock = selectedMedicine && totalStock <= (selectedMedicine.reorder_level || 10)

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Pharmacy Management</h1>
            <p className="text-gray-600">Manage medicines, prescriptions, and dispensing</p>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-800' :
              messageType === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'inventory' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              📦 Inventory ({inventory.length})
            </button>
            <button
              onClick={() => setActiveTab('prescribe')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'prescribe' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              📝 Prescribe
            </button>
            <button
              onClick={() => setActiveTab('dispense')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'dispense' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              💊 Dispense Queue ({prescriptions.filter(p => p.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'history' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              📋 History ({dispensings.length})
            </button>
          </div>
          
          {/* Inventory Tab */}
{activeTab === 'inventory' && (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    {loading ? (
      <div className="p-8 text-center text-gray-500">Loading inventory...</div>
    ) : inventory.length === 0 ? (
      <div className="p-8 text-center text-gray-500">No inventory items found.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventory.map((item) => {
              const medicine = medicines.find(m => m.medicine_id === item.medicine_id)
              const expiryStatus = getExpiryStatus(item.expiry_date)
              const isLow = item.quantity_current <= (medicine?.reorder_level || 10)
              
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{medicine?.generic_name || item.medicine_id}</div>
                    <div className="text-xs text-gray-500">{medicine?.brand_name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.batch_number}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                      {item.quantity_current} {medicine?.unit || 'units'}
                    </span>
                    {isLow && <div className="text-xs text-red-500">Reorder at {medicine?.reorder_level}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(item.expiry_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${expiryStatus.color}`}>
                      {expiryStatus.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.storage_location || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
          
          {/* Prescribe Tab */}
          {activeTab === 'prescribe' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Create Prescription</h2>
              
              {/* Patient Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Select Patient</label>
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
                      placeholder="Search by name or patient ID (min. 2 characters)..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {showDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.length === 0 && searchTerm.length >= 2 ? (
                        <div className="p-3 text-gray-500 text-center">No patients found.</div>
                      ) : (
                        searchResults.map((patient) => (
                          <div
                            key={patient.patient_id}
                            onClick={() => handleSelectPatient(patient)}
                            className="p-3 hover:bg-green-50 cursor-pointer border-b"
                          >
                            <div className="font-medium text-gray-800">{patient.full_name}</div>
                            <div className="text-sm text-gray-500">
                              ID: {patient.patient_id} | 📞 {patient.phone || 'No phone'} | 📍 {patient.district || 'No district'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {selectedPatient && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-green-800">{selectedPatient.full_name}</div>
                        <div className="text-sm text-gray-600">
                          ID: {selectedPatient.patient_id} | 📞 {selectedPatient.phone || 'N/A'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(null)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Prescription Form */}
              {selectedPatient && (
                <form onSubmit={handleSubmitPrescription}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Medicine *</label>
                      <select
                        name="medicine_id"
                        value={formData.medicine_id}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="">Select medicine</option>
                        {medicines.map(med => (
                          <option key={med.medicine_id} value={med.medicine_id}>
                            {med.generic_name} {med.brand_name ? `(${med.brand_name})` : ''}
                          </option>
                        ))}
                      </select>
                      {isLowStock && selectedMedicine && (
                        <p className="text-xs text-red-500 mt-1">⚠️ Low stock alert</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Dosage *</label>
                      <input
                        type="text"
                        name="dosage"
                        value={formData.dosage}
                        onChange={handleChange}
                        placeholder="e.g., 500mg, 10mL"
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Frequency *</label>
                      <select
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="">Select frequency</option>
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Four times daily">Four times daily</option>
                        <option value="Every 6 hours">Every 6 hours</option>
                        <option value="Every 8 hours">Every 8 hours</option>
                        <option value="As needed">As needed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Quantity *</label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-medium mb-1">Diagnosis</label>
                      <input
                        type="text"
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Malaria, UTI, Hypertension"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {loading ? 'Creating...' : 'Create Prescription'}
                  </button>
                </form>
              )}
            </div>
          )}
          
          {/* Dispense Queue Tab */}
          {activeTab === 'dispense' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {prescriptions.filter(p => p.status === 'pending').length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No pending prescriptions to dispense.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prescription</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {prescriptions.filter(p => p.status === 'pending').map((pres) => (
                        <tr key={pres.prescription_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(pres.prescription_date)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{pres.patient_name}</div>
                            <div className="text-xs text-gray-500">{pres.patient_id}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">RX-{pres.prescription_id.slice(-8)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setMessage('Dispense feature will be implemented soon')
                                setMessageType('info')
                                setTimeout(() => setMessage(''), 3000)
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Dispense
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {dispensings.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No dispensing history found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispensed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dispensings.map((disp) => (
                        <tr key={disp.dispensing_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(disp.dispensing_date)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{disp.patient_name}</div>
                            <div className="text-xs text-gray-500">{disp.patient_id}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{disp.medicine_name}</td>
                          <td className="px-4 py-3 text-sm">{disp.quantity_dispensed}</td>
                          <td className="px-4 py-3 text-sm">{disp.dispensed_by}</td>
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