'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'

export default function SupabaseTestPage() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function testConnection() {
    setLoading(true)
    setResult('Testing...')
    
    try {
      // Check if environment variables exist
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setResult(prev => prev + '\n\nEnvironment variables:\n')
      setResult(prev => prev + `URL: ${url ? '✅ Set' : '❌ Missing'}\n`)
      setResult(prev => prev + `Key: ${key ? '✅ Set' : '❌ Missing'}\n`)
      
      if (!url || !key) {
        setResult(prev => prev + '\n❌ Please add environment variables to .env.local')
        return
      }
      
      // Try to import Supabase
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(url, key)
      
      setResult(prev => prev + '\n✅ Supabase client created\n')
      
      // Try to query the patients table
      const { data, error } = await supabase
        .from('patients')
        .select('count')
        .limit(1)
      
      if (error) {
        setResult(prev => prev + `\n❌ Query error: ${error.message}\n`)
        setResult(prev => prev + `\nFull error: ${JSON.stringify(error, null, 2)}`)
      } else {
        setResult(prev => prev + '\n✅ Successfully connected to Supabase!\n')
        setResult(prev => prev + `\nPatients table exists and is accessible.`)
      }
      
    } catch (err: any) {
      setResult(prev => prev + `\n❌ Exception: ${err.message}\n`)
      setResult(prev => prev + `\n${err.stack || 'No stack trace'}`)
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
            <h1 className="text-3xl font-bold text-green-700">Supabase Connection Test</h1>
            <p className="text-gray-600">Debug the "Cloud save failed" error</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <button
              onClick={testConnection}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 mb-6"
            >
              {loading ? 'Testing...' : 'Test Supabase Connection'}
            </button>
            
            {result && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">{result}</pre>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="font-bold mb-2">📋 Expected .env.local file:</p>
              <code className="text-sm block bg-gray-800 text-green-400 p-3 rounded">
                NEXT_PUBLIC_SUPABASE_URL=https://cjhzonmmcwvlxcnsgdna.supabase.co<br />
                NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
              </code>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}