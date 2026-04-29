'use client'

import Navigation from '@/components/Navigation'

export default function EmergencyPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-red-700">Emergency Contacts</h1>
            <p className="text-gray-600">Life-saving numbers – always available offline</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">National Emergency Numbers</h2>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-bold">Ambulance</div>
                  <div className="text-2xl font-mono">999</div>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg">Call</button>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-bold">Police</div>
                  <div className="text-2xl font-mono">112</div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Call</button>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-bold">Fire Brigade</div>
                  <div className="text-2xl font-mono">999</div>
                </div>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg">Call</button>
              </div>
            </div>
            
            <h2 className="text-xl font-bold mt-6 mb-4">District Hospitals</h2>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <div>Kabala Government Hospital</div>
                <button className="px-3 py-1 bg-green-600 text-white rounded text-sm">Call</button>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <div>Kenema Government Hospital</div>
                <button className="px-3 py-1 bg-green-600 text-white rounded text-sm">Call</button>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <div>PCMH Freetown</div>
                <button className="px-3 py-1 bg-green-600 text-white rounded text-sm">Call</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

