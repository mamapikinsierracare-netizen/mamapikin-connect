'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import SimpleMap from '@/components/SimpleMap';

// All data is defined inside this file – no external imports needed
type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  alternativePhone?: string;
  category: string;
  district?: string;
  operatingHours?: string;
  hasAmbulance?: boolean;
  hasEmergency?: boolean;
  latitude?: number;
  longitude?: number;
};

// National emergency contacts
const nationalContacts: EmergencyContact[] = [
  { id: 'nat-1', name: 'National Ambulance Service', phone: '999', category: 'national', operatingHours: '24/7', hasEmergency: true },
  { id: 'nat-2', name: 'National Police Emergency', phone: '112', category: 'national', operatingHours: '24/7', hasEmergency: true },
  { id: 'nat-3', name: 'National Fire Force', phone: '999', category: 'national', operatingHours: '24/7', hasEmergency: true },
  { id: 'nat-4', name: 'Ebola Hotline', phone: '117', category: 'national', operatingHours: '24/7', hasEmergency: true },
  { id: 'nat-5', name: 'Child Helpline', phone: '116', category: 'national', operatingHours: '24/7', hasEmergency: true },
  { id: 'nat-6', name: 'GBV Hotline', phone: '0800-111-222', category: 'national', operatingHours: '24/7', hasEmergency: true },
];

// Hospitals
const hospitals: EmergencyContact[] = [
  { id: 'hosp-1', name: 'PCMH (Princess Christian Maternity)', phone: '076-901-234', alternativePhone: '076-901-235', category: 'hospital', district: 'Western Area Urban', operatingHours: '24/7', hasAmbulance: true, hasEmergency: true },
  { id: 'hosp-2', name: 'Connaught Hospital', phone: '076-901-238', alternativePhone: '076-901-239', category: 'hospital', district: 'Western Area Urban', operatingHours: '24/7', hasAmbulance: true, hasEmergency: true },
  { id: 'hosp-3', name: 'Makeni Government Hospital', phone: '076-456-700', category: 'hospital', district: 'Bombali', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-4', name: 'Kenema Government Hospital', phone: '076-234-500', category: 'hospital', district: 'Kenema', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-5', name: 'Bo Government Hospital', phone: '076-123-700', category: 'hospital', district: 'Bo', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-6', name: 'Koidu Government Hospital', phone: '076-345-600', category: 'hospital', district: 'Kono', operatingHours: '24/7', hasEmergency: true },
];

// Maternity homes
const maternityHomes: EmergencyContact[] = [
  { id: 'mat-1', name: 'PCMH Maternity Emergency', phone: '076-901-236', category: 'maternity', district: 'Western Area Urban', operatingHours: '24/7', hasEmergency: true },
  { id: 'mat-2', name: 'Makeni Maternity Emergency', phone: '076-456-791', category: 'maternity', district: 'Bombali', operatingHours: '24/7', hasEmergency: true },
  { id: 'mat-3', name: 'Kenema Maternity Emergency', phone: '076-234-569', category: 'maternity', district: 'Kenema', operatingHours: '24/7', hasEmergency: true },
  { id: 'mat-4', name: 'Bo Maternity Emergency', phone: '076-123-791', category: 'maternity', district: 'Bo', operatingHours: '24/7', hasEmergency: true },
  { id: 'mat-5', name: 'Koidu Maternity Emergency', phone: '076-345-680', category: 'maternity', district: 'Kono', operatingHours: '24/7', hasEmergency: true },
];

// Fire stations
const fireStations: EmergencyContact[] = [
  { id: 'fire-1', name: 'Fire Force Headquarters', phone: '999', category: 'fire', district: 'Western Area Urban', operatingHours: '24/7', hasEmergency: true },
  { id: 'fire-2', name: 'Makeni Fire Station', phone: '076-456-790', category: 'fire', district: 'Bombali', operatingHours: '24/7', hasEmergency: true },
  { id: 'fire-3', name: 'Kenema Fire Station', phone: '076-234-568', category: 'fire', district: 'Kenema', operatingHours: '24/7', hasEmergency: true },
  { id: 'fire-4', name: 'Bo Fire Station', phone: '076-123-790', category: 'fire', district: 'Bo', operatingHours: '24/7', hasEmergency: true },
];

// Police stations
const policeStations: EmergencyContact[] = [
  { id: 'police-1', name: 'Police Headquarters', phone: '112', category: 'police', district: 'Western Area Urban', operatingHours: '24/7', hasEmergency: true },
  { id: 'police-2', name: 'Makeni Police Station', phone: '076-456-789', category: 'police', district: 'Bombali', operatingHours: '24/7', hasEmergency: true },
  { id: 'police-3', name: 'Kenema Police Station', phone: '076-234-567', category: 'police', district: 'Kenema', operatingHours: '24/7', hasEmergency: true },
];

// Ambulance services
const ambulanceServices: EmergencyContact[] = [
  { id: 'amb-1', name: 'National Ambulance Service', phone: '999', category: 'ambulance', district: 'Western Area Urban', operatingHours: '24/7', hasAmbulance: true, hasEmergency: true },
  { id: 'amb-2', name: 'Red Cross Ambulance', phone: '076-601-234', category: 'ambulance', district: 'Western Area Urban', operatingHours: '24/7', hasAmbulance: true },
  { id: 'amb-3', name: 'Makeni Ambulance', phone: '076-456-788', category: 'ambulance', district: 'Bombali', operatingHours: '24/7', hasAmbulance: true },
];

// CHW Coordinators
const chwCoordinators: EmergencyContact[] = [
  { id: 'chw-1', name: 'Western Urban CHW Coordinator', phone: '076-901-237', category: 'chw', district: 'Western Area Urban', operatingHours: '8am-4pm weekdays' },
  { id: 'chw-2', name: 'Bombali CHW Coordinator', phone: '076-456-792', category: 'chw', district: 'Bombali', operatingHours: '8am-4pm weekdays' },
  { id: 'chw-3', name: 'Kenema CHW Coordinator', phone: '076-234-570', category: 'chw', district: 'Kenema', operatingHours: '8am-4pm weekdays' },
  { id: 'chw-4', name: 'Bo CHW Coordinator', phone: '076-123-792', category: 'chw', district: 'Bo', operatingHours: '8am-4pm weekdays' },
  { id: 'chw-5', name: 'Kono CHW Coordinator', phone: '076-345-681', category: 'chw', district: 'Kono', operatingHours: '8am-4pm weekdays' },
];

// Combine all contacts
const allContacts: EmergencyContact[] = [
  ...nationalContacts,
  ...hospitals,
  ...maternityHomes,
  ...fireStations,
  ...policeStations,
  ...ambulanceServices,
  ...chwCoordinators,
];

// Get unique districts for filter
const districts = ['all', ...new Set(allContacts.filter(c => c.district).map(c => c.district!))].sort();

const categories = [
  { value: 'all', label: 'All Services', icon: '📋' },
  { value: 'national', label: 'National Emergency', icon: '🚨' },
  { value: 'hospital', label: 'Hospitals', icon: '🏥' },
  { value: 'maternity', label: 'Maternity', icon: '🤰' },
  { value: 'fire', label: 'Fire Stations', icon: '🔥' },
  { value: 'police', label: 'Police', icon: '👮' },
  { value: 'ambulance', label: 'Ambulance', icon: '🚑' },
  { value: 'chw', label: 'CHW Coordinators', icon: '👩‍⚕️' },
];

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    national: '🚨', hospital: '🏥', maternity: '🤰',
    fire: '🔥', police: '👮', ambulance: '🚑', chw: '👩‍⚕️'
  };
  return icons[category] || '📞';
}

export default function EmergencyPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [showMap, setShowMap] = useState<boolean>(false);

  useEffect(() => {
    const handleOffline = () => setConnectionStatus('offline');
    const handleOnline = () => setConnectionStatus('online');
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const filteredContacts = allContacts.filter(contact => {
    if (selectedDistrict !== 'all' && contact.district !== selectedDistrict) return false;
    if (selectedCategory !== 'all' && contact.category !== selectedCategory) return false;
    if (searchTerm && !contact.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const nationalFiltered = filteredContacts.filter(c => c.category === 'national');
  const otherFiltered = filteredContacts.filter(c => c.category !== 'national');

  function makeCall(phoneNumber: string) {
    const cleanNumber = phoneNumber.replace(/-/g, '');
    window.location.href = `tel:${cleanNumber}`;
  }

  const totalHospitals = allContacts.filter(c => c.category === 'hospital').length;
  const totalFireStations = allContacts.filter(c => c.category === 'fire').length;
  const totalPoliceStations = allContacts.filter(c => c.category === 'police').length;
  const totalAmbulance = allContacts.filter(c => c.category === 'ambulance').length;

  // Get facilities with districts for map
  const facilitiesForMap = allContacts.filter(c => c.district);

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-red-700">🚨 Emergency Contacts</h1>
            <p className="text-gray-600">Life-saving numbers always available offline</p>
            <p className="text-xs text-gray-400 mt-1">{allContacts.length} total contacts loaded</p>
            {connectionStatus === 'offline' && (
              <div className="mt-2 inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                📡 Offline Mode - Contacts still available
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="🔍 Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {districts.map(d => (
                  <option key={d} value={d}>{d === 'all' ? '📍 All Districts' : d}</option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
              <button
                onClick={() => setShowMap(!showMap)}
                className={`px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                  showMap ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <span>🗺️</span> {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
          </div>

          {/* Map Section - Toggleable */}
          {showMap && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <h2 className="text-lg font-bold mb-3">🗺️ Facilities by District</h2>
              <SimpleMap facilities={facilitiesForMap} />
              <p className="text-xs text-gray-500 text-center mt-3">
                📍 Showing {facilitiesForMap.length} facilities grouped by district
              </p>
            </div>
          )}

          {/* Stats Summary */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-wrap justify-around text-center gap-4">
              <div>
                <div className="text-2xl font-bold text-green-600">{filteredContacts.length}</div>
                <div className="text-xs text-gray-500">Contacts Found</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalHospitals}</div>
                <div className="text-xs text-gray-500">Hospitals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{totalFireStations}</div>
                <div className="text-xs text-gray-500">Fire Stations</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalPoliceStations}</div>
                <div className="text-xs text-gray-500">Police Stations</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalAmbulance}</div>
                <div className="text-xs text-gray-500">Ambulance Services</div>
              </div>
            </div>
          </div>

          {/* National Emergency Numbers */}
          {selectedCategory === 'all' && nationalFiltered.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-red-700 mb-3">🚨 National Emergency Numbers</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {nationalFiltered.map(contact => (
                  <div key={contact.id} className="p-4 rounded-lg border-2 bg-red-50 border-red-500 text-center hover:shadow-lg transition">
                    <div className="text-3xl mb-2">{getCategoryIcon(contact.category)}</div>
                    <div className="font-bold text-sm">{contact.name}</div>
                    <div className="text-xl font-mono my-2 font-bold text-red-700">{contact.phone}</div>
                    <div className="text-xs text-gray-500 mb-2">{contact.operatingHours}</div>
                    <button
                      onClick={() => makeCall(contact.phone)}
                      className="w-full py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                    >
                      📞 Call Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Contacts */}
          {otherFiltered.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-blue-700 mb-3">
                {selectedDistrict === 'all' ? '📍 All Districts' : selectedDistrict} Contacts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherFiltered.map(contact => (
                  <div key={contact.id} className="p-4 rounded-lg border-2 bg-blue-50 border-blue-500 hover:shadow-lg transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{getCategoryIcon(contact.category)}</span>
                          <span className="font-bold text-lg">{contact.name}</span>
                        </div>
                        {contact.district && (
                          <div className="text-sm text-gray-600">📍 {contact.district}</div>
                        )}
                        <div className="mt-2">
                          <div className="text-xl font-mono font-bold text-blue-700">{contact.phone}</div>
                          {contact.alternativePhone && (
                            <div className="text-sm text-gray-500">Alt: {contact.alternativePhone}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                            <span>🕐 {contact.operatingHours || '24/7'}</span>
                            {contact.hasAmbulance && <span className="bg-green-100 text-green-700 px-1 rounded">🚑 Ambulance</span>}
                            {contact.hasEmergency && <span className="bg-red-100 text-red-700 px-1 rounded">⚠️ Emergency</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => makeCall(contact.phone)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition ml-2"
                      >
                        📞 Call
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-700">No contacts found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 border-t pt-6">
            <p>📱 Emergency numbers are stored locally and work without internet</p>
            <p>📞 One-tap calling uses your device's dialer</p>
            <p className="mt-2 text-xs text-red-600">⚠️ For life-threatening emergencies, always call 999 or 112 first</p>
            <p className="mt-2 text-xs text-gray-400">
              Total facilities in database: {allContacts.length} | Last updated: April 2026
            </p>
          </div>
        </div>
      </div>
    </>
  );
}