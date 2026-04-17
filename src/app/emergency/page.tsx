// src/app/emergency/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

type EmergencyContact = {
  id: string
  name: string
  phone: string
  alternativePhone?: string
  category: 'national' | 'district' | 'hospital' | 'maternity' | 'chw'
  district?: string
  facility?: string
  operatingHours?: string
  isActive: boolean
}

const emergencyContacts: EmergencyContact[] = [
  // National
  { id: '1', name: 'National Ambulance Service', phone: '999', category: 'national', operatingHours: '24/7', isActive: true },
  { id: '2', name: 'National Police Emergency', phone: '112', category: 'national', operatingHours: '24/7', isActive: true },
  { id: '3', name: 'Fire Brigade', phone: '999', category: 'national', operatingHours: '24/7', isActive: true },
  { id: '4', name: 'Ebola Hotline', phone: '117', category: 'national', operatingHours: '24/7', isActive: true },
  { id: '5', name: 'Child Helpline', phone: '116', category: 'national', operatingHours: '24/7', isActive: true },
  { id: '6', name: 'GBV Hotline', phone: '0800-111-222', category: 'national', operatingHours: '24/7', isActive: true },
  
  // Bombali District
  { id: '7', name: 'Kabala Government Hospital Emergency', phone: '076-456-789', alternativePhone: '076-456-790', category: 'hospital', district: 'Bombali', facility: 'Kabala Hospital', operatingHours: '24/7', isActive: true },
  { id: '8', name: 'Kabala Maternity Emergency', phone: '076-456-791', category: 'maternity', district: 'Bombali', facility: 'Kabala Hospital', operatingHours: '24/7', isActive: true },
  { id: '9', name: 'Bombali CHW Coordinator', phone: '076-456-792', category: 'chw', district: 'Bombali', operatingHours: '8am-4pm weekdays', isActive: true },
  
  // Kenema District
  { id: '10', name: 'Kenema Government Hospital Emergency', phone: '076-234-567', alternativePhone: '076-234-568', category: 'hospital', district: 'Kenema', facility: 'Kenema Hospital', operatingHours: '24/7', isActive: true },
  { id: '11', name: 'Kenema Maternity Emergency', phone: '076-234-569', category: 'maternity', district: 'Kenema', operatingHours: '24/7', isActive: true },
  { id: '12', name: 'Kenema CHW Coordinator', phone: '076-234-570', category: 'chw', district: 'Kenema', operatingHours: '8am-4pm weekdays', isActive: true },
  
  // Western Urban
  { id: '13', name: 'PCMH Emergency', phone: '076-901-234', alternativePhone: '076-901-235', category: 'hospital', district: 'Western Urban', facility: 'Princess Christian Maternity', operatingHours: '24/7', isActive: true },
  { id: '14', name: 'PCMH Maternity Emergency', phone: '076-901-236', category: 'maternity', district: 'Western Urban', operatingHours: '24/7', isActive: true },
  { id: '15', name: 'Western Urban CHW Coordinator', phone: '076-901-237', category: 'chw', district: 'Western Urban', operatingHours: '8am-4pm weekdays', isActive: true },
]

export default function EmergencyPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online')
  const [smsMessage, setSmsMessage] = useState('')
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null)

  const districts = ['all', 'Bombali', 'Kenema', 'Kono', 'Kailahun', 'Western Urban', 'Western Rural', 'Bo', 'Bonthe', 'Pujehun', 'Moyamba', 'Tonkolili', 'Port Loko', 'Kambia', 'Koinadugu']

  useEffect(() => {
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

  const filteredContacts = emergencyContacts.filter(contact => {
    if (selectedDistrict !== 'all' && contact.district !== selectedDistrict) return false
    if (searchTerm && !contact.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return contact.isActive
  })

  const nationalContacts = filteredContacts.filter(c => c.category === 'national')
  const districtContacts = filteredContacts.filter(c => c.category !== 'national')

  function makeCall(phoneNumber: string) {
    window.location.href = `tel:${phoneNumber.replace(/-/g, '')}`
  }

  function sendEmergencySms(contact: EmergencyContact, patientInfo?: any) {
    const message = `🚨 EMERGENCY ALERT - MamaPikin Connect\n\nPatient: ${patientInfo?.name || 'Unknown'}\nID: ${patientInfo?.id || 'N/A'}\nLocation: ${patientInfo?.location || 'Unknown'}\nEmergency: Danger signs detected\nTime: ${new Date().toLocaleString()}\n\nPlease respond immediately.`
    window.location.href = `sms:${contact.phone.replace(/-/g, '')}?body=${encodeURIComponent(message)}`
  }

  function getCategoryIcon(category: string) {
    switch(category) {
      case 'national': return '🚨'
      case 'hospital': return '🏥'
      case 'maternity': return '🤰'
      case 'chw': return '👩‍⚕️'
      default: return '📞'
    }
  }

  function getCategoryColor(category: string) {
    switch(category) {
      case 'national': return 'bg-red-100 border-red-500 text-red-800'
      case 'hospital': return 'bg-blue-100 border-blue-500 text-blue-800'
      case 'maternity': return 'bg-pink-100 border-pink-500 text-pink-800'
      case 'chw': return 'bg-green-100 border-green-500 text-green-800'
      default: return 'bg-gray-100 border-gray-500'
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-red-700">🚨 Emergency Contacts</h1>
            <p className="text-gray-600">Life-saving numbers – always available offline</p>
            {connectionStatus === 'offline' && (
              <div className="mt-2 inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                📡 Offline Mode - Contacts still available
              </div>
            )}
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                {districts.map(d => <option key={d} value={d}>{d === 'all' ? 'All Districts' : d}</option>)}
              </select>
            </div>
          </div>

          {/* National Emergency Numbers (Always on top) */}
          {nationalContacts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-red-700 mb-3">🚨 National Emergency</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {nationalContacts.map(contact => (
                  <div key={contact.id} className={`p-4 rounded-lg border-2 text-center ${getCategoryColor(contact.category)}`}>
                    <div className="text-3xl mb-2">{getCategoryIcon(contact.category)}</div>
                    <div className="font-bold">{contact.name}</div>
                    <div className="text-2xl font-mono my-2">{contact.phone}</div>
                    <div className="text-xs">{contact.operatingHours}</div>
                    <button
                      onClick={() => makeCall(contact.phone)}
                      className="mt-2 w-full py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                      📞 Call Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* District Contacts */}
          {districtContacts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-blue-700 mb-3">📍 District Contacts</h2>
              <div className="space-y-3">
                {districtContacts.map(contact => (
                  <div key={contact.id} className={`p-4 rounded-lg border-2 ${getCategoryColor(contact.category)}`}>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getCategoryIcon(contact.category)}</span>
                          <div>
                            <div className="font-bold">{contact.name}</div>
                            <div className="text-sm text-gray-600">{contact.district} • {contact.facility || contact.category}</div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-xl font-mono">{contact.phone}</div>
                          {contact.alternativePhone && <div className="text-sm">Alt: {contact.alternativePhone}</div>}
                          <div className="text-xs text-gray-500 mt-1">{contact.operatingHours}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => makeCall(contact.phone)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                        >
                          📞 Call
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContact(contact)
                            setShowSmsModal(true)
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          📱 SMS Alert
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Notice */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>⚠️ Emergency numbers are stored locally and work without internet.</p>
            <p>📱 One-tap calling uses your device's dialer.</p>
          </div>
        </div>
      </div>

      {/* SMS Modal */}
      {showSmsModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Send Emergency SMS</h2>
              <button onClick={() => setShowSmsModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mb-4">
              <p className="font-medium">To: {selectedContact.name}</p>
              <p className="text-gray-500">{selectedContact.phone}</p>
            </div>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Emergency message..."
              className="w-full px-3 py-2 border rounded-lg h-32"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  const finalMessage = smsMessage || `🚨 EMERGENCY ALERT - Please call back immediately. Patient requires urgent care.`
                  window.location.href = `sms:${selectedContact.phone.replace(/-/g, '')}?body=${encodeURIComponent(finalMessage)}`
                }}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Send SMS Alert
              </button>
              <button onClick={() => setShowSmsModal(false)} className="px-4 py-2 bg-gray-300 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}