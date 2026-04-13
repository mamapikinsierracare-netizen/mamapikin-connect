'use client'

import { useState } from 'react'

export default function TestPage() {
  const [result, setResult] = useState('')

  async function test() {
    setResult('Testing...')
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Try to get patient count
      const { data, error } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
      
      if (error) {
        setResult(`Error: ${error.message}`)
      } else {
        setResult(`✅ Connected! Patients table has data.`)
      }
    } catch (err: any) {
      setResult(`Failed: ${err.message}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <button 
        onClick={test}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Test Connection
      </button>
      <pre className="mt-4 p-4 bg-gray-100 rounded">{result}</pre>
    </div>
  )
}