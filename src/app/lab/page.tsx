'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/auth'
import Navigation from '@/components/Navigation'

interface Patient {
  id: string
  full_name: string
  phone: string
}

interface LabTest {
  id: string
  test_name: string
  category: string
  normal_range_low: number
  normal_range_high: number
  unit: string
  is_critical_test: boolean
}

export default function LabPage() {
  // Patient search
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)
  
  // Lab data
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [selectedTest, setSelectedTest] = useState('')
  const [priority, setPriority] = useState('Routine')
  const [clinicalNotes, setClinicalNotes] = useState('')
  
  // Results
  const [resultValue, setResultValue] = useState('')
  const [resultFlag, setResultFlag] = useState('')
  const [criticalAlert, setCriticalAlert] = useState(false)
  
  // Request list
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [showResultEntry, setShowResultEntry] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  useEffect(() => {
    loadLabTests()
    if (selectedPatient) {
      loadPendingRequests()
    }
  }, [selectedPatient])

  async function loadLabTests() {
    const { data, error } = await supabase
      .from('lab_tests')
      .select('*')
      .order('test_name')
    
    if (!error && data) {
      setLabTests(data)
    }
  }

  async function loadPendingRequests() {
    if (!selectedPatient) return
    
    const { data, error } = await supabase
      .from('lab_requests')
      .select(`
        *,
        lab_tests (test_name, unit, normal_range_low, normal_range_high, is_critical_test)
      `)
      .eq('patient_id', selectedPatient.id)
      .neq('status', 'Completed')
      .order('ordered_at', { ascending: false })
    
    if (!error && data) {
      setPendingRequests(data)
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

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearchTerm('')
    setPatients([])
  }

  async function handleOrderTest(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedPatient) {
      setMessageType('error')
      setMessage('Please select a patient first')
      return
    }
    
    if (!selectedTest) {
      setMessageType('error')
      setMessage('Please select a test')
      return
    }
    
    setLoading(true)
    
    const { error } = await supabase
      .from('lab_requests')
      .insert({
        patient_id: selectedPatient.id,
        test_id: selectedTest,
        priority: priority,
        ordered_by: 'nurse',
        status: 'Ordered'
      })
    
    if (error) {
      setMessageType('error')
      setMessage(`Error: ${error.message}`)
    } else {
      setMessageType('success')
      setMessage('✅ Lab test ordered successfully!')
      setSelectedTest('')
      setPriority('Routine')
      await loadPendingRequests()
    }
    
    setLoading(false)
  }

  async function enterResult(request: any) {
    setSelectedRequest(request)
    setShowResultEntry(true)
    setResultValue('')
    setResultFlag('')
    setCriticalAlert(false)
  }

  async function saveResult() {
    if (!selectedRequest) return
    
    const test = selectedRequest.lab_tests
    let flag = ''
    let isCritical = false
    const numericValue = parseFloat(resultValue)
    
    // Determine flag based on result
    if (test.test_name === 'Malaria RDT' || test.test_name === 'HIV Rapid Test') {
      flag = resultValue === 'Positive' ? 'Abnormal' : 'Normal'
      isCritical = flag === 'Abnormal' && test.is_critical_test
    } else if (!isNaN(numericValue)) {
      if (test.critical_low && numericValue <= test.critical_low) {
        flag = 'Critical Low'
        isCritical = true
      } else if (test.critical_high && numericValue >= test.critical_high) {
        flag = 'Critical High'
        isCritical = true
      } else if (test.normal_range_low && numericValue < test.normal_range_low) {
        flag = 'Low'
      } else if (test.normal_range_high && numericValue > test.normal_range_high) {
        flag = 'High'
      } else {
        flag = 'Normal'
      }
    }
    
    setResultFlag(flag)
    if (isCritical) {
      setCriticalAlert(true)
      setMessageType('error')
      setMessage(`🔴 CRITICAL RESULT! ${test.test_name}: ${resultValue} ${test.unit || ''}`)
      return
    }
    
    const { error } = await supabase
      .from('lab_requests')
      .update({
        result_value: resultValue,
        result_flag: flag,
        result_numeric: isNaN(numericValue) ? null : numericValue,
        result_entered_by: 'lab_tech',
        result_entered_at: new Date().toISOString(),
        status: 'Completed'
      })
      .eq('id', selectedRequest.id)
    
    if (error) {
      setMessageType('error')
      setMessage(`Error: ${error.message}`)
    } else {
      setMessageType('success')
      setMessage('✅ Result saved successfully!')
      setShowResultEntry(false)
      setSelectedRequest(null)
      await loadPendingRequests()
    }
  }

  // Get status color
  function getStatusColor(status: string): string {
    switch (status) {
      case 'Ordered': return 'bg-yellow-100 text-yellow-700'
      case 'Collected': return 'bg-blue-100 text-blue-700'
      case 'Completed': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
            <p className="text-gray-600">Laboratory - Test Ordering & Results</p>
          </div>
          
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}
          
          {/* Critical Alert Modal */}
          {criticalAlert && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md">
                <div className="text-red-600 text-5xl mb-4 text-center">🚨</div>
                <h2 className="text-xl font-bold text-center mb-4">CRITICAL RESULT</h2>
                <p className="text-center mb-4">{message}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCriticalAlert(false)
                      setMessage('')
                    }}
                    className="flex-1 bg-gray-300 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveResult}
                    className="flex-1 bg-red-600 text-white py-2 rounded"
                  >
                    Save Critical Result
                  </button>
                </div>
              </div>
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
                className="w-full px-3 py-2 border rounded-lg"
              />
              {patients.length > 0 && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  {patients.map(patient => (
                    <div
                      key={patient.id}
                      onClick={() => selectPatient(patient)}
                      className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <p className="font-medium">{patient.full_name}</p>
                      <p className="text-sm text-gray-500">ID: {patient.id}</p>
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
                    onClick={() => setSelectedPatient(null)}
                    className="text-green-600 hover:text-green-800"
                  >
                    Change Patient
                  </button>
                </div>
              </div>
              
              {/* Order New Test */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Order New Test</h2>
                <form onSubmit={handleOrderTest}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-1">Select Test</label>
                      <select
                        value={selectedTest}
                        onChange={(e) => setSelectedTest(e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Choose test...</option>
                        {labTests.map(test => (
                          <option key={test.id} value={test.id}>
                            {test.test_name} ({test.category})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="Routine">Routine</option>
                        <option value="Urgent">Urgent</option>
                        <option value="STAT">STAT (Emergency)</option>
                      </select>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    Order Test
                  </button>
                </form>
              </div>
              
              {/* Pending Tests */}
              {pendingRequests.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold mb-4">Pending Tests</h2>
                  <div className="space-y-2">
                    {pendingRequests.map(request => (
                      <div key={request.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium">{request.lab_tests?.test_name}</p>
                          <p className="text-sm text-gray-500">Ordered: {new Date(request.ordered_at).toLocaleDateString()}</p>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        {request.status === 'Ordered' && (
                          <button
                            onClick={() => enterResult(request)}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                          >
                            Enter Result
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Result Entry Modal */}
              {showResultEntry && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h2 className="text-xl font-bold mb-4">Enter Result</h2>
                    <p className="mb-2">Test: {selectedRequest.lab_tests?.test_name}</p>
                    <p className="mb-4 text-sm text-gray-500">
                      Normal range: {selectedRequest.lab_tests?.normal_range_low} - {selectedRequest.lab_tests?.normal_range_high} {selectedRequest.lab_tests?.unit}
                    </p>
                    
                    <input
                      type="text"
                      value={resultValue}
                      onChange={(e) => setResultValue(e.target.value)}
                      placeholder="Enter result value"
                      className="w-full px-3 py-2 border rounded-lg mb-4"
                    />
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowResultEntry(false)
                          setSelectedRequest(null)
                        }}
                        className="flex-1 bg-gray-300 py-2 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveResult}
                        className="flex-1 bg-green-600 text-white py-2 rounded"
                      >
                        Save Result
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}