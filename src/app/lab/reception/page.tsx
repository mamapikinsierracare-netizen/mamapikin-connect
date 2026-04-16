// src/app/lab/reception/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'

type PendingOrder = {
  request_id: string
  patient_name: string
  patient_id: string
  request_date: string
  priority: string
  tests: { test_name: string }[]
}

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchPendingOrders(): Promise<PendingOrder[]> {
  const res = await fetch(`${getSupabaseUrl()}/rest/v1/lab_requests?status=eq.pending&order=created_at.asc`, {
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
  })
  if (!res.ok) return []
  const orders = await res.json()
  // fetch associated tests
  const itemsRes = await fetch(`${getSupabaseUrl()}/rest/v1/lab_request_items`, {
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
  })
  const items = await itemsRes.json()
  return orders.map((order: any) => ({
    ...order,
    tests: items.filter((i: any) => i.request_id === order.request_id)
  }))
}

async function acceptSample(requestId: string, collectedBy: string) {
  return fetch(`${getSupabaseUrl()}/rest/v1/lab_requests?request_id=eq.${requestId}`, {
    method: 'PATCH',
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'collected', collected_by: collectedBy, collected_at: new Date().toISOString() })
  }).then(r => r.ok)
}

async function rejectSample(requestId: string, reason: string) {
  return fetch(`${getSupabaseUrl()}/rest/v1/lab_requests?request_id=eq.${requestId}`, {
    method: 'PATCH',
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
  }).then(r => r.ok)
}

export default function ReceptionPage() {
  const { user } = useRBAC()
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    setLoading(true)
    const data = await fetchPendingOrders()
    setOrders(data)
    setLoading(false)
  }

  async function handleAccept(requestId: string) {
    const ok = await acceptSample(requestId, user?.email || 'lab_tech')
    if (ok) {
      setMessage('✅ Sample accepted and moved to worklist')
      loadOrders()
    } else setMessage('❌ Failed to accept')
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleReject(requestId: string) {
    const reason = rejectReason[requestId]
    if (!reason) { setMessage('❌ Please provide a rejection reason'); return }
    const ok = await rejectSample(requestId, reason)
    if (ok) {
      setMessage('❌ Sample rejected. Clinician notified.')
      loadOrders()
    } else setMessage('❌ Failed to reject')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab" className="text-green-600 hover:text-green-800">← Back to Lab</Link>
            <h1 className="text-2xl font-bold text-blue-700">📦 Sample Reception</h1>
          </div>
          {message && <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800">{message}</div>}
          <div className="bg-white rounded-lg shadow-md p-6">
            {loading ? <div className="text-center py-8">Loading...</div> : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No pending orders for sample collection.</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.request_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div>
                        <div className="font-bold">{order.patient_name}</div>
                        <div className="text-sm text-gray-500">ID: {order.patient_id} | Ordered: {new Date(order.request_date).toLocaleDateString()}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {order.tests.map((t, i) => <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{t.test_name}</span>)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAccept(order.request_id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">✅ Accept</button>
                        <div className="flex gap-1">
                          <input type="text" placeholder="Rejection reason" className="border rounded px-2 py-1 text-sm w-40" value={rejectReason[order.request_id] || ''} onChange={e => setRejectReason({...rejectReason, [order.request_id]: e.target.value})} />
                          <button onClick={() => handleReject(order.request_id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">❌ Reject</button>
                        </div>
                      </div>
                    </div>
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