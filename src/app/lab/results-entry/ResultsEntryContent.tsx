// src/app/lab/results-entry/ResultsEntryContent.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

type LabRequest = {
  id?: number
  request_id: string
  patient_id: string
  patient_name: string
  request_date: string
  status: string
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
}

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
  } catch { return false }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB')
}

export default function ResultsEntryContent() {
  const searchParams = useSearchParams()
  const requestIdFromUrl = searchParams.get('request')
  
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [requestItems, setRequestItems] = useState<LabRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null)
  const [resultValues, setResultValues] = useState<Record<number, string>>({})
  const [resultNotes, setResultNotes] = useState<Record<number, string>>({})
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // If requestId is in URL, automatically select that request
  useEffect(() => {
    if (requestIdFromUrl && requests.length > 0 && !selectedRequest) {
      const request = requests.find(r => r.request_id === requestIdFromUrl)
      if (request && request.status === 'processing') {
        setSelectedRequest(request)
        setShowModal(true)
      }
    }
  }, [requestIdFromUrl, requests, selectedRequest])

  async function loadData() {
    setLoading(true)
    const reqs = await fetchFromSupabase<LabRequest>('lab_requests?status=eq.processing&order=created_at.desc')
    setRequests(reqs)
    const items = await fetchFromSupabase<LabRequestItem>('lab_request_items')
    setRequestItems(items)
    setLoading(false)
  }

  async function saveResults(requestId: string) {
    for (const [itemIdStr, resultValue] of Object.entries(resultValues)) {
      const itemId = parseInt(itemIdStr)
      const notes = resultNotes[itemId] || ''
      
      await patchToSupabase('lab_request_items', `id=eq.${itemId}`, {
        result_value: resultValue,
        status: 'completed',
        notes: notes || null,
        completed_at: new Date().toISOString()
      })
    }
    await patchToSupabase('lab_requests', `request_id=eq.${requestId}`, { status: 'completed' })
    
    setMessage('✅ Results saved successfully')
    setShowModal(false)
    setResultValues({})
    setResultNotes({})
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const getItemsForRequest = (requestId: string) => requestItems.filter(item => item.request_id === requestId)

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab" className="text-green-600 hover:text-green-800">← Back to Laboratory</Link>
            <h1 className="text-2xl font-bold text-green-700">📋 Results Entry</h1>
          </div>
          
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800">
              {message}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md p-6">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No samples ready for results entry.</p>
                <p className="text-sm mt-2">Go to "In Progress" to start processing samples.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(request => (
                  <div key={request.request_id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold">{request.patient_name}</div>
                      <div className="text-sm text-gray-500">ID: {request.patient_id} | {formatDate(request.request_date)}</div>
                    </div>
                    <button
                      onClick={() => { 
                        setSelectedRequest(request); 
                        setShowModal(true); 
                        setResultValues({}); 
                        setResultNotes({});
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Enter Results
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Result Entry Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Enter Results for {selectedRequest.patient_name}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="space-y-4">
              {getItemsForRequest(selectedRequest.request_id).map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="font-medium mb-2">{item.test_name}</div>
                  <div className="text-sm text-gray-500 mb-2">Reference Range: {item.normal_range || 'N/A'} {item.unit}</div>
                  <input
                    type="text"
                    placeholder={`Enter result (${item.unit})`}
                    className="w-full px-3 py-2 border rounded-lg mb-2"
                    value={resultValues[item.id || 0] || ''}
                    onChange={(e) => setResultValues(prev => ({ ...prev, [item.id || 0]: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={resultNotes[item.id || 0] || ''}
                    onChange={(e) => setResultNotes(prev => ({ ...prev, [item.id || 0]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => saveResults(selectedRequest.request_id)} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Save Results
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}