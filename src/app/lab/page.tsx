// src/app/lab/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'

type LabTest = {
  id: number
  test_id: string
  test_name: string
  test_category: string
  specimen_type: string
  normal_range: string
  unit: string
  requires_fasting: boolean
  turnaround_hours: number
  is_active: boolean
}

type Patient = {
  patient_id: string
  full_name: string
  phone: string | null
  date_of_birth: string | null
}

type LabRequest = {
  request_id: string
  patient_id: string
  patient_name: string
  requested_by: string
  requested_by_role: string
  request_date: string
  priority: string
  clinical_notes: string
  status: string
  created_at: string
}

type LabRequestItem = {
  id?: number
  request_id: string
  test_id: string
  test_name: string
  status: string
  result_value: string
  result_numeric: number | null
  normal_range: string
  unit: string
  is_abnormal: boolean
  abnormal_flag: string
  notes: string
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

async function patchToSupabase(endpoint: string, filter: string, data: unknown): Promise<boolean> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}?${filter}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    
    return response.ok
  } catch (error) {
    console.error(`Error patching ${endpoint}:`, error)
    return false
  }
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
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?full_name=ilike.%${term}%&select=patient_id,full_name,phone,date_of_birth&limit=20`, {
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getPriorityBadge(priority: string): React.ReactElement {
  switch(priority) {
    case 'stat':
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">STAT</span>
    case 'urgent':
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Urgent</span>
    default:
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Routine</span>
  }
}

function getStatusBadge(status: string): React.ReactElement {
  switch(status) {
    case 'pending':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>
    case 'collected':
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Collected</span>
    case 'processing':
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Processing</span>
    case 'completed':
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>
    case 'cancelled':
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Cancelled</span>
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>
  }
}

function getAbnormalFlagBadge(flag: string): React.ReactElement | null {
  if (flag === 'H') return <span className="ml-2 px-1 py-0.5 bg-red-100 text-red-800 rounded text-xs font-bold">High</span>
  if (flag === 'L') return <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">Low</span>
  if (flag === 'C') return <span className="ml-2 px-1 py-0.5 bg-red-200 text-red-900 rounded text-xs font-bold animate-pulse">CRITICAL</span>
  return null
}

export default function LabPage() {
  const { user, hasPermission } = useRBAC()
  const [activeTab, setActiveTab] = useState<'order' | 'pending' | 'results' | 'catalog'>('catalog')
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [priority, setPriority] = useState('routine')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [requestItems, setRequestItems] = useState<LabRequestItem[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null)
  const [resultValues, setResultValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
    loadRequests()
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
    const tests = await fetchFromSupabase<LabTest>('lab_tests?is_active=eq.true&order=test_name.asc')
    setLabTests(tests)
    setLoading(false)
  }

  async function loadRequests() {
    const reqs = await fetchFromSupabase<LabRequest>('lab_requests?order=created_at.desc&limit=50')
    setRequests(reqs)
    
    const items = await fetchFromSupabase<LabRequestItem>('lab_request_items')
    setRequestItems(items)
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
    setSelectedTests(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    )
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
    setMessage('')

    try {
      const requestId = `LAB-${selectedPatient.patient_id}-${Date.now()}`
      
      const request = {
        request_id: requestId,
        patient_id: selectedPatient.patient_id,
        patient_name: selectedPatient.full_name,
        requested_by: user?.full_name || user?.email || 'Unknown',
        requested_by_role: user?.role || 'Unknown',
        request_date: new Date().toISOString().split('T')[0],
        priority: priority,
        clinical_notes: clinicalNotes,
        status: 'pending'
      }
      
      const requestSuccess = await postToSupabase('lab_requests', request)
      
      if (requestSuccess) {
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
        
        setMessage('✅ Lab order created successfully')
        setMessageType('success')
        
        setSelectedPatient(null)
        setSelectedTests([])
        setPriority('routine')
        setClinicalNotes('')
        await loadRequests()
      } else {
        setMessage('❌ Failed to create lab order')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('❌ Error creating lab order')
      setMessageType('error')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function updateResult(requestId: string, itemId: number, resultValue: string, resultNumeric: number | null) {
    const testItem = requestItems.find(i => i.id === itemId)
    if (!testItem) return
    
    let isAbnormal = false
    let abnormalFlag = ''
    
    if (testItem.normal_range && resultNumeric !== null) {
      const range = testItem.normal_range
      if (range.includes('-')) {
        const [min, max] = range.split('-').map(Number)
        if (resultNumeric < min) { isAbnormal = true; abnormalFlag = 'L' }
        if (resultNumeric > max) { isAbnormal = true; abnormalFlag = 'H' }
      }
    }
    
    const success = await patchToSupabase('lab_request_items', `id=eq.${itemId}`, {
      result_value: resultValue,
      result_numeric: resultNumeric,
      is_abnormal: isAbnormal,
      abnormal_flag: abnormalFlag,
      status: 'completed',
      completed_by: user?.email || 'Unknown',
      completed_at: new Date().toISOString()
    })
    
    if (success) {
      await loadRequests()
      setMessage(`✅ Result saved for ${testItem.test_name}`)
      setMessageType('success')
    } else {
      setMessage('❌ Failed to save result')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  async function updateRequestStatus(requestId: string, newStatus: string) {
    const success = await patchToSupabase('lab_requests', `request_id=eq.${requestId}`, {
      status: newStatus
    })
    if (success) {
      await loadRequests()
      setMessage(`✅ Request status updated to ${newStatus}`)
      setMessageType('success')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const getItemsForRequest = (requestId: string) => {
    return requestItems.filter(item => item.request_id === requestId)
  }

  return (
    <React.Fragment>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Laboratory Management</h1>
            <p className="text-gray-600">Order lab tests, process samples, and view results</p>
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
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'catalog' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            >
              📚 Test Catalog ({labTests.length})
            </button>
          </div>
          
          {/* Test Catalog Tab */}
          {activeTab === 'catalog' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading tests...</div>
              ) : labTests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No lab tests found in catalog.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specimen</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Normal Range</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {labTests.map((test) => (
                        <tr key={test.test_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{test.test_name}</td>
                          <td className="px-4 py-3 text-sm">{test.test_category}</td>
                          <td className="px-4 py-3 text-sm">{test.specimen_type}</td>
                          <td className="px-4 py-3 text-sm">{test.normal_range || '-'} {test.unit}</td>
                          <td className="px-4 py-3 text-sm">{test.turnaround_hours} hours</td>
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
    </React.Fragment>
  )
}