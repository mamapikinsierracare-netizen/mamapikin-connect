// src/app/patient/[id]/edit/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'
import { createApprovalRequest, getPendingRequestsForPatient, addAuditLog } from '@/lib/approvalService'

type Patient = {
  patient_id: string
  full_name: string
  date_of_birth: string | null
  phone: string | null
  village: string | null
  district: string | null
  blood_group: string | null
  allergies: string | null
  guardian_name: string | null
  guardian_phone: string | null
  is_pregnant: boolean
  is_breastfeeding: boolean
  is_child_under_5: boolean
  edd: string | null
  gestational_age: number | null
  gravida: number | null
  para: number | null
  birth_weight: number | null
  birth_length: number | null
  last_delivery_date: string | null
  exclusive_breastfeeding: boolean
  husband_name: string | null
  husband_phone: string | null
  husband_occupation: string | null
  father_name: string | null
  father_phone: string | null
  father_location: string | null
  next_of_kin_name: string | null
  next_of_kin_relationship: string | null
  next_of_kin_phone: string | null
  next_of_kin_address: string | null
  primary_decision_maker: string | null
  family_support_level: string | null
}

type ChangeRecord = {
  old: unknown
  new: unknown
}

async function fetchPatient(patientId: string): Promise<Patient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const localPatients = localStorage.getItem('offline_patients')
  if (localPatients) {
    const patients = JSON.parse(localPatients)
    const localPatient = patients.find((p: Patient) => p.patient_id === patientId)
    if (localPatient) return localPatient
  }
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?patient_id=eq.${patientId}`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      })
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) return data[0]
      }
    } catch { /* ignore */ }
  }
  
  return null
}

export default function EditPatientPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string
  
  const { user, canEdit, canEditDirectly } = useRBAC()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [pendingRequests, setPendingRequests] = useState<Array<{ request_id: string; request_type: string }>>([])
  
  const [formData, setFormData] = useState<Partial<Patient>>({})

  useEffect(() => {
    async function loadPatient() {
      const data = await fetchPatient(patientId)
      if (data) {
        setPatient(data)
        setFormData(data)
        
        const pending = await getPendingRequestsForPatient(patientId)
        setPendingRequests(pending)
      }
      setLoading(false)
    }
    loadPatient()
  }, [patientId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patient) return
    
    setSubmitting(true)
    setMessage('')
    
    // Find what changed
    const changes: Record<string, ChangeRecord> = {}
    Object.keys(formData).forEach(key => {
      const oldValue = patient[key as keyof Patient]
      const newValue = formData[key as keyof Patient]
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue }
      }
    })
    
    if (Object.keys(changes).length === 0) {
      setMessage('No changes detected')
      setMessageType('warning')
      setSubmitting(false)
      return
    }
    
    // If user is admin or senior doctor, apply changes directly
    if (canEditDirectly()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (supabaseUrl && supabaseAnonKey) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/patients?patient_id=eq.${patientId}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
          })
          
          if (response.ok) {
            setMessageType('success')
            setMessage('✅ Changes saved directly by Admin')
            await addAuditLog({
              user_id: user?.id || 'unknown',
              user_email: user?.email || 'unknown',
              user_role: user?.role || 'unknown',
              user_facility: user?.facility_code || null,
              action_type: 'EDIT_PATIENT',
              resource_type: 'PATIENT',
              resource_id: patientId,
              resource_name: patient.full_name,
              old_values: changes,
              new_values: formData,
              action_details: 'Direct edit by admin',
              ip_address: null,
              was_offline: false
            })
            setTimeout(() => router.push(`/patient/${patientId}`), 2000)
          } else {
            setMessageType('error')
            setMessage('❌ Failed to save changes')
          }
        } catch (error) {
          setMessageType('error')
          setMessage('❌ Network error')
        }
      }
    } 
    // Non-admin: create approval request
    else if (canEdit()) {
      // Convert data to Record<string, unknown> format
      const requestData: Record<string, unknown> = {
        changes: changes,
        new_data: formData
      }
      
      const originalData: Record<string, unknown> = { ...patient }
      
      const result = await createApprovalRequest({
        patient_id: patientId,
        request_type: 'EDIT',
        request_data: requestData,
        original_data: originalData,
        requested_by: user?.email || 'unknown',
        requested_by_role: user?.role || 'unknown',
        is_urgent: false,
        facility_code: user?.facility_code || null
      })
      
      if (result.success) {
        setMessageType('success')
        setMessage(`✅ Edit request submitted for approval. Request ID: ${result.request_id}\n\nYour changes will be applied once an admin approves them.`)
        await addAuditLog({
          user_id: user?.id || 'unknown',
          user_email: user?.email || 'unknown',
          user_role: user?.role || 'unknown',
          user_facility: user?.facility_code || null,
          action_type: 'SUBMIT_APPROVAL',
          resource_type: 'PATIENT',
          resource_id: patientId,
          resource_name: patient.full_name,
          old_values: changes,
          new_values: formData,
          action_details: `Edit request submitted. Request ID: ${result.request_id}`,
          ip_address: null,
          was_offline: false
        })
        setTimeout(() => router.push(`/patient/${patientId}`), 3000)
      } else {
        setMessageType('error')
        setMessage('❌ Failed to submit approval request')
      }
    } else {
      setMessageType('error')
      setMessage('❌ You do not have permission to edit patient records')
    }
    
    setSubmitting(false)
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p>Loading patient data...</p>
          </div>
        </div>
      </>
    )
  }

  if (!patient) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-red-100 text-red-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Patient Not Found</h2>
              <Link href="/patients" className="text-green-600 underline">Back to Patient List</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!canEdit() && !canEditDirectly()) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-red-100 text-red-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You do not have permission to edit patient records.</p>
              <Link href={`/patient/${patientId}`} className="text-green-600 underline mt-4 inline-block">Back to Patient Details</Link>
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
        <div className="max-w-4xl mx-auto px-4">
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-green-700">Edit Patient</h1>
            <Link href={`/patient/${patientId}`} className="text-gray-600 hover:text-gray-800">
              ← Cancel
            </Link>
          </div>
          
          {pendingRequests.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
              <p className="font-medium">⚠️ Pending Approval Requests</p>
              <p className="text-sm">There are {pendingRequests.length} pending approval request(s) for this patient. New edits will be queued.</p>
            </div>
          )}
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg whitespace-pre-line ${
              messageType === 'success' ? 'bg-green-100 text-green-800' :
              messageType === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            {/* Personal Information */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Full Name</label>
                  <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Date of Birth</label>
                  <input type="date" name="date_of_birth" value={formData.date_of_birth || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Village / Town</label>
                  <input type="text" name="village" value={formData.village || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">District</label>
                  <select name="district" value={formData.district || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select District</option>
                    <option value="Kailahun">Kailahun</option><option value="Kenema">Kenema</option>
                    <option value="Kono">Kono</option><option value="Bombali">Bombali</option>
                    <option value="Kambia">Kambia</option><option value="Koinadugu">Koinadugu</option>
                    <option value="Tonkolili">Tonkolili</option><option value="Port Loko">Port Loko</option>
                    <option value="Western Area Urban">Western Area Urban</option>
                    <option value="Western Area Rural">Western Area Rural</option>
                    <option value="Bo">Bo</option><option value="Bonthe">Bonthe</option>
                    <option value="Pujehun">Pujehun</option><option value="Moyamba">Moyamba</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Blood Group</label>
                  <select name="blood_group" value={formData.blood_group || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Allergies</label>
                  <input type="text" name="allergies" value={formData.allergies || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Penicillin" />
                </div>
              </div>
            </div>
            
            {/* Family Information */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-bold text-blue-800 mb-3">👨‍👩‍👧‍👦 Family Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Husband/Partner Name</label>
                  <input type="text" name="husband_name" value={formData.husband_name || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Husband/Partner Phone</label>
                  <input type="tel" name="husband_phone" value={formData.husband_phone || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Father&apos;s Name</label>
                  <input type="text" name="father_name" value={formData.father_name || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Father&apos;s Phone</label>
                  <input type="tel" name="father_phone" value={formData.father_phone || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>
            
            {/* Next of Kin */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="text-lg font-bold text-purple-800 mb-3">📞 Next of Kin (Emergency Contact)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Next of Kin Name</label>
                  <input type="text" name="next_of_kin_name" value={formData.next_of_kin_name || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Relationship</label>
                  <input type="text" name="next_of_kin_relationship" value={formData.next_of_kin_relationship || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Next of Kin Phone</label>
                  <input type="tel" name="next_of_kin_phone" value={formData.next_of_kin_phone || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Primary Decision Maker</label>
                  <select name="primary_decision_maker" value={formData.primary_decision_maker || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select</option>
                    <option value="Self">Self</option>
                    <option value="Husband">Husband</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Elder">Family Elder</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 py-3 rounded-lg text-white font-medium ${submitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {submitting ? 'Processing...' : (canEditDirectly() ? 'Save Changes' : 'Submit for Approval')}
              </button>
              <Link
                href={`/patient/${patientId}`}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-center"
              >
                Cancel
              </Link>
            </div>
            
            {!canEditDirectly() && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                ⚠️ Your changes will be sent to an admin for approval before being applied.
              </p>
            )}
          </form>
        </div>
      </div>
    </>
  )
}