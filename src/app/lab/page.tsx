// src/app/lab/worklist/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'
import { db, updateOffline } from '@/lib/db'

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

export default function LabWorklistPage() {
  const { user } = useRBAC()
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  // Live Filtering State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    loadWorklist()
  }, [])

  // Unified data fetcher: Combines local offline Dexie records with Cloud tables
  async function loadWorklist() {
    setLoading(true)
    const localOrdersList: any[] = []
    const seenOrderIds = new Set<string>()

    try {
      // 1. Fetch from Local IndexedDB (Dexie)
      const cached = await db.lab_orders.toArray()
      cached.forEach((ord) => {
        if (ord && ord.order_id) {
          seenOrderIds.add(ord.order_id)
          localOrdersList.push(ord)
        }
      })

      // 2. Fetch from Supabase Cloud if connection is available
      if (navigator.onLine) {
        const supabaseUrl = getSupabaseUrl()
        const supabaseAnonKey = getSupabaseAnonKey()
        
        const response = await fetch(`${supabaseUrl}/rest/v1/lab_orders?order=created_at.desc&limit=50`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        })

        if (response.ok) {
          const cloudOrders = await response.json()
          cloudOrders.forEach((ord: LabOrder) => {
            if (!seenOrderIds.has(ord.order_id)) {
              seenOrderIds.add(ord.order_id)
              localOrdersList.push(ord)
            }
          })
        }
      }
    } catch (err) {
      console.error("Error aggregating lab worklist:", err)
    }

    // Sort order: STAT first, then Urgent, then Routine. Secondary sort by newest timestamp.
    const priorityWeight = (p: string) => {
      const lower = p.toLowerCase()
      if (lower === 'stat') return 3
      if (lower === 'urgent') return 2
      return 1
    }

    localOrdersList.sort((a, b) => {
      const weightA = priorityWeight(a.priority)
      const weightB = priorityWeight(b.priority)
      if (weightB !== weightA) return weightB - weightA
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    setOrders(localOrdersList)
    setLoading(false)
  }

  // Updates specimen path status offline with optimistic UI rendering
  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      // Update IndexedDB via our unified wrapper
      await updateOffline('lab_orders', orderId, { status: newStatus })

      // Optimistic UI state adjustment
      setOrders((prevOrders) =>
        prevOrders.map((ord) =>
          ord.order_id === orderId ? { ...ord, status: newStatus } : ord
        )
      )

      setMessageType('success')
      setMessage(`Status updated to "${newStatus}" successfully.`)
      
      // Ping the service worker background thread to sync if connection exists
      if (navigator.onLine) {
        window.dispatchEvent(new Event('online'))
      }
    } catch (err) {
      setMessageType('error')
      setMessage('Failed to update specimen status locally.')
    }
    setTimeout(() => setMessage(''), 4000)
  }

  // Filter application pipeline
  const filteredOrders = orders.filter((ord) => {
    const matchesSearch = 
      ord.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.order_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || ord.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesPriority = priorityFilter === 'all' || ord.priority.toLowerCase() === priorityFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Top Header Row */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
                <Link href="/lab" className="hover:text-green-700">Laboratory Information launchpad</Link>
                <span>/</span>
                <span className="text-gray-700">Worklist Queue</span>
              </div>
              <h1 className="text-3xl font-black text-gray-900 mt-1">🔬 Tracking Worklist Queue</h1>
            </div>
            <button 
              onClick={loadWorklist}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2"
            >
              🔄 Refresh Queue
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg font-bold shadow-sm border-l-4 ${messageType === 'success' ? 'bg-green-100 text-green-800 border-green-500' : 'bg-red-100 text-red-800 border-red-500'}`}>
              {message}
            </div>
          )}

          {/* Interactive Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Search Identifier</label>
              <input 
                type="text"
                placeholder="Search patient name or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Filter Processing Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="all">All Processing Steps</option>
                <option value="pending reception">Pending Reception</option>
                <option value="pending">Pending Processing</option>
                <option value="in progress">In Progress</option>
                <option value="dispensed">Completed / Authorized</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Filter Clinical Priority</label>
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="all">All Priorities</option>
                <option value="routine">Routine Tracking</option>
                <option value="urgent">Urgent Processing</option>
                <option value="stat">STAT Priority</option>
              </select>
            </div>
          </div>

          {/* Core Table Grid Elements */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 font-bold animate-pulse">
              Interrogating database store arrays...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 font-medium border">
              No matching diagnostic tasks located in current pipeline structures.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left">
                  <thead className="bg-gray-800 text-white text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Urgency</th>
                      <th className="px-6 py-4">Order ID & Date</th>
                      <th className="px-6 py-4">Patient Profile</th>
                      <th className="px-6 py-4">Diagnostics Requested</th>
                      <th className="px-6 py-4">Workflow Status</th>
                      <th className="px-6 py-4 text-center">Specimen Transition Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {filteredOrders.map((ord) => {
                      const isStat = ord.priority.toLowerCase() === 'stat'
                      const isUrgent = ord.priority.toLowerCase() === 'urgent'
                      
                      return (
                        <tr key={ord.order_id} className={`hover:bg-gray-50 ${isStat ? 'bg-red-50/60 font-semibold' : ''}`}>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm tracking-wide uppercase border
                              ${isStat ? 'bg-red-100 text-red-800 border-red-300 animate-pulse' : 
                                isUrgent ? 'bg-orange-100 text-orange-800 border-orange-300' : 
                                'bg-green-100 text-green-800 border-green-300'}`}>
                              {ord.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-xs font-bold text-gray-900">{ord.order_id}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {new Date(ord.created_at).toLocaleDateString('en-GB')} {new Date(ord.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{ord.patient_name}</div>
                            <div className="text-xs text-gray-500">ID: {ord.patient_id}</div>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="font-medium text-gray-900 truncate" title={ord.tests_requested}>
                              {ord.tests_requested}
                            </div>
                            {ord.clinical_notes && (
                              <div className="text-xs text-gray-500 italic mt-1 truncate" title={ord.clinical_notes}>
                                Obs: {ord.clinical_notes}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border
                              ${ord.status.toLowerCase().includes('progress') ? 'bg-blue-100 text-blue-800 border-blue-300' : 
                                ord.status.toLowerCase().includes('reception') ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                                ord.status.toLowerCase().includes('dispensed') ? 'bg-teal-100 text-teal-800 border-teal-300' : 
                                'bg-gray-100 text-gray-800 border-gray-300'}`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              {ord.status.toLowerCase().includes('reception') && (
                                <button 
                                  onClick={() => updateOrderStatus(ord.order_id, 'Pending Processing')}
                                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                                >
                                  📥 Accept Sample
                                </button>
                              )}
                              {ord.status.toLowerCase() === 'pending' || ord.status.toLowerCase() === 'pending processing' ? (
                                <button 
                                  onClick={() => updateOrderStatus(ord.order_id, 'In Progress')}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                                >
                                  🧪 Begin Run
                                </button>
                              ) : null}
                              {ord.status.toLowerCase().includes('progress') && (
                                <Link 
                                  href={`/lab/results-entry?order=${ord.order_id}`}
                                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 shadow-sm transition-colors flex items-center gap-1"
                                >
                                  ✏️ Input Results
                                </Link>
                              )}
                              {ord.status.toLowerCase().includes('dispensed') && (
                                <span className="text-xs font-bold text-gray-400 italic">Verified & Closed</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}