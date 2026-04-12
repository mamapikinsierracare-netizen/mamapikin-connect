'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/auth'
import Navigation from '@/components/Navigation'

interface Patient {
  id: string
  full_name: string
  phone: string
}

interface Medicine {
  id: string
  generic_name: string
  brand_name: string
  category: string
  dosage_form: string
  strength: string
}

export default function PharmacyPage() {
  // Patient search
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)
  
  // Medicines
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [selectedMedicine, setSelectedMedicine] = useState('')
  const [inventory, setInventory] = useState<any>(null)
  
  // Prescription form
  const [prescription, setPrescription] = useState({
    dosage: '',
    frequency: '',
    duration_days: '',
    quantity: '',
    instructions: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [prescriptions, setPrescriptions] = useState<any[]>([])

  // Load medicines on page load
  useEffect(() => {
    loadMedicines()
  }, [])

  async function loadMedicines() {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .order('generic_name')
    
    if (!error && data) {
      setMedicines(data)
    }
  }

  async function loadInventory(medicineId: string) {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('medicine_id', medicineId)
      .eq('status', 'Active')
      .gt('current_stock', 0)
      .order('expiry_date')
    
    if (!error && data && data.length > 0) {
      setInventory(data[0])
    } else {
      setInventory(null)
    }
  }

  async function loadPatientPrescriptions(patientId: string) {
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        medicines (generic_name, strength)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setPrescriptions(data)
    }
  }

  async function searchPatients() {
    if (searchTerm.length < 2) return
    
    setSearching(true)
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .ilike('full_name', `%${searchTerm}%`)
      .limit(10)
    
    if (!error && data) {
      setPatients(data)
    }
    setSearching(false)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value)
    if (e.target.value.length >= 2) {
      searchPatients()
    } else {
      setPatients([])
    }
  }

  async function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setPatients([])
    await loadPatientPrescriptions(patient.id)
  }

  async function handleMedicineChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const medicineId = e.target.value
    setSelectedMedicine(medicineId)
    if (medicineId) {
      await loadInventory(medicineId)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedPatient) {
      setMessageType('error')
      setMessage('Please select a patient first')
      return
    }
    
    if (!selectedMedicine) {
      setMessageType('error')
      setMessage('Please select a medicine')
      return
    }
    
    if (!inventory || inventory.current_stock < parseInt(prescription.quantity)) {
      setMessageType('error')
      setMessage('❌ Insufficient stock! Available: ' + (inventory?.current_stock || 0))
      return
    }
    
    setLoading(true)
    setMessage('')
    
    try {
      // Create prescription
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert([{
          patient_id: selectedPatient.id,
          medicine_id: selectedMedicine,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration_days: parseInt(prescription.duration_days),
          quantity: parseInt(prescription.quantity),
          instructions: prescription.instructions || null,
          status: 'Dispensed',
          prescribed_by: 'nurse',
          dispensed_by: 'pharmacist',
          dispensed_at: new Date().toISOString()
        }])
        .select()
      
      if (prescriptionError) throw prescriptionError
      
      // Update inventory
      const newStock = inventory.current_stock - parseInt(prescription.quantity)
      await supabase
        .from('inventory')
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', inventory.id)
      
      // Log transaction
      await supabase
        .from('stock_transactions')
        .insert([{
          inventory_id: inventory.id,
          transaction_type: 'Dispensed',
          quantity_change: -parseInt(prescription.quantity),
          previous_stock: inventory.current_stock,
          new_stock: newStock,
          performed_by: 'pharmacist',
          prescription_id: prescriptionData?.[0]?.id
        }])
      
      setMessageType('success')
      setMessage(`✅ Prescription dispensed! Remaining stock: ${newStock}`)
      
      // Reset form
      setPrescription({ dosage: '', frequency: '', duration_days: '', quantity: '', instructions: '' })
      setSelectedMedicine('')
      setInventory(null)
      
      // Reload prescriptions
      await loadPatientPrescriptions(selectedPatient.id)
      
      // Check low stock alert
      if (newStock <= (inventory.reorder_level || 5)) {
        setMessageType('warning')
        setMessage(`⚠️ Low stock alert! Only ${newStock} remaining. Please reorder.`)
      }
      
    } catch (err: any) {
      setMessageType('error')
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handlePrescriptionChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setPrescription(prev => ({ ...prev, [name]: value }))
    
    // Auto-calculate quantity if dosage, frequency, duration provided
    if (name === 'dosage' || name === 'frequency' || name === 'duration_days') {
      // Simple calculation: if frequency is "daily" and duration is days, quantity = duration
      // This is a placeholder for more complex logic
    }
  }

  // Get stock alert color
  function getStockColor(stock: number, reorderLevel: number): string {
    if (stock <= 0) return 'text-red-600 font-bold'
    if (stock <= reorderLevel) return 'text-orange-600 font-bold'
    return 'text-green-600'
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
            <p className="text-gray-600">Pharmacy - Prescriptions & Inventory</p>
          </div>
          
          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-700' :
              messageType === 'warning' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}
          
          {/* Patient Search */}
          {!selectedPatient ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Step 1: Find Patient</h2>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by patient name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {searching && <p className="text-gray-500 mt-2">Searching...</p>}
              
              {patients.length > 0 && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  {patients.map(patient => (
                    <div
                      key={patient.id}
                      onClick={() => selectPatient(patient)}
                      className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <p className="font-medium">{patient.full_name}</p>
                      <p className="text-sm text-gray-500">ID: {patient.id} | Phone: {patient.phone || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected Patient */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-600">Selected Patient</p>
                    <p className="font-bold text-lg">{selectedPatient.full_name}</p>
                    <p className="text-sm">ID: {selectedPatient.id}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPatient(null)
                      setPrescriptions([])
                    }}
                    className="text-green-600 hover:text-green-800"
                  >
                    Change Patient
                  </button>
                </div>
              </div>
              
              {/* Prescription History */}
              {prescriptions.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Prescription History</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {prescriptions.map((rx: any) => (
                      <div key={rx.id} className="p-2 bg-gray-50 rounded flex justify-between items-center">
                        <div>
                          <p className="font-medium">{rx.medicines?.generic_name} {rx.medicines?.strength}</p>
                          <p className="text-sm text-gray-500">{rx.dosage} - {rx.frequency} for {rx.duration_days} days</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{new Date(rx.created_at).toLocaleDateString()}</p>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {rx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Prescription Form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Step 2: New Prescription</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 mb-1">Select Medicine *</label>
                    <select
                      value={selectedMedicine}
                      onChange={handleMedicineChange}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Choose medicine...</option>
                      {medicines.map(med => (
                        <option key={med.id} value={med.id}>
                          {med.generic_name} - {med.strength} ({med.dosage_form})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1">Available Stock</label>
                    <div className="px-3 py-2 border rounded-lg bg-gray-50">
                      {inventory ? (
                        <span className={getStockColor(inventory.current_stock, inventory.reorder_level)}>
                          {inventory.current_stock} units (Reorder at {inventory.reorder_level})
                        </span>
                      ) : (
                        <span className="text-red-600">Out of stock or not found</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1">Dosage *</label>
                    <input
                      type="text"
                      name="dosage"
                      value={prescription.dosage}
                      onChange={handlePrescriptionChange}
                      placeholder="e.g., 500mg"
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1">Frequency *</label>
                    <select
                      name="frequency"
                      value={prescription.frequency}
                      onChange={handlePrescriptionChange}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select...</option>
                      <option value="Once daily">Once daily</option>
                      <option value="Twice daily">Twice daily (every 12 hours)</option>
                      <option value="Three times daily">Three times daily (every 8 hours)</option>
                      <option value="Four times daily">Four times daily (every 6 hours)</option>
                      <option value="Every 4 hours">Every 4 hours</option>
                      <option value="Every 6 hours">Every 6 hours</option>
                      <option value="Every 8 hours">Every 8 hours</option>
                      <option value="As needed">As needed (PRN)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1">Duration (days) *</label>
                    <input
                      type="number"
                      name="duration_days"
                      value={prescription.duration_days}
                      onChange={handlePrescriptionChange}
                      placeholder="e.g., 7"
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      name="quantity"
                      value={prescription.quantity}
                      onChange={handlePrescriptionChange}
                      placeholder="Number of units"
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-1">Instructions (optional)</label>
                    <textarea
                      name="instructions"
                      value={prescription.instructions}
                      onChange={handlePrescriptionChange}
                      placeholder="e.g., Take with food, avoid alcohol..."
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !inventory}
                  className={`w-full py-3 rounded-lg text-white font-medium ${
                    loading || !inventory ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? 'Processing...' : 'Dispense Prescription'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}