// src/app/lab/results-entry/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'

type LabRequest = {
  request_id: string
  patient_name: string
  patient_id: string
  priority: string
}

type TestItem = {
  id: number
  test_name: string
  normal_range: string
  unit: string
  result_value: string
  is_abnormal: boolean
}

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchRequest(requestId: string): Promise<LabRequest | null> {
  const res = await fetch(`${getSupabaseUrl()}/rest/v1/lab_requests?request_id=eq.${requestId}`, {
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
  })
  if (!res.ok) return null
  const data = await res.json()
  return data[0] || null
}

async function fetchTestItems(requestId: string): Promise<TestItem[]> {
  const res = await fetch(`${getSupabaseUrl()}/rest/v1/lab_request_items?request_id=eq.${requestId}`, {
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
  })
  if (!res.ok) return []
  return await res.json()
}

async function saveResult(itemId: number, resultValue: string, isAbnormal: boolean) {
  return fetch(`${getSupabaseUrl()}/rest/v1/lab_request_items?id=eq.${itemId}`, {
    method: 'PATCH',
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ result_value: resultValue, is_abnormal: isAbnormal, status: 'completed' })
  }).then(r => r.ok)
}

async function completeRequest(requestId: string) {
  return fetch(`${getSupabaseUrl()}/rest/v1/lab_requests?request_id=eq.${requestId}`, {
    method: 'PATCH',
    headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() })
  }).then(r => r.ok)
}

export default function ResultsEntryPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requestId = searchParams.get('request')
  const { user } = useRBAC()
  const [request, setRequest] = useState<LabRequest | null>(null)
  const [testItems, setTestItems] = useState<TestItem[]>([])
  const [results, setResults] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (requestId) loadData()
    else setLoading(false)
  }, [requestId])

  async function loadData() {
    setLoading(true)
    const req = await fetchRequest(requestId!)
    setRequest(req)
    const items = await fetchTestItems(requestId!)
    setTestItems(items)
    const initialResults: Record<number, string> = {}
    items.forEach(item => { if (item.result_value) initialResults[item.id] = item.result_value })
    setResults(initialResults)
    setLoading(false)
  }

  function isAbnormal(value: string, normalRange: string): boolean {
    const num = parseFloat(value)
    if (isNaN(num)) return false
    const range = normalRange.split('-').map(Number)
    if (range.length === 2) return num < range[0] || num > range[1]
    return false
  }

  async function handleSave() {
    setSaving(true)
    let allOk = true
    for (const item of testItems) {
      const newVal = results[item.id] || ''
      const abnormal = isAbnormal(newVal, item.normal_range)
      const ok = await saveResult(item.id, newVal, abnormal)
      if (!ok) allOk = false
    }
    if (allOk) {
      await completeRequest(requestId!)
      setMessage('✅ All results saved and request completed.')
      setTimeout(() => router.push('/lab/completed'), 2000)
    } else {
      setMessage('❌ Some results failed to save. Please try again.')
    }
    setSaving(false)
  }

  if (loading) return <><Navigation /><div className="text-center py-12">Loading...</div></>
  if (!requestId) return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-yellow-100 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-yellow-800">No request selected</h2>
            <p className="mt-2">Please go to the Worklist and select a sample to enter results.</p>
            <Link href="/lab/worklist" className="mt-4 inline-block text-green-600 underline">Go to Worklist →</Link>
          </div>
        </div>
      </div>
    </>
  )
  if (!request) return <><Navigation /><div className="text-center py-12 text-red-600">Request not found.</div></>

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab/worklist" className="text-green-600 hover:text-green-800">← Back to Worklist</Link>
            <h1 className="text-2xl font-bold text-green-700">📝 Results Entry</h1>
          </div>
          {message && <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800">{message}</div>}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4"><span className="font-bold">Patient:</span> {request.patient_name} ({request.patient_id})</div>
            <div className="space-y-4">
              {testItems.map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="font-medium">{item.test_name}</div>
                  <div className="text-sm text-gray-500">Reference range: {item.normal_range} {item.unit}</div>
                  <input
                    type="text"
                    className="mt-2 w-full px-3 py-2 border rounded-lg"
                    placeholder={`Enter result (${item.unit})`}
                    value={results[item.id] || ''}
                    onChange={e => setResults({...results, [item.id]: e.target.value})}
                  />
                  {isAbnormal(results[item.id] || '', item.normal_range) && (
                    <div className="mt-1 text-red-600 text-sm">⚠️ Outside normal range</div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving} className="mt-6 w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
              {saving ? 'Saving...' : 'Save All Results & Complete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}