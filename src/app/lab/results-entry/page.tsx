// src/app/lab/results-entry/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'
import { db, saveOffline, updateOffline } from '@/lib/db'

type LabOrder = {
  id: string
  order_id: string
  patient_id: string
  patient_name: string
  requested_by: string
  priority: string
  clinical_notes: string
  tests_requested: string
  status: string
  created_at: string
}

type TestFieldDefinition = {
  key: string
  label: string
  type: 'select' | 'number' | 'text'
  options?: string[]
  unit?: string
  criticalCheck?: (val: any) => { isCritical: boolean; flag: 'Normal' | 'Abnormal' | 'Critical'; range: string }
}

// Standard reference definitions with integrated diagnostic guardrails
const TEST_FORM_CONFIGS: Record<string, TestFieldDefinition[]> = {
  'malaria': [
    {
      key: 'malaria_result',
      label: 'Malaria RDT Result',
      type: 'select',
      options: ['Negative', 'Positive (P. falciparum)', 'Positive (Other Species)', 'Invalid'],
      criticalCheck: (val) => ({
        isCritical: String(val).includes('Positive'),
        flag: String(val).includes('Positive') ? 'Critical' : 'Normal',
        range: 'Negative'
      })
    }
  ],
  'hemoglobin': [
    {
      key: 'hb_value',
      label: 'Hemoglobin Value',
      type: 'number',
      unit: 'g/dL',
      criticalCheck: (val) => {
        const num = parseFloat(val)
        if (isNaN(num)) return { isCritical: false, flag: 'Normal', range: '11.0 - 15.5 g/dL' }
        if (num < 7.0) return { isCritical: true, flag: 'Critical', range: '11.0 - 15.5 g/dL' }
        if (num < 11.0) return { isCritical: false, flag: 'Abnormal', range: '11.0 - 15.5 g/dL' }
        return { isCritical: false, flag: 'Normal', range: '11.0 - 15.5 g/dL' }
      }
    }
  ],
  'blood group': [
    {
      key: 'blood_group_abo',
      label: 'ABO Grouping',
      type: 'select',
      options: ['A', 'B', 'AB', 'O']
    },
    {
      key: 'blood_group_rh',
      label: 'Rhesus Factor',
      type: 'select',
      options: ['Positive (+)', 'Negative (-)'],
      criticalCheck: (val) => ({
        isCritical: String(val).includes('Negative'),
        flag: String(val).includes('Negative') ? 'Abnormal' : 'Normal',
        range: 'Positive (+)'
      })
    }
  ],
  'syphilis': [
    {
      key: 'syphilis_result',
      label: 'Syphilis Antibody Result',
      type: 'select',
      options: ['Non-Reactive', 'Reactive'],
      criticalCheck: (val) => ({
        isCritical: val === 'Reactive',
        flag: val === 'Reactive' ? 'Critical' : 'Normal',
        range: 'Non-Reactive'
      })
    }
  ],
  'hiv': [
    {
      key: 'hiv_result',
      label: 'HIV 1/2 Discriminatory Assay',
      type: 'select',
      options: ['Non-Reactive', 'Reactive', 'Inconclusive'],
      criticalCheck: (val) => ({
        isCritical: val === 'Reactive',
        flag: val === 'Reactive' ? 'Critical' : 'Normal',
        range: 'Non-Reactive'
      })
    }
  ],
  'urinalysis': [
    { key: 'urine_protein', label: 'Protein / Albumin', type: 'select', options: ['Negative', 'Trace', '1+', '2+', '3+', '4+'] },
    { key: 'urine_glucose', label: 'Glucose', type: 'select', options: ['Negative', 'Trace', '1+', '2+', '3+'] },
    { key: 'urine_leukocytes', label: 'Leukocyte Esterase', type: 'select', options: ['Negative', 'Trace', 'Small', 'Moderate', 'Large'] }
  ]
}

const getSupabaseUrl = (): string => process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const getSupabaseAnonKey = (): string => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function ResultsEntryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useRBAC()
  
  const queryOrderId = searchParams.get('order') || ''
  
  const [order, setOrder] = useState<LabOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  // Search framework if no direct parameter is passed
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  const [matchingOrders, setMatchingOrders] = useState<LabOrder[]>([])

  // Results dynamic capture container
  const [capturedValues, setCapturedValues] = useState<Record<string, string>>({})
  const [internalNotes, setInternalNotes] = useState('')

  useEffect(() => {
    if (queryOrderId) {
      loadSpecificOrder(queryOrderId)
    } else {
      setLoading(false)
    }
  }, [queryOrderId])

  async function loadSpecificOrder(id: string) {
    setLoading(true)
    try {
      // 1. Check local data array structures
      const localMatch = await db.lab_orders.get(id)
      if (localMatch) {
        setOrder(localMatch)
        initializeForm(localMatch.tests_requested)
        setLoading(false)
        return
      }

      // 2. Query cloud infrastructure if connected
      if (navigator.onLine) {
        const response = await fetch(`${getSupabaseUrl()}/rest/v1/lab_orders?order_id=eq.${id}`, {
          headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
        })
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            setOrder(data[0])
            initializeForm(data[0].tests_requested)
          }
        }
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  function initializeForm(testsRequested: string) {
    const initialValues: Record<string, string> = {}
    const lowerRequested = testsRequested.toLowerCase()
    
    Object.entries(TEST_FORM_CONFIGS).forEach(([configKey, fields]) => {
      if (lowerRequested.includes(configKey)) {
        fields.forEach(field => {
          initialValues[field.key] = field.type === 'select' ? field.options?.[0] || '' : ''
        })
      }
    })
    
    // Fallback if generic test not matching our specific definitions
    if (Object.keys(initialValues).length === 0) {
      initialValues['generic_result'] = ''
    }
    
    setCapturedValues(initialValues)
  }

  async function handleOrderSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setOrderSearchTerm(value)
    if (value.length < 2) return setMatchingOrders([])

    try {
      const localMatches = await db.lab_orders.filter(o => o.status !== 'Dispensed' && (o.order_id.toLowerCase().includes(value.toLowerCase()) || o.patient_name.toLowerCase().includes(value.toLowerCase()))).toArray()
      setMatchingOrders(localMatches)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSubmitResults(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return

    setLoading(true)
    try {
      // FIX: Changed from literal type to string to prevent TS closure inference errors
      let absoluteHighestFlag: string = 'Normal'
      const structuredResultList: string[] = []

      // Evaluate and process values sequentially against clinical check parameters
      Object.entries(capturedValues).forEach(([key, value]) => {
        let fieldLabel = key
        let currentFlag: string = 'Normal'

        // Map key back to config definition to evaluate indicators
        Object.values(TEST_FORM_CONFIGS).flat().forEach(def => {
          if (def.key === key) {
            fieldLabel = def.label
            if (def.criticalCheck) {
              const report = def.criticalCheck(value)
              currentFlag = report.flag
              if (currentFlag === 'Critical') absoluteHighestFlag = 'Critical'
              else if (currentFlag === 'Abnormal' && absoluteHighestFlag !== 'Critical') absoluteHighestFlag = 'Abnormal'
            }
          }
        })

        structuredResultList.push(`${fieldLabel}: ${value} [${currentFlag}]`)
      })

      const finalResultId = `RES-${Date.now()}`
      const packedResultRecord = {
        id: finalResultId,
        result_id: finalResultId,
        order_id: order.order_id,
        patient_id: order.patient_id,
        test_name: order.tests_requested,
        result_value: structuredResultList.join('; '),
        reference_range: 'Refer to system configs',
        flag: absoluteHighestFlag,
        verified_by: (user as any)?.user_metadata?.full_name || (user as any)?.email || 'Lab Tech',
        status: 'Finalized',
        created_at: new Date().toISOString()
      }

      // 1. Write the evaluation results payload to offline index
      await saveOffline('lab_results', packedResultRecord)

      // 2. Advance the master order state status to close the run loop
      await updateOffline('lab_orders', order.order_id, { status: 'Dispensed' })

      setMessageType('success')
      setMessage(absoluteHighestFlag === 'Critical' 
        ? '🚨 CRITICAL LAB RESULTS STORED! Guardrails triggered and flagged.' 
        : '✅ Lab results processed and authorized successfully.')

      setTimeout(() => {
        router.push('/lab/worklist')
      }, 2000)

    } catch (err) {
      setMessageType('error')
      setMessage('An issue occurred compiling diagnostic payloads.')
    } finally {
      setLoading(false)
    }
  }

  // Determine active form fields schema configuration
  const activeFields: TestFieldDefinition[] = []
  if (order) {
    const lowerReq = order.tests_requested.toLowerCase()
    Object.entries(TEST_FORM_CONFIGS).forEach(([key, fields]) => {
      if (lowerReq.includes(key)) activeFields.push(...fields)
    })
    if (activeFields.length === 0) {
      activeFields.push({ key: 'generic_result', label: `Result Value for ${order.tests_requested}`, type: 'text' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Input Bar (Shown if no order parameter found) */}
      {!order && (
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-gray-400">
          <label className="block text-gray-700 font-bold mb-2">Identify Target Processing Order ID</label>
          <input 
            type="text"
            value={orderSearchTerm}
            onChange={handleOrderSearch}
            placeholder="Type patient name or order ID tracking prefix..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {matchingOrders.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg divide-y bg-white overflow-hidden shadow-inner">
              {matchingOrders.map(o => (
                <div 
                  key={o.order_id} 
                  onClick={() => loadSpecificOrder(o.order_id)}
                  className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-gray-900">{o.patient_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{o.order_id} | {o.tests_requested}</div>
                  </div>
                  <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-700">{o.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl font-black shadow text-center border animate-bounce
          ${messageType === 'success' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
          {message}
        </div>
      )}

      {/* Target Processing Profile Display Panel */}
      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Display Sidebar Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500 h-fit space-y-4">
            <h2 className="text-lg font-black text-blue-900 uppercase tracking-wider">Specimen Metadata</h2>
            <div className="border-b pb-2">
              <span className="text-xs text-gray-400 font-bold uppercase">Patient Identity</span>
              <div className="font-bold text-gray-900 text-lg">{order.patient_name}</div>
              <div className="text-xs font-mono text-gray-500 mt-0.5">ID: {order.patient_id}</div>
            </div>
            <div className="border-b pb-2">
              <span className="text-xs text-gray-400 font-bold uppercase">Tracking Identification</span>
              <div className="font-mono text-sm font-black text-gray-800">{order.order_id}</div>
            </div>
            <div className="border-b pb-2">
              <span className="text-xs text-gray-400 font-bold uppercase">Triage Clinical Priority</span>
              <div className="mt-1">
                <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wide
                  ${order.priority.toLowerCase() === 'stat' ? 'bg-red-100 text-red-800 animate-pulse border border-red-300' : 'bg-gray-100 text-gray-700'}`}>
                  {order.priority}
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-bold uppercase">Diagnostics Prescribed</span>
              <div className="font-bold text-gray-800 text-sm mt-0.5">{order.tests_requested}</div>
              {order.clinical_notes && <p className="text-xs italic text-gray-500 mt-2 bg-gray-50 p-2 rounded border">Notes: {order.clinical_notes}</p>}
            </div>
          </div>

          {/* Core Results Capture Entry Workspace Grid */}
          <form onSubmit={handleSubmitResults} className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md border-t-4 border-green-600 space-y-6">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">Analytical Workstation Matrix</h2>
            
            <div className="space-y-4">
              {activeFields.map(field => (
                <div key={field.key} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-gray-800 font-black mb-1.5">{field.label}</label>
                  
                  {field.type === 'select' && field.options && (
                    <select
                      value={capturedValues[field.key] || ''}
                      onChange={(e) => setCapturedValues({ ...capturedValues, [field.key]: e.target.value })}
                      className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white font-medium"
                      required
                    >
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}

                  {field.type === 'number' && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.1"
                        value={capturedValues[field.key] || ''}
                        onChange={(e) => setCapturedValues({ ...capturedValues, [field.key]: e.target.value })}
                        className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 font-bold"
                        required
                      />
                      {field.unit && <span className="font-bold text-gray-500">{field.unit}</span>}
                    </div>
                  )}

                  {field.type === 'text' && (
                    <input 
                      type="text" 
                      value={capturedValues[field.key] || ''}
                      onChange={(e) => setCapturedValues({ ...capturedValues, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      required
                    />
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1.5">Laboratory Remarks / Internal Observations</label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
                placeholder="Log secondary structural findings or specific diagnostic notes here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-white font-black text-xl shadow-lg transition-transform uppercase tracking-wider
                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:-translate-y-0.5'}`}
            >
              {loading ? 'Processing Array matrices...' : '💾 Verify, Commit & Authorize Results'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function LabResultsEntryPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-gray-900">✏️ Results Entry Station</h1>
            <p className="text-gray-600 font-medium">Log verified chemical results and analyze clinical threshold flags</p>
          </div>
          
          <Suspense fallback={<div className="text-center py-10 font-bold text-gray-500">Mounting query string contexts...</div>}>
            <ResultsEntryContent />
          </Suspense>
        </div>
      </div>
    </>
  )
}