// src/app/admin/approvals/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'
import { getAllPendingRequests, updateRequestStatus, ApprovalRequest } from '@/lib/approvalService'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getRequestTypeBadge(type: string) {
  switch(type) {
    case 'CREATE': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Create Patient</span>
    case 'EDIT': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Edit Patient</span>
    case 'DELETE': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Delete Patient</span>
    case 'CLOSE_ACCOUNT': return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Close Account</span>
    case 'MODIFY': return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Modify</span>
    default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{type}</span>
  }
}

export default function ApprovalsPage() {
  const { user, canApprove, loading: authLoading } = useRBAC()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (canApprove()) {
      loadRequests()
    }
  }, [canApprove])

  async function loadRequests() {
    setLoading(true)
    const pendingRequests = await getAllPendingRequests()
    setRequests(pendingRequests)
    setLoading(false)
  }

  async function handleApprove(requestId: string) {
    const success = await updateRequestStatus(requestId, 'approved', user?.email || 'admin')
    if (success) {
      setMessage(`✅ Request approved successfully`)
      setMessageType('success')
      loadRequests()
      setSelectedRequest(null)
    } else {
      setMessage(`❌ Failed to approve request`)
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleReject(requestId: string) {
    if (!rejectionReason) {
      setMessage(`⚠️ Please provide a reason for rejection`)
      setMessageType('warning')
      return
    }
    const success = await updateRequestStatus(requestId, 'rejected', user?.email || 'admin', rejectionReason)
    if (success) {
      setMessage(`✅ Request rejected`)
      setMessageType('success')
      loadRequests()
      setSelectedRequest(null)
      setRejectionReason('')
    } else {
      setMessage(`❌ Failed to reject request`)
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true
    if (filter === 'urgent') return r.is_urgent
    return r.request_type === filter
  })

  if (!canApprove() && !authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-red-100 text-red-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You do not have permission to view this page. Only System and Facility Admins can access approvals.</p>
              <Link href="/" className="text-green-600 underline mt-4 inline-block">Return to Dashboard</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 className="text-2xl font-bold text-green-700">Pending Approvals</h1>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">All Requests</option>
                <option value="urgent">Urgent Only</option>
                <option value="CREATE">Create Requests</option>
                <option value="EDIT">Edit Requests</option>
                <option value="DELETE">Delete Requests</option>
                <option value="CLOSE_ACCOUNT">Close Account Requests</option>
              </select>
              <button
                onClick={loadRequests}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                🔄 Refresh
              </button>
            </div>
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
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <div className="text-5xl mb-3">✅</div>
              <p>No pending approval requests</p>
              <p className="text-sm mt-2">All requests have been processed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.request_id} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${request.is_urgent ? 'border-red-500' : 'border-yellow-400'}`}>
                  <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getRequestTypeBadge(request.request_type)}
                        <span className="text-sm text-gray-500">Request ID: {request.request_id}</span>
                        {request.is_urgent && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs animate-pulse">
                            🚨 URGENT
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">
                        Patient ID: {request.patient_id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Requested by: {request.requested_by} ({request.requested_by_role})
                      </p>
                      <p className="text-sm text-gray-500">
                        Requested on: {formatDate(request.requested_at)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Request Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Request Details:</h4>
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(request.request_data, null, 2)}
                    </pre>
                    {request.original_data && (
                      <>
                        <hr className="my-2" />
                        <h4 className="font-medium text-gray-700 mb-2">Original Data:</h4>
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(request.original_data, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  {selectedRequest?.request_id === request.request_id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1">Rejection Reason (if rejecting)</label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Provide reason for rejection..."
                        />
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => handleApprove(request.request_id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.request_id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          ✗ Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(null)
                            setRejectionReason('')
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Review Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}