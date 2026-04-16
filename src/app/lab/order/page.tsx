// src/app/lab/order/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

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
  patient_id: string
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
  } catch { return false }
}

async function searchPatients(term: string): Promise<Patient[]> {
  if (term.length < 2) return []
  const results: Patient[] = []
  const seenIds = new Set<string>()
  
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
  
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?full_name=ilike.%${term}%&select=patient_id,full_name,phone,email&limit=20`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudPatients = await response.json()
        cloudPatients.forEach((p: Patient) => {
          if (!seenIds.has(p.patient_id)) {
            seenIds.add(p.patient_id)
            results.push(p)
          }
        })
      }
    } catch { /* ignore */ }
  }
  return results
}

export default function OrderEntryPage() {
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [priority, setPriority] = useState('routine')
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
    const tests = await fetchFromSupabase<LabTest>('lab_tests?is_active=eq.true&order=test_name.asc')
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
      return
    }
    if (selectedTests.length === 0) {
      setMessage('❌ Please select at least one test')
      return
    }

    setLoading(true)
    try {
      const requestId = `LAB-${selectedPatient.patient_id}-${Date.now()}`
      const request = {
        request_id: requestId,
        patient_id: selectedPatient.patient_id,
        patient_name: selectedPatient.full_name,
        patient_email: selectedPatient.email || null,
        patient_phone: selectedPatient.phone || null,
        requested_by: 'Nurse',
        request_date: new Date().toISOString().split('T')[0],
        priority: priority,
        clinical_notes: clinicalNotes,
        status: 'pending'
      }
      await postToSupabase('lab_requests', request)
      for (const testId of selectedTests) {
        const test = labTests.find(t => t.test_id === testId)
        if (test) {
          await postToSupabase('lab_request_items', {
            request_id: requestId,
            test_id: test.test_id,
            test_name: test.test_name,
            status: 'pending',
            normal_range: test.normal_range,
            unit: test.unit
          })
        }
      }
      setMessage(`✅ Lab order created for ${selectedPatient.full_name}`)
      setSelectedPatient(null)
      setSelectedTests([])
      setPriority('routine')
      setClinicalNotes('')
    } catch { setMessage('❌ Failed to create order') }
    finally { setLoading(false); setTimeout(() => setMessage(''), 3000) }
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
            <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800">
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
                  className="w-full px-4 py-2 border rounded-lg"
                />
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {searchResults.map(p => (
                      <div key={p.patient_id} onClick={() => handleSelectPatient(p)} className="p-3 hover:bg-green-50 cursor-pointer border-b">
                        <div className="font-medium">{p.full_name}</div>
                        <div className="text-sm text-gray-500">ID: {p.patient_id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedPatient && (
                <div className="mt-2 p-2 bg-green-50 rounded-lg flex justify-between">
                  <span>✅ Selected: {selectedPatient.full_name}</span>
                  <button onClick={() => setSelectedPatient(null)} className="text-red-600 text-sm">Change</button>
                </div>
              )}
            </div>
            
            {/* Test Selection */}
            {selectedPatient && (
              <>
                <div className="mb-6">
                  <label className="block font-medium mb-2">2. Select Tests</label>
                  <div className="max-h-96 overflow-y-auto border rounded-lg p-3">
                    {Object.entries(testsByCategory).map(([category, tests]) => (
                      <div key={category} className="mb-4">
                        <div className="font-semibold text-green-700 mb-2">{category}</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {tests.map(test => (
                            <label key={test.test_id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedTests.includes(test.test_id)}
                                onChange={() => toggleTestSelection(test.test_id)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{test.test_name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-green-600">{selectedTests.length} test(s) selected</div>
                </div>
                
                {/* Priority & Notes */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block font-medium mb-1">3. Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                      <option value="routine">Routine (24-48 hours)</option>
                      <option value="urgent">Urgent (4-8 hours)</option>
                      <option value="stat">STAT (1-2 hours)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">4. Clinical Notes</label>
                    <input type="text" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                
                <button onClick={handleSubmitOrder} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Submit Order ({selectedTests.length} tests)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}