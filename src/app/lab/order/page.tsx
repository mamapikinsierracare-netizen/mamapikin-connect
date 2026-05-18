// src/app/lab/order/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'
import { saveOffline } from '@/lib/db'

type LabTest = {
  id: number
  test_id: string
  test_name: string
  test_category: string
  specimen_type: string
  normal_range: string
  unit: string
  turnaround_hours: number
  is_active: boolean
}

type Patient = {
  id?: string
  patient_id?: string
  full_name: string
  phone: string | null
  email: string | null
}

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

async function fetchFromSupabase<T>(endpoint: string): Promise<T[]> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    if (response.ok) return await response.json()
    return []
  } catch { return [] }
}

// Fallback catalog in case the internet is down and we haven't synced yet
const FALLBACK_LAB_CATALOG: LabTest[] = [
  { id: 1, test_id: 'LAB-001', test_name: 'Malaria Rapid Diagnostic Test (RDT)', test_category: 'Parasitology', turnaround_hours: 1, specimen_type: 'Blood (Fingerprick)', normal_range: 'Negative', unit: '', is_active: true },
  { id: 2, test_id: 'LAB-002', test_name: 'Hemoglobin (Hb) Level', test_category: 'Hematology', turnaround_hours: 1, specimen_type: 'Blood (EDTA)', normal_range: '11.0 - 15.5', unit: 'g/dL', is_active: true },
  { id: 3, test_id: 'LAB-003', test_name: 'Blood Group & Rhesus', test_category: 'Immunology', turnaround_hours: 2, specimen_type: 'Blood (EDTA)', normal_range: '', unit: '', is_active: true },
  { id: 4, test_id: 'LAB-004', test_name: 'Syphilis (VDRL/RPR)', test_category: 'Serology', turnaround_hours: 1, specimen_type: 'Blood (Serum)', normal_range: 'Non-Reactive', unit: '', is_active: true },
  { id: 5, test_id: 'LAB-005', test_name: 'HIV Rapid Test', test_category: 'Serology', turnaround_hours: 1, specimen_type: 'Blood (Fingerprick)', normal_range: 'Negative', unit: '', is_active: true },
  { id: 6, test_id: 'LAB-006', test_name: 'Urinalysis (Dipstick)', test_category: 'Biochemistry', turnaround_hours: 1, specimen_type: 'Urine (Midstream)', normal_range: 'Normal', unit: '', is_active: true },
  { id: 7, test_id: 'LAB-007', test_name: 'Full Blood Count (FBC)', test_category: 'Hematology', turnaround_hours: 4, specimen_type: 'Blood (EDTA)', normal_range: 'See detailed report', unit: '', is_active: true },
]

async function searchPatients(term: string): Promise<Patient[]> {
  if (term.length < 2) return []
  const results: Patient[] = []
  const seenIds = new Set<string>()
  
  // Offline Search First
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
    const localList = JSON.parse(localPatients)
    const filtered = localList.filter((p: Patient) => {
      const pId = p.patient_id || p.id || '';
      return p.full_name?.toLowerCase().includes(term.toLowerCase()) || pId.toLowerCase().includes(term.toLowerCase())
    })
    filtered.forEach((p: Patient) => {
      const uniqueId = p.patient_id || p.id || '';
      if (!seenIds.has(uniqueId)) {
        seenIds.add(uniqueId)
        results.push(p)
      }
    })
  }
  
  // Cloud Search Second
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?or=(full_name.ilike.%25${term}%25,patient_id.ilike.%25${term}%25)&select=patient_id,full_name,phone,email&limit=20`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    if (response.ok) {
      const cloudPatients = await response.json()
      cloudPatients.forEach((p: Patient) => {
        const uniqueId = p.patient_id || p.id || '';
        if (!seenIds.has(uniqueId)) {
          seenIds.add(uniqueId)
          results.push(p)
        }
      })
    }
  } catch { /* ignore */ }
  
  return results
}

export default function OrderEntryPage() {
  const { user } = useRBAC()
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [priority, setPriority] = useState('Routine')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTests()
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

  async function loadTests() {
    setLoading(true)
    let tests = await fetchFromSupabase<LabTest>('lab_tests?is_active=eq.true&order=test_name.asc')
    
    // If the internet is down and we got nothing from Supabase, use the fallback array
    if (tests.length === 0) {
      tests = FALLBACK_LAB_CATALOG
    }
    
    setLabTests(tests)
    setLoading(false)
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

  function toggleTestSelection(testId: string) {
    if (selectedTests.includes(testId)) {
      setSelectedTests(selectedTests.filter(id => id !== testId))
    } else {
      setSelectedTests([...selectedTests, testId])
    }
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) {
      setMessage('❌ Please select a patient')
      setMessageType('error')
      return
    }
    if (selectedTests.length === 0) {
      setMessage('❌ Please select at least one test')
      setMessageType('error')
      return
    }

    setLoading(true)
    try {
      const actualPatientId = selectedPatient.patient_id || selectedPatient.id || 'unknown';
      const requestId = `LAB-${Date.now()}`
      
      // Get the full names of the tests selected
      const testNames = selectedTests.map(id => {
        const test = labTests.find(t => t.test_id === id)
        return test ? test.test_name : id
      }).join(', ')

      const orderData = {
        id: requestId,
        order_id: requestId,
        patient_id: actualPatientId,
        patient_name: selectedPatient.full_name,
        requested_by: (user as any)?.user_metadata?.full_name || (user as any)?.email || 'Clinician',
        priority: priority,
        clinical_notes: clinicalNotes,
        tests_requested: testNames,
        status: 'pending',
        created_at: new Date().toISOString()
      }
      
      // 🚀 Save directly to Dexie Offline Database!
      await saveOffline('lab_orders', orderData)
      
      setMessage(`✅ Lab order created and saved to offline queue for ${selectedPatient.full_name}`)
      setMessageType('success')
      
      setSelectedPatient(null)
      setSelectedTests([])
      setPriority('Routine')
      setClinicalNotes('')
      
      if (navigator.onLine) {
         window.dispatchEvent(new Event('online'));
      }
      
    } catch (err) { 
      setMessage('❌ Failed to create order locally.') 
      setMessageType('error')
    } finally { 
      setLoading(false); 
      setTimeout(() => setMessage(''), 4000) 
    }
  }

  // Group tests by category
  const testsByCategory: Record<string, LabTest[]> = {}
  labTests.forEach(test => {
    if (!testsByCategory[test.test_category]) testsByCategory[test.test_category] = []
    testsByCategory[test.test_category].push(test)
  })

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab" className="text-green-600 hover:text-green-800">
              ← Back to Laboratory
            </Link>
            <h1 className="text-2xl font-bold text-green-700">📝 Order Entry</h1>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg font-bold ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Patient Selection */}
            <div className="mb-6">
              <label className="block font-medium mb-2">1. Select Patient</label>
              <div ref={searchRef} className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or patient ID..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {searchResults.length === 0 && searchTerm.length >= 2 ? (
                      <div className="p-3 text-gray-500 text-center">No patients found.</div>
                    ) : (
                      searchResults.map(p => (
                        <div key={p.patient_id || p.id} onClick={() => handleSelectPatient(p)} className="p-3 hover:bg-green-50 cursor-pointer border-b">
                          <div className="font-medium">{p.full_name}</div>
                          <div className="text-sm text-gray-500">ID: {p.patient_id || p.id}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedPatient && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg flex justify-between items-center border border-green-200">
                  <div>
                    <span className="font-bold text-green-800">✅ Selected: {selectedPatient.full_name}</span>
                    <div className="text-sm text-gray-600">ID: {selectedPatient.patient_id || selectedPatient.id}</div>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="text-red-600 text-sm font-bold hover:underline">Change</button>
                </div>
              )}
            </div>
            
            {/* Test Selection */}
            {selectedPatient && (
              <>
                <div className="mb-6">
                  <label className="block font-medium mb-2">2. Select Diagnostics</label>
                  <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {Object.entries(testsByCategory).map(([category, tests]) => (
                      <div key={category} className="mb-6">
                        <div className="font-bold text-green-700 mb-3 border-b border-gray-200 pb-1">{category}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {tests.map(test => (
                            <label key={test.test_id} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${selectedTests.includes(test.test_id) ? 'bg-green-100 border-green-500 shadow-sm' : 'bg-white border-gray-200 hover:border-green-300'}`}>
                              <input
                                type="checkbox"
                                checked={selectedTests.includes(test.test_id)}
                                onChange={() => toggleTestSelection(test.test_id)}
                                className="mt-1 w-4 h-4 text-green-600 rounded"
                              />
                              <div>
                                <span className="text-sm font-bold text-gray-800">{test.test_name}</span>
                                <div className="text-xs text-gray-500 mt-1">🩸 {test.specimen_type} | TAT: {test.turnaround_hours}h</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm font-bold text-green-600 bg-green-50 inline-block px-3 py-1 rounded-full">{selectedTests.length} test(s) selected</div>
                </div>
                
                {/* Priority & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block font-medium mb-2">3. Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500">
                      <option value="Routine">Routine (24-48 hours)</option>
                      <option value="Urgent">Urgent (4-8 hours)</option>
                      <option value="STAT">STAT (1-2 hours)</option>
                    </select>
                    {priority === 'STAT' && <p className="text-xs text-red-600 font-bold mt-1">⚠️ STAT orders bypass the queue.</p>}
                  </div>
                  <div>
                    <label className="block font-medium mb-2">4. Clinical Notes</label>
                    <input type="text" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="e.g. Suspected severe malaria..." className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                
                <button onClick={handleSubmitOrder} disabled={loading || selectedTests.length === 0} className={`w-full py-4 text-white font-black text-lg rounded-xl shadow-lg transition-colors ${loading || selectedTests.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                  {loading ? 'Processing...' : `✅ Dispatch Order to Laboratory (${selectedTests.length} tests)`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}