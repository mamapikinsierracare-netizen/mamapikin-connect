// src/app/maps/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

type Facility = {
  id: string
  name: string
  type: 'hospital' | 'chc' | 'chp' | 'clinic'
  district: string
  village: string
  lat: number
  lng: number
  phone: string
  emergencyPhone: string
  services: string[]
  ambulance: boolean
}

// Sample facilities (in production, load from Supabase)
const facilities: Facility[] = [
  { id: '1', name: 'Kabala Government Hospital', type: 'hospital', district: 'Bombali', village: 'Kabala', lat: 9.5833, lng: -11.55, phone: '076-456-789', emergencyPhone: '076-456-790', services: ['ANC', 'Delivery', 'C-section', 'Lab', 'Pharmacy', 'Blood Bank'], ambulance: true },
  { id: '2', name: 'Kabala CHC', type: 'chc', district: 'Bombali', village: 'Kabala', lat: 9.58, lng: -11.545, phone: '076-456-791', emergencyPhone: '076-456-792', services: ['ANC', 'Delivery', 'Immunisation', 'Lab'], ambulance: false },
  { id: '3', name: 'Yiraia CHP', type: 'chp', district: 'Bombali', village: 'Yiraia', lat: 9.55, lng: -11.5, phone: '076-456-793', emergencyPhone: '076-456-794', services: ['ANC', 'Immunisation'], ambulance: false },
  { id: '4', name: 'Makeni Government Hospital', type: 'hospital', district: 'Bombali', village: 'Makeni', lat: 8.8833, lng: -12.05, phone: '076-456-795', emergencyPhone: '076-456-796', services: ['ANC', 'Delivery', 'C-section', 'Lab', 'Pharmacy', 'Blood Bank', 'Ultrasound'], ambulance: true },
  { id: '5', name: 'PCMH Freetown', type: 'hospital', district: 'Western Urban', village: 'Freetown', lat: 8.4844, lng: -13.234, phone: '076-901-234', emergencyPhone: '076-901-235', services: ['ANC', 'Delivery', 'C-section', 'Lab', 'Pharmacy', 'Blood Bank', 'NICU', 'Ultrasound'], ambulance: true },
]

export default function MapsPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterService, setFilterService] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online')
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
          setLocationError('')
        },
        (error) => {
          setLocationError('Unable to get your location. Please enter manually.')
        }
      )
    } else {
      setLocationError('Geolocation is not supported by your browser.')
    }

    // Detect offline status
    const handleOffline = () => setConnectionStatus('offline')
    const handleOnline = () => setConnectionStatus('online')
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Calculate distance between two coordinates (Haversine formula)
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Filter and sort facilities by distance
  const filteredFacilities = facilities
    .filter(f => {
      if (filterType !== 'all' && f.type !== filterType) return false
      if (filterService !== 'all' && !f.services.includes(filterService)) return false
      if (searchTerm && !f.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
    .map(f => ({
      ...f,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, f.lat, f.lng) : null
    }))
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))

  function getFacilityIcon(type: string) {
    switch(type) {
      case 'hospital': return '🏥'
      case 'chc': return '🏥'
      case 'chp': return '🏠'
      default: return '🏥'
    }
  }

  function getFacilityColor(type: string) {
    switch(type) {
      case 'hospital': return 'bg-green-100 border-green-500'
      case 'chc': return 'bg-yellow-100 border-yellow-500'
      case 'chp': return 'bg-orange-100 border-orange-500'
      default: return 'bg-gray-100'
    }
  }

  function getServiceIcon(service: string) {
    const icons: Record<string, string> = {
      'ANC': '🤰', 'Delivery': '👶', 'C-section': '🔪', 'Lab': '🔬', 
      'Pharmacy': '💊', 'Blood Bank': '🩸', 'Immunisation': '💉', 
      'NICU': '🍼', 'Ultrasound': '📷'
    }
    return icons[service] || '✅'
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">📍 Health Facility Locator</h1>
            <p className="text-gray-600">Find nearest health facilities – works offline</p>
            {connectionStatus === 'offline' && (
              <div className="mt-2 inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                📡 Offline Mode - Map data cached
              </div>
            )}
          </div>

          {/* Location Status */}
          {userLocation && (
            <div className="bg-green-50 rounded-lg p-3 mb-4 text-center text-green-800">
              📍 Your location detected: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </div>
          )}
          {locationError && (
            <div className="bg-yellow-50 rounded-lg p-3 mb-4 text-center text-yellow-800">
              ⚠️ {locationError}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Search facility name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="all">All Facility Types</option>
                <option value="hospital">Hospitals</option>
                <option value="chc">CHC</option>
                <option value="chp">CHP</option>
              </select>
              <select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="all">All Services</option>
                <option value="ANC">ANC</option>
                <option value="Delivery">Delivery</option>
                <option value="C-section">C-section</option>
                <option value="Lab">Lab</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Blood Bank">Blood Bank</option>
                <option value="NICU">NICU</option>
              </select>
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                      () => setLocationError('Unable to get location')
                    )
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📍 Refresh Location
              </button>
            </div>
          </div>

          {/* Facilities List */}
          <div className="space-y-3">
            {filteredFacilities.map((facility, index) => (
              <div key={facility.id} className={`p-4 rounded-lg border-2 ${getFacilityColor(facility.type)} shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{getFacilityIcon(facility.type)}</span>
                      <div>
                        <div className="font-bold text-lg">
                          {index + 1}. {facility.name}
                          {facility.ambulance && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🚑 Ambulance</span>}
                        </div>
                        <div className="text-sm text-gray-600">{facility.village}, {facility.district} District</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {facility.services.map(service => (
                        <span key={service} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                          {getServiceIcon(service)} {service}
                        </span>
                      ))}
                    </div>
                    {facility.distance !== null && (
                      <div className="mt-2 text-sm">
                        📍 Distance: <strong>{facility.distance.toFixed(1)} km</strong>
                        {facility.distance < 5 && <span className="ml-2 text-green-600">(Very close)</span>}
                        {facility.distance >= 5 && facility.distance < 20 && <span className="ml-2 text-yellow-600">(Within district)</span>}
                        {facility.distance >= 20 && <span className="ml-2 text-red-600">(Far - need transport)</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => window.location.href = `tel:${facility.emergencyPhone.replace(/-/g, '')}`}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                      🚨 Emergency Call
                    </button>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      🗺️ Get Directions
                    </button>
                    <button
                      onClick={() => setSelectedFacility(facility)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      📋 View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredFacilities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No facilities found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Facility Details Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedFacility.name}</h2>
              <button onClick={() => setSelectedFacility(null)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p><strong>📍 Location:</strong> {selectedFacility.village}, {selectedFacility.district} District</p>
                <p><strong>📞 Phone:</strong> {selectedFacility.phone}</p>
                <p><strong>🚨 Emergency:</strong> {selectedFacility.emergencyPhone}</p>
                <p><strong>🚑 Ambulance:</strong> {selectedFacility.ambulance ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <strong>🩺 Services Available:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedFacility.services.map(service => (
                    <span key={service} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">{service}</span>
                  ))}
                </div>
              </div>
              {userLocation && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <strong>📍 Distance from you:</strong> {calculateDistance(userLocation.lat, userLocation.lng, selectedFacility.lat, selectedFacility.lng).toFixed(1)} km
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => window.location.href = `tel:${selectedFacility.emergencyPhone.replace(/-/g, '')}`} className="flex-1 py-2 bg-red-600 text-white rounded-lg">📞 Emergency Call</button>
              <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedFacility.lat},${selectedFacility.lng}`)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg">🗺️ Directions</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}