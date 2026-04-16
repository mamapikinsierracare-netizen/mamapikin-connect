// src/app/lab/catalog/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

type LabTest = {
  id: number
  test_id: string
  test_name: string
  test_category: string
  specimen_type: string
  normal_range: string
  unit: string
  turnaround_hours: number
  is_active: boolean
}

const getSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

const getSupabaseAnonKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

async function fetchFromSupabase<T>(endpoint: string): Promise<T[]> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    if (response.ok) return await response.json()
    return []
  } catch { return [] }
}

// Demo test data (30+ tests)
const demoTests: LabTest[] = [
  { id: 1, test_id: 'DEMO001', test_name: 'Complete Blood Count (CBC)', test_category: 'Hematology', specimen_type: 'Whole Blood', normal_range: 'See components', unit: 'N/A', turnaround_hours: 4, is_active: true },
  { id: 2, test_id: 'DEMO002', test_name: 'Hemoglobin (Hb)', test_category: 'Hematology', specimen_type: 'Whole Blood', normal_range: '11-15', unit: 'g/dL', turnaround_hours: 2, is_active: true },
  { id: 3, test_id: 'DEMO003', test_name: 'White Blood Cell Count', test_category: 'Hematology', specimen_type: 'Whole Blood', normal_range: '4-11', unit: 'x10^3/uL', turnaround_hours: 2, is_active: true },
  { id: 4, test_id: 'DEMO004', test_name: 'Platelet Count', test_category: 'Hematology', specimen_type: 'Whole Blood', normal_range: '150-450', unit: 'x10^3/uL', turnaround_hours: 2, is_active: true },
  { id: 5, test_id: 'DEMO005', test_name: 'Malaria RDT', test_category: 'Parasitology', specimen_type: 'Whole Blood', normal_range: 'Negative', unit: 'N/A', turnaround_hours: 1, is_active: true },
  { id: 6, test_id: 'DEMO006', test_name: 'HIV Rapid Test', test_category: 'Immunology', specimen_type: 'Whole Blood', normal_range: 'Non-reactive', unit: 'N/A', turnaround_hours: 1, is_active: true },
  { id: 7, test_id: 'DEMO007', test_name: 'Blood Glucose (Fasting)', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '70-100', unit: 'mg/dL', turnaround_hours: 2, is_active: true },
  { id: 8, test_id: 'DEMO008', test_name: 'Random Blood Glucose', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '70-140', unit: 'mg/dL', turnaround_hours: 2, is_active: true },
  { id: 9, test_id: 'DEMO009', test_name: 'Urinalysis', test_category: 'Urinalysis', specimen_type: 'Urine', normal_range: 'Normal', unit: 'N/A', turnaround_hours: 1, is_active: true },
  { id: 10, test_id: 'DEMO010', test_name: 'Pregnancy Test', test_category: 'Immunology', specimen_type: 'Urine', normal_range: 'Negative', unit: 'N/A', turnaround_hours: 1, is_active: true },
  { id: 11, test_id: 'DEMO011', test_name: 'Liver Function Test (ALT)', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '10-40', unit: 'U/L', turnaround_hours: 3, is_active: true },
  { id: 12, test_id: 'DEMO012', test_name: 'Liver Function Test (AST)', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '10-40', unit: 'U/L', turnaround_hours: 3, is_active: true },
  { id: 13, test_id: 'DEMO013', test_name: 'Creatinine', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '0.5-1.1', unit: 'mg/dL', turnaround_hours: 3, is_active: true },
  { id: 14, test_id: 'DEMO014', test_name: 'Blood Urea Nitrogen (BUN)', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '7-20', unit: 'mg/dL', turnaround_hours: 3, is_active: true },
  { id: 15, test_id: 'DEMO015', test_name: 'Thyroid Function Test (TSH)', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '0.4-4.0', unit: 'mIU/L', turnaround_hours: 4, is_active: true },
  { id: 16, test_id: 'DEMO016', test_name: 'Dengue NS1 Antigen', test_category: 'Immunology', specimen_type: 'Whole Blood', normal_range: 'Negative', unit: 'N/A', turnaround_hours: 2, is_active: true },
  { id: 17, test_id: 'DEMO017', test_name: 'Typhoid (Widal Test)', test_category: 'Immunology', specimen_type: 'Whole Blood', normal_range: 'Negative', unit: 'N/A', turnaround_hours: 2, is_active: true },
  { id: 18, test_id: 'DEMO018', test_name: 'Hepatitis B Surface Antigen', test_category: 'Immunology', specimen_type: 'Whole Blood', normal_range: 'Negative', unit: 'N/A', turnaround_hours: 2, is_active: true },
  { id: 19, test_id: 'DEMO019', test_name: 'Syphilis (VDRL)', test_category: 'Immunology', specimen_type: 'Whole Blood', normal_range: 'Non-reactive', unit: 'N/A', turnaround_hours: 2, is_active: true },
  { id: 20, test_id: 'DEMO020', test_name: 'Total Cholesterol', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '<200', unit: 'mg/dL', turnaround_hours: 3, is_active: true },
  { id: 21, test_id: 'DEMO021', test_name: 'Triglycerides', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '<150', unit: 'mg/dL', turnaround_hours: 3, is_active: true },
  { id: 22, test_id: 'DEMO022', test_name: 'HDL Cholesterol', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '>40', unit: 'mg/dL', turnaround_hours: 3, is_active: true },
  { id: 23, test_id: 'DEMO023', test_name: 'LDL Cholesterol', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '<100', unit: 'mg/dL', turnaround_hours: 3, is_active: true },
  { id: 24, test_id: 'DEMO024', test_name: 'HbA1c', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '4-5.6', unit: '%', turnaround_hours: 3, is_active: true },
  { id: 25, test_id: 'DEMO025', test_name: 'Urine Culture', test_category: 'Microbiology', specimen_type: 'Urine', normal_range: 'No growth', unit: 'N/A', turnaround_hours: 48, is_active: true },
  { id: 26, test_id: 'DEMO026', test_name: 'Blood Culture', test_category: 'Microbiology', specimen_type: 'Whole Blood', normal_range: 'No growth', unit: 'N/A', turnaround_hours: 72, is_active: true },
  { id: 27, test_id: 'DEMO027', test_name: 'Sputum AFB (TB)', test_category: 'Microbiology', specimen_type: 'Sputum', normal_range: 'Negative', unit: 'N/A', turnaround_hours: 48, is_active: true },
  { id: 28, test_id: 'DEMO028', test_name: 'Stool Ova and Parasite', test_category: 'Parasitology', specimen_type: 'Stool', normal_range: 'No parasites', unit: 'N/A', turnaround_hours: 24, is_active: true },
  { id: 29, test_id: 'DEMO029', test_name: 'Electrolytes (Na/K/Cl)', test_category: 'Biochemistry', specimen_type: 'Whole Blood', normal_range: '135-145/3.5-5.1/98-107', unit: 'mmol/L', turnaround_hours: 2, is_active: true },
  { id: 30, test_id: 'DEMO030', test_name: 'CRP (C-Reactive Protein)', test_category: 'Immunology', specimen_type: 'Whole Blood', normal_range: '<5', unit: 'mg/L', turnaround_hours: 2, is_active: true },
]

export default function CatalogPage() {
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    loadTests()
  }, [])

  async function loadTests() {
    setLoading(true)
    const tests = await fetchFromSupabase<LabTest>('lab_tests?is_active=eq.true&order=test_name.asc')
    if (tests.length > 0) {
      setLabTests(tests)
    } else {
      setLabTests(demoTests)
    }
    setLoading(false)
  }

  const categories = ['all', ...new Set(labTests.map(t => t.test_category))]

  const filteredTests = labTests.filter(test => {
    if (searchTerm && !test.test_name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (categoryFilter !== 'all' && test.test_category !== categoryFilter) return false
    return true
  })

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab" className="text-green-600 hover:text-green-800">← Back to Laboratory</Link>
            <h1 className="text-2xl font-bold text-green-700">📚 Test Catalog</h1>
          </div>
          
          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Search by test name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="text-center py-12">Loading tests...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Test Name</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Specimen</th>
                      <th className="px-4 py-3 text-left">Normal Range</th>
                      <th className="px-4 py-3 text-left">Unit</th>
                      <th className="px-4 py-3 text-left">TAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTests.map((test, idx) => (
                      <tr key={test.test_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-medium">{test.test_name}</td>
                        <td className="px-4 py-3 text-sm">{test.test_category}</td>
                        <td className="px-4 py-3 text-sm">{test.specimen_type}</td>
                        <td className="px-4 py-3 text-sm">{test.normal_range || '-'}</td>
                        <td className="px-4 py-3 text-sm">{test.unit}</td>
                        <td className="px-4 py-3 text-sm">{test.turnaround_hours} hours</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-4 bg-gray-50 border-t text-sm text-gray-500">
              Total Tests: {filteredTests.length}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}