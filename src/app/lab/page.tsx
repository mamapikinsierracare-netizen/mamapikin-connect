'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

type LabTest = {
  id: string
  name: string
  category: string
  normal_range: string
  unit: string
}

type LabRequest = {
  id?: number
  request_id: string
  patient_id: string
  test_name: string
  priority: string
  ordered_by: string
  status: string
  result: string | null
  result_date: string | null
  notes: string
  created_at: string
}

export default function LabPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [selectedTest, setSelectedTest] = useState('')
  const [priority, setPriority] = useState('routine')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const labTests: LabTest[] = [
    { id: 'hb', name: 'Hemoglobin (Hb)', category: 'Hematology', normal_range: '11-15', unit: 'g/dL' },
    { id: 'malaria', name: 'Malaria RDT', category: 'Parasitology', normal_range: 'Negative', unit: '' },
    { id: 'hiv', name: 'HIV Rapid Test', category: 'Immunology', normal_range: 'Non-reactive', unit: '' },
    { id: 'glucose', name: 'Blood Glucose', category: 'Biochemistry', normal_range: '70-140', unit: 'mg/dL' },
    { id: 'urinalysis', name: 'Urinalysis', category: 'Urine', normal_range: 'Normal', unit: '' },
    { id: 'creatinine', name: 'Creatinine', category: 'Biochemistry', normal_range: '0.5-1.1', unit: 'mg/dL' },
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
    if (!selectedTest) {
      setMessage('❌ Please select a test')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const requestId = `LAB-${selectedPatient.patient_id}-${Date.now()}`
      
      const labRequest: LabRequest = {
        request_id: requestId,
        patient_id: selectedPatient.patient_id,
        test_name: selectedTest,
        priority: priority,
        ordered_by: 'Nurse',
        status: 'pending',
        result: null,
        result_date: null,
        notes: notes,
        created_at: new Date().toISOString()
      }

      // Save to localStorage
      const existing = localStorage.getItem('lab_requests')
      const requests = existing ? JSON.parse(existing) : []
      requests.push(labRequest)
      localStorage.setItem('lab_requests', JSON.stringify(requests))

      setMessageType('success')
      setMessage(`✅ Lab request submitted for ${selectedPatient.full_name}: ${selectedTest}`)
      
      // Reset form
      setSelectedTest('')
      setPriority('routine')
      setNotes('')
      setSelectedPatient(null)
      setSearchTerm('')

    } catch (error) {
      setMessageType('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Laboratory</h1>
            <p className="text-gray-600">Order and manage lab tests</p>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 
              'bg-red-100 text-red-700 border border-red-400'
            }`}>
              {message}
            </div>
          )}

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

          {/* Lab Test Form */}
          {selectedPatient && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">2. Order Lab Test</h2>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Select Test</label>
                <select
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">-- Select a test --</option>
                  {labTests.map(test => (
                    <option key={test.id} value={test.name}>
                      {test.name} - {test.category} (Normal: {test.normal_range} {test.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="routine">Routine (48 hours)</option>
                  <option value="urgent">Urgent (24 hours)</option>
                  <option value="stat">STAT (2 hours)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-1">Clinical Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Patient has fever, suspected malaria..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Submitting...' : 'Submit Lab Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}