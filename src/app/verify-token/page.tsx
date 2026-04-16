// src/app/verify-token/page.tsx
'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import Link from 'next/link'

type Patient = {
  patient_id: string
  full_name: string
  date_of_birth: string | null
  phone: string | null
  blood_group: string | null
  allergies: string | null
  is_pregnant: boolean
  edd: string | null
  village: string | null
  district: string | null
}

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchPatientById(patientId: string): Promise<Patient | null> {
  try {
    const response = await fetch(`${getSupabaseUrl()}/rest/v1/patients?patient_id=eq.${patientId}`, {
      headers: { 'apikey': getSupabaseAnonKey(), 'Authorization': `Bearer ${getSupabaseAnonKey()}` }
    })
    if (response.ok) {
      const data = await response.json()
      if (data && data.length > 0) return data[0]
    }
  } catch (error) {
    console.error('Error fetching patient:', error)
  }
  return null
}

export default function VerifyTokenPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [error, setError] = useState('')
  const [tokenValid, setTokenValid] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) {
      setError('Please enter a token')
      return
    }
    setLoading(true)
    setError('')
    setPatient(null)
    setTokenValid(false)

    // Check token in localStorage
    const storedTokens = localStorage.getItem('emergency_tokens')
    if (storedTokens) {
      const tokens = JSON.parse(storedTokens)
      const validToken = tokens.find((t: any) => t.token === token.trim())
      
      if (validToken) {
        const expiry = new Date(validToken.expiry)
        if (expiry > new Date()) {
          const patientData = await fetchPatientById(validToken.patient_id)
          if (patientData) {
            setPatient(patientData)
            setTokenValid(true)
            setError('')
          } else {
            setError('Patient data not found')
          }
        } else {
          setError(`Token expired on ${expiry.toLocaleString()}`)
        }
      } else {
        setError('Invalid token. Please check and try again.')
      }
    } else {
      setError('No emergency tokens have been generated yet.')
    }
    setLoading(false)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">Emergency Access</h1>
            <p className="text-gray-600">Enter the patient's emergency token to access their records</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleVerify}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Emergency Token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter 8-digit token (e.g., 48271936)"
                  className="w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-wider font-mono"
                  maxLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Token provided by the patient from their portal</p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Verifying...' : 'Verify Token & Access Records'}
              </button>
            </form>

            {tokenValid && patient && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-300">
                <h2 className="text-lg font-bold text-green-800 mb-3">✅ Verified Patient Records</h2>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {patient.full_name}</p>
                  <p><strong>Patient ID:</strong> {patient.patient_id}</p>
                  <p><strong>Date of Birth:</strong> {patient.date_of_birth || 'N/A'}</p>
                  <p><strong>Phone:</strong> {patient.phone || 'N/A'}</p>
                  <p><strong>Blood Group:</strong> {patient.blood_group || 'N/A'}</p>
                  <p><strong>Allergies:</strong> {patient.allergies || 'None reported'}</p>
                  <p><strong>Village:</strong> {patient.village || 'N/A'}</p>
                  <p><strong>District:</strong> {patient.district || 'N/A'}</p>
                  {patient.is_pregnant && <p><strong>Expected Delivery Date:</strong> {patient.edd || 'N/A'}</p>}
                </div>
                <div className="mt-4 pt-3 border-t border-green-200 text-sm text-gray-600">
                  <p>⚠️ This is emergency access only. Record all actions in the patient's chart.</p>
                  <p>Access logged: {new Date().toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center">
            <Link href="/portal" className="text-green-600 hover:text-green-800 text-sm">
              ← Back to Patient Portal
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}