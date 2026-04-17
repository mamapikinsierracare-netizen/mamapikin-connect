// src/components/EmergencyCard.tsx
'use client'

import { useRef } from 'react'
import Image from 'next/image'

type PatientInfo = {
  name: string
  patientId: string
  bloodGroup: string
  allergies: string
  emergencyContact: string
  emergencyPhone: string
}

export default function EmergencyCard({ patient }: { patient: PatientInfo }) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printContent = cardRef.current?.innerHTML
    const printWindow = window.open('', '_blank')
    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Emergency Card - ${patient.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
              .card { width: 85.6mm; height: 54mm; background: white; margin: 0 auto; padding: 5mm; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
              .card-front, .card-back { page-break-after: avoid; margin-bottom: 20px; }
              @media print {
                body { background: white; padding: 0; }
                .card { box-shadow: none; border: 1px solid #ddd; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `)
      printWindow.print()
      printWindow.close()
    }
  }

  return (
    <div className="space-y-4">
      {/* Front of Card */}
      <div ref={cardRef} className="bg-white rounded-xl shadow-lg p-4 border-2 border-green-200" style={{ width: '85.6mm', height: '54mm' }}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1">
            <span className="text-xl">👶</span>
            <span className="font-bold text-green-700">MamaPikin Connect</span>
          </div>
          <span className="text-xs text-gray-500">SierraCare</span>
        </div>
        
        <div className="flex justify-center mb-2">
          <div className="bg-gray-100 p-2 rounded-lg">
            <svg width="60" height="60" viewBox="0 0 100 100" className="mx-auto">
              <rect x="10" y="10" width="80" height="80" fill="black" />
              {/* QR code placeholder - in production, use actual QR code library */}
            </svg>
          </div>
        </div>
        
        <div className="text-xs">
          <div><strong>Name:</strong> {patient.name}</div>
          <div><strong>ID:</strong> {patient.patientId}</div>
          <div><strong>Blood:</strong> {patient.bloodGroup || 'N/A'} | <strong>Allergies:</strong> {patient.allergies || 'None'}</div>
          <div><strong>Emergency:</strong> {patient.emergencyContact} ({patient.emergencyPhone})</div>
        </div>
        
        <div className="text-center text-[10px] text-gray-400 mt-1">
          Scan QR for medical info - No login required
        </div>
      </div>

      {/* Back of Card */}
      <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-red-200" style={{ width: '85.6mm', height: '54mm' }}>
        <div className="text-center font-bold text-red-700 text-sm mb-1">EMERGENCY NUMBERS</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
          <div>🚑 Ambulance: <span className="font-bold">999</span></div>
          <div>👮 Police: <span className="font-bold">112</span></div>
          <div>🔥 Fire: <span className="font-bold">999</span></div>
          <div>🦠 Ebola: <span className="font-bold">117</span></div>
          <div>👶 Child: <span className="font-bold">116</span></div>
          <div>🤝 GBV: <span className="font-bold">0800-111-222</span></div>
        </div>
        
        <div className="text-[10px] font-bold text-red-600 mt-2 text-center">DANGER SIGNS - SEEK HELP:</div>
        <div className="grid grid-cols-4 gap-0.5 text-[9px] text-center">
          <div>🤕 Headache</div>
          <div>👁️ Blurred</div>
          <div>✋ Swelling</div>
          <div>🌡️ Fever</div>
          <div>🩸 Bleeding</div>
          <div>👶 Reduced</div>
          <div>😵 Convulsions</div>
          <div>😤 Breathing</div>
        </div>
        
        <div className="text-center text-[8px] text-gray-400 mt-1">"Your health, our priority"</div>
      </div>

      <button onClick={handlePrint} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
        🖨️ Print Emergency Card
      </button>
    </div>
  )
}