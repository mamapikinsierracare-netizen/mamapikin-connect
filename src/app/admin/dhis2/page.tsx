// src/app/admin/dhis2/page.tsx
'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import { useRBAC } from '@/hooks/useRBAC'

export default function DHIS2ExportPage() {
  const { user, isAdmin, isMasterAdmin, isSuperAdmin } = useRBAC()
  const [loading, setLoading] = useState(false)
  const [exportData, setExportData] = useState<any>(null)
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const hasAccess = isAdmin() || isMasterAdmin() || isSuperAdmin() || 
                    user?.role === 'MASTER_ADMIN' || 
                    user?.role === 'SUPER_ADMIN' || 
                    user?.role === 'SYSTEM_ADMIN' ||
                    user?.role === 'FACILITY_ADMIN'

  if (!hasAccess) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-red-100 text-red-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>Only Administrators can access DHIS2 export.</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  async function handleExport() {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch(`/api/dhis2/export?period=${period}`)
      const data = await response.json()
      
      if (response.ok) {
        setExportData(data)
        setMessageType('success')
        setMessage('✅ DHIS2 export generated successfully')
      } else {
        setMessageType('error')
        setMessage(`❌ Export failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      setMessageType('error')
      setMessage('❌ Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function downloadCSV() {
    if (!exportData) return
    
    const headers = ['Data Element', 'Period', 'Org Unit', 'Value']
    const rows = exportData.dataValues.map((dv: any) => [
      dv.dataElement, exportData.period, exportData.orgUnit, dv.value
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dhis2_export_${exportData.period}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    setMessage('📥 CSV downloaded')
    setTimeout(() => setMessage(''), 3000)
  }

  function copyJSON() {
    if (!exportData) return
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
    setMessage('📋 JSON copied to clipboard')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">📤 DHIS2 Export</h1>
            <p className="text-gray-600">Export maternal and child health data to DHIS2 format</p>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Reporting Period</label>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM (e.g., 2026-04)</p>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className={`w-full py-2 rounded-lg text-white font-medium ${
                    loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? 'Generating...' : 'Generate DHIS2 Export'}
                </button>
              </div>
            </div>
          </div>
          
          {exportData && (
            <>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Export Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {exportData.dataValues.find((d: any) => d.dataElement === 'ANC1')?.value || 0}
                    </div>
                    <div className="text-sm text-gray-600">ANC 1st Visits</div>
                  </div>
                  <div className="text-center p-3 bg-pink-50 rounded-lg">
                    <div className="text-2xl font-bold text-pink-700">
                      {exportData.dataValues.find((d: any) => d.dataElement === 'ANC4')?.value || 0}
                    </div>
                    <div className="text-sm text-gray-600">ANC 4th Visits</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {exportData.dataValues.find((d: any) => d.dataElement === 'FacilityDeliveries')?.value || 0}
                    </div>
                    <div className="text-sm text-gray-600">Facility Deliveries</div>
                  </div>
                  <div className="text-center p-3 bg-teal-50 rounded-lg">
                    <div className="text-2xl font-bold text-teal-700">
                      {exportData.dataValues.find((d: any) => d.dataElement === 'FullyImmunised')?.value || 0}
                    </div>
                    <div className="text-sm text-gray-600">Fully Immunised Children</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📄 Export Formats</h2>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={downloadCSV}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    📥 Download CSV
                  </button>
                  <button
                    onClick={copyJSON}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    📋 Copy JSON
                  </button>
                </div>
                
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700 mb-2">JSON Preview:</h3>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(exportData, null, 2)}
                  </pre>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                  <strong>📌 How to send to DHIS2:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Download the CSV file or copy the JSON</li>
                    <li>Go to your DHIS2 instance → Data Entry → Select organisation unit and period</li>
                    <li>Import the CSV file or paste the JSON via API</li>
                    <li>Verify the data and complete</li>
                  </ol>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}