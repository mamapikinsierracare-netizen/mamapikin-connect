'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'

export default function TestSyncPage() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function testSupabaseConnection() {
    setLoading(true)
    setResult('Testing Supabase connection...')
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      setResult('Checking if patients table exists...')
      
      // Try to fetch 1 patient
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .limit(1)
      
      if (error) {
        setResult(`❌ Error: ${error.message}\n\nDetails: ${JSON.stringify(error, null, 2)}`)
      } else {
        setResult(`✅ Supabase connection successful!\n\nPatients table exists.\n\nSample data: ${JSON.stringify(data, null, 2)}`)
      }
      
    } catch (err: any) {
      setResult(`❌ Failed to connect to Supabase:\n\n${err.message}\n\nCheck your .env.local file has:\nNEXT_PUBLIC_SUPABASE_URL\nNEXT_PUBLIC_SUPABASE_ANON_KEY`)
    } finally {
      setLoading(false)
    }
  }

  async function testInsertPatient() {
    setLoading(true)
    setResult('Testing insert...')
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      const testPatient = {
        id: `TEST-${Date.now()}`,
        full_name: `Test Patient ${new Date().toLocaleTimeString()}`,
        phone: '076000000',
        village: 'Test Village',
        district: 'Test District',
        facility_code: 'TEST',
        consent_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('patients')
        .insert([testPatient])
        .select()
      
      if (error) {
        setResult(`❌ Insert failed: ${error.message}\n\nDetails: ${JSON.stringify(error, null, 2)}`)
      } else {
        setResult(`✅ Insert successful!\n\nPatient ID: ${testPatient.id}\n\nResponse: ${JSON.stringify(data, null, 2)}`)
      }
      
    } catch (err: any) {
      setResult(`❌ Insert error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700">MamaPikin Connect</h1>
            <p className="text-gray-600">Supabase Connection Test - Debug Sync Issues</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex gap-4 mb-6 flex-wrap">
              <button
                onClick={testSupabaseConnection}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Test Connection
              </button>
              
              <button
                onClick={testInsertPatient}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Test Insert
              </button>
            </div>
            
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p>Working...</p>
              </div>
            )}
            
            {result && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">{result}</pre>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="font-bold mb-2">📋 Environment Check:</p>
              <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
              <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
              <p className="text-xs text-gray-500 mt-2">
                URL should start with: https://cjhzonmmcwvlxcnsgdna.supabase.co
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}