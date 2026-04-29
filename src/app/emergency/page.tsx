// src/app/emergency/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabase';

// Types
type ContactCategory = 'ambulance' | 'police' | 'fire' | 'tba' | 'outbreak' | 'disaster' | 'district_health';

type EmergencyContact = {
  id: string;
  district: string;
  category: ContactCategory;
  name: string;
  phone: string;
  notes?: string;
};

type GroupedContacts = {
  [district: string]: {
    [category in ContactCategory]?: EmergencyContact[];
  };
};

// Default fallback data for 16 districts of Sierra Leone
// Replace phone numbers with real ones before deployment
const defaultContacts: EmergencyContact[] = [
  // Western Area (Freetown)
  { id: '1', district: 'Western Area Urban', category: 'ambulance', name: 'National Ambulance Service', phone: '999', notes: '24/7 emergency' },
  { id: '2', district: 'Western Area Urban', category: 'police', name: 'Police Headquarters', phone: '112', notes: 'Emergency' },
  { id: '3', district: 'Western Area Urban', category: 'fire', name: 'Fire Force HQ', phone: '119', notes: 'Fire emergencies' },
  { id: '4', district: 'Western Area Urban', category: 'tba', name: 'TBA Association', phone: '+23276123456', notes: 'Traditional birth attendants' },
  { id: '5', district: 'Western Area Urban', category: 'outbreak', name: 'Disease Surveillance', phone: '117', notes: 'Ebola/COVID hotline' },
  { id: '6', district: 'Western Area Urban', category: 'disaster', name: 'NDMA', phone: '+23278888888', notes: 'National Disaster Management' },
  { id: '7', district: 'Western Area Urban', category: 'district_health', name: 'Western Area DHMT', phone: '+23276456789', notes: 'District Health Office' },

  // Western Area Rural
  { id: '8', district: 'Western Area Rural', category: 'ambulance', name: 'Ambulance Service', phone: '999', notes: '' },
  { id: '9', district: 'Western Area Rural', category: 'police', name: 'Waterloo Police', phone: '112', notes: '' },
  { id: '10', district: 'Western Area Rural', category: 'district_health', name: 'Rural DHMT', phone: '+23276543210', notes: '' },

  // Bo District
  { id: '11', district: 'Bo', category: 'ambulance', name: 'Bo Ambulance', phone: '999', notes: '' },
  { id: '12', district: 'Bo', category: 'police', name: 'Bo Police', phone: '112', notes: '' },
  { id: '13', district: 'Bo', category: 'fire', name: 'Bo Fire Force', phone: '119', notes: '' },
  { id: '14', district: 'Bo', category: 'district_health', name: 'Bo DHMT', phone: '+23276456789', notes: '' },

  // Kenema
  { id: '15', district: 'Kenema', category: 'ambulance', name: 'Kenema Ambulance', phone: '999', notes: '' },
  { id: '16', district: 'Kenema', category: 'police', name: 'Kenema Police', phone: '112', notes: '' },
  { id: '17', district: 'Kenema', category: 'district_health', name: 'Kenema DHMT', phone: '+23276456789', notes: '' },

  // Kono
  { id: '18', district: 'Kono', category: 'ambulance', name: 'Kono Ambulance', phone: '999', notes: '' },
  { id: '19', district: 'Kono', category: 'police', name: 'Kono Police', phone: '112', notes: '' },
  { id: '20', district: 'Kono', category: 'district_health', name: 'Kono DHMT', phone: '+23276456789', notes: '' },

  // Bombali (Makeni)
  { id: '21', district: 'Bombali', category: 'ambulance', name: 'Makeni Ambulance', phone: '999', notes: '' },
  { id: '22', district: 'Bombali', category: 'police', name: 'Makeni Police', phone: '112', notes: '' },
  { id: '23', district: 'Bombali', category: 'district_health', name: 'Bombali DHMT', phone: '+23276456789', notes: '' },

  // Kailahun
  { id: '24', district: 'Kailahun', category: 'ambulance', name: 'Kailahun Ambulance', phone: '999', notes: '' },
  { id: '25', district: 'Kailahun', category: 'police', name: 'Kailahun Police', phone: '112', notes: '' },
  { id: '26', district: 'Kailahun', category: 'district_health', name: 'Kailahun DHMT', phone: '+23276456789', notes: '' },

  // Port Loko
  { id: '27', district: 'Port Loko', category: 'ambulance', name: 'Port Loko Ambulance', phone: '999', notes: '' },
  { id: '28', district: 'Port Loko', category: 'police', name: 'Port Loko Police', phone: '112', notes: '' },
  { id: '29', district: 'Port Loko', category: 'district_health', name: 'Port Loko DHMT', phone: '+23276456789', notes: '' },

  // Other districts (simplified for brevity – add all 16)
  // In production, ensure you have entries for: Moyamba, Bonthe, Pujehun, Kambia, Karene, Falaba, etc.
  // I include a template – you can extend.
];

// Helper to group contacts by district and category
function groupContacts(contacts: EmergencyContact[]): GroupedContacts {
  const grouped: GroupedContacts = {};
  for (const contact of contacts) {
    if (!grouped[contact.district]) {
      grouped[contact.district] = {};
    }
    if (!grouped[contact.district][contact.category]) {
      grouped[contact.district][contact.category] = [];
    }
    grouped[contact.district][contact.category]!.push(contact);
  }
  return grouped;
}

// Category display names and icons
const categoryMeta: Record<ContactCategory, { label: string; icon: string; bgColor: string }> = {
  ambulance: { label: 'Ambulance', icon: '🚑', bgColor: 'bg-red-600' },
  police: { label: 'Police', icon: '👮', bgColor: 'bg-blue-700' },
  fire: { label: 'Fire Force', icon: '🔥', bgColor: 'bg-orange-600' },
  tba: { label: 'TBA', icon: '👩‍🍼', bgColor: 'bg-green-600' },
  outbreak: { label: 'Outbreak Hotline', icon: '🦠', bgColor: 'bg-purple-700' },
  disaster: { label: 'Disaster Management', icon: '🌊', bgColor: 'bg-yellow-600' },
  district_health: { label: 'District Health Office', icon: '🏥', bgColor: 'bg-teal-600' },
};

export default function EmergencyPage() {
  const [groupedContacts, setGroupedContacts] = useState<GroupedContacts>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

  // Load contacts (Supabase first, then cache, then defaults)
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setConnectionStatus(navigator.onLine ? 'online' : 'offline');

    loadContacts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadContacts() {
    setLoading(true);
    try {
      let contacts: EmergencyContact[] = [];

      // If online, try Supabase
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .select('*')
          .order('district', { ascending: true });
        if (!error && data && data.length > 0) {
          contacts = data;
          // Cache to localStorage
          localStorage.setItem('emergency_contacts_cache', JSON.stringify(contacts));
        }
      }

      // If no contacts from Supabase, try localStorage cache
      if (contacts.length === 0) {
        const cached = localStorage.getItem('emergency_contacts_cache');
        if (cached) {
          contacts = JSON.parse(cached);
        }
      }

      // If still no contacts, use default fallback
      if (contacts.length === 0) {
        contacts = defaultContacts;
        // Optionally store default to cache
        localStorage.setItem('emergency_contacts_cache', JSON.stringify(defaultContacts));
      }

      const grouped = groupContacts(contacts);
      setGroupedContacts(grouped);
    } catch (err) {
      console.error('Failed to load emergency contacts:', err);
      // Fallback to defaults
      const grouped = groupContacts(defaultContacts);
      setGroupedContacts(grouped);
    } finally {
      setLoading(false);
    }
  }

  // Filter districts by search term
  const filteredDistricts = Object.keys(groupedContacts).filter(district =>
    district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // One‑tap call
  const makeCall = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-700 flex items-center justify-center gap-2">
              🚨 Emergency Contacts Directory
            </h1>
            <p className="text-gray-600 mt-2">
              One‑tap calling – works offline. Contacts are cached on your device.
            </p>
            <div className={`inline-block mt-3 px-3 py-1 rounded-full text-sm ${
              connectionStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {connectionStatus === 'online' ? '✅ Live Data (online)' : '📡 Offline Mode – using cached contacts'}
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">Loading emergency contacts...</div>
          ) : filteredDistricts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No districts found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDistricts.map(district => (
                <div key={district} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                  <div className="bg-red-700 text-white px-4 py-3">
                    <h2 className="text-xl font-bold">{district}</h2>
                  </div>
                  <div className="p-4 space-y-3">
                    {Object.entries(categoryMeta).map(([cat, meta]) => {
                      const contactsForCat = groupedContacts[district]?.[cat as ContactCategory];
                      if (!contactsForCat || contactsForCat.length === 0) return null;
                      return contactsForCat.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${meta.bgColor} flex items-center justify-center text-white text-xl`}>
                              {meta.icon}
                            </div>
                            <div>
                              <div className="font-semibold">{meta.label}</div>
                              <div className="text-sm text-gray-600">{contact.name}</div>
                              {contact.notes && <div className="text-xs text-gray-400">{contact.notes}</div>}
                            </div>
                          </div>
                          <button
                            onClick={() => makeCall(contact.phone)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
                          >
                            📞 Call
                          </button>
                        </div>
                      ));
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer note */}
          <div className="mt-8 text-center text-xs text-gray-400">
            Contacts are cached offline. To update, connect to internet and refresh. For corrections, contact your district health office.
          </div>
        </div>
      </div>
    </>
  );
}