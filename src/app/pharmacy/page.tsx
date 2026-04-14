'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

type Medicine = {
  id: string
  name: string
  category: string
  stock: number
  unit: string
  expiry_date: string
}

type Prescription = {
  id?: number
  prescription_id: string
  patient_id: string
  medicine_name: string
  dosage: string
  frequency: string
  duration_days: number
  quantity: number
  instructions: string | null
  status: string
  prescribed_by: string
  dispensed_by: string
  dispensed_at: string
}

export default function PharmacyPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [selectedMedicine, setSelectedMedicine] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [duration, setDuration] = useState(7)
  const [quantity, setQuantity] = useState(1)
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const medicines: Medicine[] = [
    { id: '1', name: 'Paracetamol 500mg', category: 'Analgesic', stock: 150, unit: 'tablet', expiry_date: '2026-12-31' },
    { id: '2', name: 'Amoxicillin 500mg', category: 'Antibiotic', stock: 80, unit: 'capsule', expiry_date: '2026-10-15' },
    { id: '3', name: 'Iron/Folic Acid', category: 'Antenatal', stock: 200, unit: 'tablet', expiry_date: '2027-01-20' },
    { id: '4', name: 'Artemether-Lumefantrine', category: 'Antimalarial', stock: 120, unit: 'tablet', expiry_date: '2026-09-30' },
    { id: '5', name: 'ORS', category: 'Rehydration', stock: 300, unit: 'sachet', expiry_date: '2027-03-15' },
    { id: '6', name: 'Zinc 20mg', category: 'Supplement', stock: 180, unit: 'tablet', expiry_date: '2026-11-01' },
    { id: '7', name: 'Magnesium Sulfate', category: 'Anticonvulsant', stock: 50, unit: 'ampoule', expiry_date: '2026-08-30' },
    { id: '8', name: 'Oxytocin', category: 'Oxytocic', stock: 40, unit: 'ampoule', expiry_date: '2026-07-15' },
  ]

  useEffect(() => {
    // Load patients from localStorage
    const loadPatients = () => {
      const offlinePatients = localStorage.getItem('offline_patients')
      if (offlinePatients) {
        setPatients(JSON.parse(offlinePatients))
      }
    }
    loadPatients()
  }, [])

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      setMessage('❌ Please select a patient')
      setMessageType('error')
      return
    }
    if (!selectedMedicine) {
      setMessage('❌ Please select a medicine')
      setMessageType('error')
      return
    }
    if (!dosage) {
      setMessage('❌ Please enter dosage')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const prescriptionId = `RX-${selectedPatient.patient_id}-${Date.now()}`
      const medicine = medicines.find(m => m.id === selectedMedicine)
      
      const prescription: Prescription = {
        prescription_id: prescriptionId,
        patient_id: selectedPatient.patient_id,
        medicine_name: medicine?.name || selectedMedicine,
        dosage: dosage,
        frequency: frequency,
        duration_days: duration,
        quantity: quantity,
        instructions: instructions || null,
        status: 'dispensed',
        prescribed_by: 'Nurse',
        dispensed_by: 'Nurse',
        dispensed_at: new Date().toISOString()
      }

      // Save to localStorage
      const existing = localStorage.getItem('prescriptions')
      const prescriptions = existing ? JSON.parse(existing) : []
      prescriptions.push(prescription)
      localStorage.setItem('prescriptions', JSON.stringify(prescriptions))

      setMessageType('success')
      setMessage(`✅ Prescription dispensed to ${selectedPatient.full_name}: ${medicine?.name} ${dosage} ${frequency}`)
      
      // Reset form
      setSelectedMedicine('')
      setDosage('')
      setFrequency('')
      setDuration(7)
      setQuantity(1)
      setInstructions('')
      setSelectedPatient(null)
      setSearchTerm('')

    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedMedicineData = medicines.find(m => m.id === selectedMedicine)

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Pharmacy</h1>
            <p className="text-gray-600">Dispense medications and manage prescriptions</p>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 
              'bg-red-100 text-red-700 border border-red-400'
            }`}>
              {message}
            </div>
          )}

          {/* Medicine Stock Summary */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Medicine Stock Summary</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Medicine</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-center">Stock</th>
                    <th className="p-2 text-left">Expiry</th>
                  </tr>
                  </thead>
                  <tbody>
                    {medicines.map(med => (
                      <tr key={med.id} className="border-t">
                        <td className="p-2">{med.name}</td>
                        <td className="p-2 text-sm text-gray-500">{med.category}</td>
                        <td className="p-2 text-center">
                          <span className={med.stock < 20 ? 'text-red-600 font-bold' : 'text-green-600'}>
                            {med.stock} {med.unit}s
                          </span>
                        </td>
                        <td className="p-2 text-sm">{med.expiry_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          {/* Patient Search */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Patient</h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or patient ID..."
              className="w-full px-3 py-2 border rounded-lg mb-3"
            />
            {searchTerm && filteredPatients.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredPatients.map(patient => (
                  <div
                    key={patient.patient_id}
                    onClick={() => setSelectedPatient(patient)}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                  >
                    <div className="font-medium">{patient.full_name}</div>
                    <div className="text-sm text-gray-500">ID: {patient.patient_id}</div>
                  </div>
                ))}
              </div>
            )}
            {selectedPatient && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="font-medium">Selected: {selectedPatient.full_name}</div>
                <div className="text-sm text-gray-500">ID: {selectedPatient.patient_id}</div>
                <button onClick={() => setSelectedPatient(null)} className="text-red-600 text-sm mt-1">Change</button>
              </div>
            )}
          </div>

          {/* Prescription Form */}
          {selectedPatient && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">2. Dispense Medication</h2>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Select Medicine</label>
                <select
                  value={selectedMedicine}
                  onChange={(e) => setSelectedMedicine(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">-- Select a medicine --</option>
                  {medicines.map(med => (
                    <option key={med.id} value={med.id}>
                      {med.name} - Stock: {med.stock} {med.unit}s
                    </option>
                  ))}
                </select>
              </div>

              {selectedMedicineData && selectedMedicineData.stock < 20 && (
                <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                  ⚠️ Low stock alert: Only {selectedMedicineData.stock} {selectedMedicineData.unit}s remaining
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Dosage</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
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
                  <label className="block text-gray-700 font-medium mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    max="90"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Instructions (Optional)</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Take with food, Avoid alcohol, etc."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Processing...' : 'Dispense Medication'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}