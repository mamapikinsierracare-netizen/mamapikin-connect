// src/lib/approvalService.ts

export type ApprovalRequest = {
  id?: number
  request_id: string
  patient_id: string
  request_type: 'CREATE' | 'EDIT' | 'DELETE' | 'CLOSE_ACCOUNT' | 'MODIFY'
  request_status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  request_data: Record<string, unknown>
  original_data: Record<string, unknown> | null
  requested_by: string
  requested_by_role: string
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  approval_notes: string | null
  is_urgent: boolean
  facility_code: string | null
}

export type AuditLogEntry = {
  log_id: string
  user_id: string
  user_email: string
  user_role: string
  user_facility: string | null
  action_type: string
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  action_details: string | null
  ip_address: string | null
  was_offline: boolean
  created_at: string
}

// Parameter type for creating an approval request (simpler, doesn't include auto-generated fields)
export type CreateApprovalRequestParams = {
  patient_id: string
  request_type: 'CREATE' | 'EDIT' | 'DELETE' | 'CLOSE_ACCOUNT' | 'MODIFY'
  request_data: Record<string, unknown>
  original_data: Record<string, unknown> | null
  requested_by: string
  requested_by_role: string
  is_urgent: boolean
  facility_code: string | null
}

async function isSupabaseReachable(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return false
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?limit=1`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    return response.ok
  } catch { return false }
}

// Create an approval request - FIXED with correct parameter type
export async function createApprovalRequest(
  request: CreateApprovalRequestParams
): Promise<{ success: boolean; request_id?: string; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const requestId = `REQ-${request.patient_id}-${Date.now()}`
  
  const newRequest: ApprovalRequest = {
    patient_id: request.patient_id,
    request_type: request.request_type,
    request_data: request.request_data,
    original_data: request.original_data,
    requested_by: request.requested_by,
    requested_by_role: request.requested_by_role,
    is_urgent: request.is_urgent,
    facility_code: request.facility_code,
    request_id: requestId,
    request_status: 'pending',
    requested_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    approval_notes: null
  }
  
  // Save to localStorage
  const existing = localStorage.getItem('approval_requests')
  const requests = existing ? JSON.parse(existing) : []
  requests.push(newRequest)
  localStorage.setItem('approval_requests', JSON.stringify(requests))
  
  // Save to Supabase if online
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const { id, ...dataToSend } = newRequest
      const response = await fetch(`${supabaseUrl}/rest/v1/approval_requests`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })
      if (response.ok) {
        return { success: true, request_id: requestId }
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error)
    }
  }
  
  return { success: true, request_id: requestId }
}

// Get pending approval requests for a patient
export async function getPendingRequestsForPatient(patientId: string): Promise<ApprovalRequest[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const requests: ApprovalRequest[] = []
  const seenIds = new Set<string>()
  
  // Get from localStorage
  const localRequests = localStorage.getItem('approval_requests')
  if (localRequests) {
    const parsed = JSON.parse(localRequests)
    const filtered = parsed.filter((r: ApprovalRequest) => 
      r.patient_id === patientId && r.request_status === 'pending'
    )
    filtered.forEach((r: ApprovalRequest) => {
      if (!seenIds.has(r.request_id)) {
        seenIds.add(r.request_id)
        requests.push(r)
      }
    })
  }
  
  // Get from Supabase if online
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/approval_requests?patient_id=eq.${patientId}&request_status=eq.pending`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudRequests = await response.json()
        cloudRequests.forEach((r: ApprovalRequest) => {
          if (!seenIds.has(r.request_id)) {
            seenIds.add(r.request_id)
            requests.push(r)
          }
        })
      }
    } catch { /* ignore */ }
  }
  
  return requests
}

// Get all pending approval requests (for admins)
export async function getAllPendingRequests(): Promise<ApprovalRequest[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const requests: ApprovalRequest[] = []
  const seenIds = new Set<string>()
  
  // Get from localStorage
  const localRequests = localStorage.getItem('approval_requests')
  if (localRequests) {
    const parsed = JSON.parse(localRequests)
    const filtered = parsed.filter((r: ApprovalRequest) => r.request_status === 'pending')
    filtered.forEach((r: ApprovalRequest) => {
      if (!seenIds.has(r.request_id)) {
        seenIds.add(r.request_id)
        requests.push(r)
      }
    })
  }
  
  // Get from Supabase if online
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/approval_requests?request_status=eq.pending&order=requested_at.asc`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudRequests = await response.json()
        cloudRequests.forEach((r: ApprovalRequest) => {
          if (!seenIds.has(r.request_id)) {
            seenIds.add(r.request_id)
            requests.push(r)
          }
        })
      }
    } catch { /* ignore */ }
  }
  
  return requests.sort((a, b) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime())
}

// Approve or reject a request
export async function updateRequestStatus(
  requestId: string, 
  status: 'approved' | 'rejected', 
  reviewedBy: string,
  rejectionReason?: string
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const updateData: {
    request_status: string
    reviewed_by: string
    reviewed_at: string
    rejection_reason?: string
  } = {
    request_status: status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString()
  }
  
  if (rejectionReason) {
    updateData.rejection_reason = rejectionReason
  }
  
  // Update in localStorage
  const localRequests = localStorage.getItem('approval_requests')
  if (localRequests) {
    const parsed = JSON.parse(localRequests)
    const updated = parsed.map((r: ApprovalRequest) =>
      r.request_id === requestId ? { ...r, ...updateData } : r
    )
    localStorage.setItem('approval_requests', JSON.stringify(updated))
  }
  
  // Update in Supabase if online
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/approval_requests?request_id=eq.${requestId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      return response.ok
    } catch { return false }
  }
  
  return true
}

// Add audit log entry
export async function addAuditLog(entry: Omit<AuditLogEntry, 'log_id' | 'created_at'>): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  const logEntry: AuditLogEntry = {
    ...entry,
    log_id: logId,
    created_at: new Date().toISOString()
  }
  
  // Save to localStorage
  const existing = localStorage.getItem('audit_log')
  const logs = existing ? JSON.parse(existing) : []
  logs.push(logEntry)
  localStorage.setItem('audit_log', JSON.stringify(logs))
  
  // Save to Supabase if online
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      const { log_id, created_at, ...dataToSend } = logEntry
      await fetch(`${supabaseUrl}/rest/v1/audit_log`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })
    } catch { /* ignore */ }
  }
}

// Get audit log entries
export async function getAuditLogs(filters?: { userId?: string; actionType?: string; startDate?: string; endDate?: string }): Promise<AuditLogEntry[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const logs: AuditLogEntry[] = []
  
  // Get from localStorage
  const localLogs = localStorage.getItem('audit_log')
  if (localLogs) {
    const parsed = JSON.parse(localLogs)
    logs.push(...parsed)
  }
  
  // Get from Supabase if online
  if (supabaseUrl && supabaseAnonKey && await isSupabaseReachable()) {
    try {
      let url = `${supabaseUrl}/rest/v1/audit_log?order=created_at.desc&limit=500`
      if (filters?.userId) url += `&user_id=eq.${filters.userId}`
      if (filters?.actionType) url += `&action_type=eq.${filters.actionType}`
      
      const response = await fetch(url, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const cloudLogs = await response.json()
        const existingIds = new Set(logs.map(l => l.log_id))
        cloudLogs.forEach((l: AuditLogEntry) => {
          if (!existingIds.has(l.log_id)) {
            logs.push(l)
          }
        })
      }
    } catch { /* ignore */ }
  }
  
  return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}