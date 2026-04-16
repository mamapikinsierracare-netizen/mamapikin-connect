// src/app/lab/page.tsx
'use client'

import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function LabDashboard() {
  const modules = [
    { name: 'Order Entry', path: '/lab/order', icon: '📝', color: 'bg-blue-100', description: 'Create new test orders' },
    { name: 'Sample Reception', path: '/lab/reception', icon: '📦', color: 'bg-indigo-100', description: 'Log incoming samples, accept/reject' },
    { name: 'Worklist', path: '/lab/worklist', icon: '📋', color: 'bg-purple-100', description: 'View samples by status, priority' },
    { name: 'Results Entry', path: '/lab/results-entry', icon: '✏️', color: 'bg-green-100', description: 'Enter and verify test results' },
    { name: 'Completed Results', path: '/lab/completed', icon: '✅', color: 'bg-teal-100', description: 'Share reports (5 formats)' },
    { name: 'Test Catalog', path: '/lab/catalog', icon: '📚', color: 'bg-gray-100', description: 'Manage test definitions' },
    { name: 'Quality Control', path: '/lab/qc', icon: '📊', color: 'bg-yellow-100', description: 'QC runs, Levey-Jennings charts' },
    { name: 'Inventory', path: '/lab/inventory', icon: '📦', color: 'bg-orange-100', description: 'Reagents & consumables' },
    { name: 'Reports & Analytics', path: '/lab/reports', icon: '📈', color: 'bg-indigo-100', description: 'TAT, workload, KPIs' },
  ]

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700">🧪 Laboratory Information System</h1>
            <p className="text-gray-600">ISO 15189:2022 Compliant | Sierra Leone National Health Laboratory Network</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod) => (
              <Link key={mod.path} href={mod.path} className={`${mod.color} rounded-xl p-6 transition-transform hover:scale-105 shadow-md border-l-4 border-green-500`}>
                <div className="text-5xl mb-3">{mod.icon}</div>
                <h2 className="text-xl font-bold text-gray-800">{mod.name}</h2>
                <p className="text-sm text-gray-600 mt-2">{mod.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}