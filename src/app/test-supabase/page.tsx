'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'

export default function TestSupabasePage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  async function testConnection() {
    setLoading(true)
    setResult('Testing...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('URL:', supabaseUrl)
    console.log('Key exists:', !!supabaseAnonKey)
    
    if (!supabaseUrl || !supabaseAnonKey) {
      setResult('❌ .env.local variables are missing!')
      setLoading(false)
      return
    }
    
    try {
      // Test 1: Can we reach the server?
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      })
      
      if (response.status === 404) {
        setResult('✅ Server is reachable! (Got 404 which means server exists)')
      } else if (response.ok) {
        setResult('✅ Supabase is connected and working!')
      } else {
        setResult(`⚠️ Server responded with status: ${response.status}`)
      }
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`)
    }
    
    setLoading(false)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-green-700 mb-4">Supabase Connection Test</h1>
            
            <button
              onClick={testConnection}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
            
            {result && (
              <div className={`mt-4 p-4 rounded-lg ${
                result.includes('✅') ? 'bg-green-100 text-green-800' :
                result.includes('❌') ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {result}
              </div>
            )}
            
            <div className="mt-4 text-sm text-gray-500">
              URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}