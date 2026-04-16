// src/app/lab/reports/page.tsx
'use client'

import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function ReportsPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab" className="text-green-600 hover:text-green-800">← Back to Lab</Link>
            <h1 className="text-2xl font-bold text-indigo-700">📈 Reports & Analytics</h1>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 mt-6 text-center">
            <div className="text-gray-500">
              <p className="text-lg">Analytics Dashboard Coming Soon</p>
              <p className="text-sm mt-2">This will include:</p>
              <ul className="text-sm mt-2 list-disc list-inside">
                <li>Turnaround Time (TAT) by test</li>
                <li>Workload by technician</li>
                <li>QC performance charts</li>
                <li>Rejection rate analysis</li>
                <li>Critical value notification compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}