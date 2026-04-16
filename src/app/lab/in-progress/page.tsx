// src/app/lab/in-progress/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

type LabRequest = {
  id?: number
  request_id: string
  patient_id: string
  patient_name: string
  request_date: string
  status: string
  collected_by?: string
  collected_at?: string
}

type LabRequestItem = {
  id?: number
  request_id: string
  test_name: string
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

export default function InProgressPage() {
  const [collectedRequests, setCollectedRequests] = useState<LabRequest[]>([])
  const [processingRequests, setProcessingRequests] = useState<LabRequest[]>([])
  const [requestItems, setRequestItems] = useState<LabRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const collected = await fetchFromSupabase<LabRequest>('lab_requests?status=eq.collected&order=created_at.desc')
    const processing = await fetchFromSupabase<LabRequest>('lab_requests?status=eq.processing&order=created_at.desc')
    setCollectedRequests(collected)
    setProcessingRequests(processing)
    const items = await fetchFromSupabase<LabRequestItem>('lab_request_items')
    setRequestItems(items)
    setLoading(false)
  }

  async function startProcessing(requestId: string) {
    const success = await patchToSupabase('lab_requests', `request_id=eq.${requestId}`, { 
      status: 'processing',
      processed_at: new Date().toISOString()
    })
    if (success) {
      setMessage(`✅ Processing started.`)
      loadData()
    }
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
            <h1 className="text-2xl font-bold text-purple-700">🔬 In Progress</h1>
          </div>
          
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800">
              {message}
            </div>
          )}
          
          {/* Collected Samples Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-bold text-purple-700 mb-4">🧪 Collected Samples (Ready for Processing)</h2>
            {collectedRequests.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No collected samples</div>
            ) : (
              <div className="space-y-3">
                {collectedRequests.map(request => (
                  <div key={request.request_id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold">{request.patient_name}</div>
                      <div className="text-sm text-gray-500">ID: {request.patient_id} | {formatDate(request.request_date)}</div>
                    </div>
                    <button
                      onClick={() => startProcessing(request.request_id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Start Processing
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Processing Samples Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-blue-700 mb-4">🔬 Processing Samples</h2>
            {processingRequests.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No samples currently processing</div>
            ) : (
              <div className="space-y-3">
                {processingRequests.map(request => (
                  <div key={request.request_id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold">{request.patient_name}</div>
                      <div className="text-sm text-gray-500">ID: {request.patient_id} | {formatDate(request.request_date)}</div>
                    </div>
                    <Link
                      href={`/lab/results-entry?request=${request.request_id}`}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Enter Results
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}