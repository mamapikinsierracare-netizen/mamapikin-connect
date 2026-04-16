// src/app/lab/worklist/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

type WorkItem = {
  request_id: string
  patient_name: string
  patient_id: string
  status: string
  priority: string
  collected_at: string
  tests: { test_id: string; test_name: string; status: string }[]
}

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchWorklist(): Promise<WorkItem[]> {
  const res = await fetch(`${getSupabaseUrl()}/rest/v1/lab_requests?status=in.(collected,processing)&order=priority.desc,created_at.asc`, {
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
  })
  if (!res.ok) return []
  const items = await res.json()
  const testItemsRes = await fetch(`${getSupabaseUrl()}/rest/v1/lab_request_items`, {
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
  })
  const testItems = await testItemsRes.json()
  return items.map((order: any) => ({
    ...order,
    tests: testItems.filter((t: any) => t.request_id === order.request_id)
  }))
}

async function startProcessing(requestId: string) {
  return fetch(`${getSupabaseUrl()}/rest/v1/lab_requests?request_id=eq.${requestId}`, {
    method: 'PATCH',
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'processing', processed_at: new Date().toISOString() })
  }).then(r => r.ok)
}

export default function WorklistPage() {
  const [worklist, setWorklist] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => { loadWorklist() }, [])

  async function loadWorklist() {
    setLoading(true)
    const data = await fetchWorklist()
    setWorklist(data)
    setLoading(false)
  }

  async function handleStartProcessing(requestId: string) {
    const ok = await startProcessing(requestId)
    if (ok) {
      setMessage('✅ Sample moved to processing')
      loadWorklist()
    } else setMessage('❌ Failed to update')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab" className="text-green-600 hover:text-green-800">← Back to Lab</Link>
            <h1 className="text-2xl font-bold text-purple-700">📋 Worklist</h1>
          </div>
          {message && <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800">{message}</div>}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? <div className="text-center py-8">Loading...</div> : worklist.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No samples in worklist.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr><th className="p-3 text-left">Patient</th><th className="p-3 text-left">Tests</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Action</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {worklist.map(item => (
                      <tr key={item.request_id} className="hover:bg-gray-50">
                        <td className="p-3"><div className="font-medium">{item.patient_name}</div><div className="text-xs text-gray-500">{item.patient_id}</div></td>
                        <td className="p-3">
                          {item.tests.map(t => <div key={t.test_id} className="text-sm">{t.test_name} <span className="text-xs text-gray-400">({t.status})</span></div>)}
                        </td>
                        <td className="p-3">{item.priority === 'stat' ? <span className="text-red-600 font-bold">STAT</span> : item.priority === 'urgent' ? 'Urgent' : 'Routine'}</td>
                        <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-yellow-100">{item.status}</span></td>
                        <td className="p-3">
                          {item.status === 'collected' ? (
                            <button onClick={() => handleStartProcessing(item.request_id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Start Processing</button>
                          ) : (
                            <Link href={`/lab/results-entry?request=${item.request_id}`} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Enter Results</Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}