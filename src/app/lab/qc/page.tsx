// src/app/lab/qc/page.tsx
'use client'

import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function QCPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/lab" className="text-green-600 hover:text-green-800">← Back to Lab</Link>
          <h1 className="text-2xl font-bold text-yellow-700 mt-4">📊 Quality Control</h1>
          <div className="bg-white rounded-lg shadow-md p-6 mt-6 text-center text-gray-500">
            <p>QC module coming soon. This will include Levey‑Jennings charts and Westgard rule analysis.</p>
          </div>
        </div>
      </div>
    </>
  )
}