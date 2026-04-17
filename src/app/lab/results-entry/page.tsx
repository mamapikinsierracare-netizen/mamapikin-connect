// src/app/lab/results-entry/page.tsx
import { Suspense } from 'react'
import ResultsEntryContent from './ResultsEntryContent'

export default function ResultsEntryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="text-center py-12 text-gray-500">Loading results entry...</div>
      </div>
    }>
      <ResultsEntryContent />
    </Suspense>
  )
}