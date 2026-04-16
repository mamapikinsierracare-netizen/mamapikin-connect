// src/app/lab/pending/page.tsx
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
  priority: string
  status: string
  clinical_notes?: string
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

export default function PendingPage() {
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [requestItems, setRequestItems] = useState<LabRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    // Fetch ONLY pending requests (status = 'pending')
    const reqs = await fetchFromSupabase<LabRequest>('lab_requests?status=eq.pending&order=created_at.desc')
    console.log('Fetched pending requests:', reqs) // Debug log
    setRequests(reqs)
    const items = await fetchFromSupabase<LabRequestItem>('lab_request_items')
    setRequestItems(items)
    setLoading(false)
  }

  async function handleCollect(requestId: string) {
    // Move to 'collected' status
    const success = await patchToSupabase('lab_requests', `request_id=eq.${requestId}`, { status: 'collected' })
    if (success) {
      setMessage(`✅ Sample collection marked. Order moved to "In Progress".`)
      loadData() // Refresh list
    } else {
      setMessage('❌ Failed to update status')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const getItemsForRequest = (requestId: string) => requestItems.filter(item => item.request_id === requestId)

  // Show real data only; no demo override
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab" className="text-green-600 hover:text-green-800">← Back to Laboratory</Link>
            <h1 className="text-2xl font-bold text-yellow-700">⏳ Pending Tests</h1>
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
                <p>No pending tests.</p>
                <p className="text-sm mt-2">Go to "Order Entry" to create a new order.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(request => {
                  const items = getItemsForRequest(request.request_id)
                  return (
                    <div key={request.request_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-800">{request.patient_name}</span>
                            {request.priority === 'urgent' && <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">Urgent</span>}
                            {request.priority === 'stat' && <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-bold animate-pulse">STAT</span>}
                          </div>
                          <div className="text-sm text-gray-500">ID: {request.patient_id} | Requested: {formatDate(request.request_date)}</div>
                          {request.clinical_notes && <div className="text-sm text-gray-600 mt-1">📝 Notes: {request.clinical_notes}</div>}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {items.map((item, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{item.test_name}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCollect(request.request_id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                        >
                          🩸 Mark Sample Collected
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}