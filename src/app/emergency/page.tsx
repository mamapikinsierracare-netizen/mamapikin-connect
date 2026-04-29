// src/app/emergency/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import { useRBAC } from '@/hooks/useRBAC';

// Define contact types with their emoji/logos
const CONTACT_TYPES = {
  ambulance: { name: 'Ambulance', emoji: '🚑', color: 'bg-red-100 text-red-800' },
  police: { name: 'Police', emoji: '👮', color: 'bg-blue-100 text-blue-800' },
  fire: { name: 'Fire Force', emoji: '🔥', color: 'bg-orange-100 text-orange-800' },
  tba: { name: 'Traditional Birth Attendant', emoji: '👵', color: 'bg-purple-100 text-purple-800' },
  outbreak: { name: 'Outbreak Hotline', emoji: '🦠', color: 'bg-yellow-100 text-yellow-800' },
  disaster: { name: 'Disaster Management', emoji: '🌊', color: 'bg-gray-100 text-gray-800' },
  health_office: { name: 'District Health Office', emoji: '🏥', color: 'bg-green-100 text-green-800' },
};

type EmergencyContact = {
  id: string;
  district: string;
  contact_type: keyof typeof CONTACT_TYPES;
  phone: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

// All 16 districts of Sierra Leone
const DISTRICTS = [
  'Bo', 'Bombali', 'Bonthe', 'Falaba', 'Kailahun', 'Kambia', 'Karene', 'Kenema',
  'Koidu', 'Kono', 'Moyamba', 'Port Loko', 'Pujehun', 'Tonkolili', 'Western Area Rural', 'Western Area Urban'
];

// Next Targets List
const NEXT_TARGETS = [
  { priority: 'High', task: 'Referral Escalation Matrix (15-min alert)', status: 'Not Started' },
  { priority: 'High', task: 'Pharmacy Prescribing + Dispensing Workflow', status: 'Not Started' },
  { priority: 'High', task: 'RLS for All Patient Tables (Security)', status: 'Not Started' },
  { priority: 'High', task: 'Offline PIN Authentication', status: 'Not Started' },
  { priority: 'Medium', task: 'Patient Consent Checkbox on Referral', status: 'Not Started' },
  { priority: 'Medium', task: 'Back-Referral Workflow', status: 'Not Started' },
  { priority: 'Medium', task: 'Printed QR Slip for Referrals', status: 'Not Started' },
  { priority: 'Low', task: 'Analytics (Real Data Aggregation)', status: 'Pending' },
  { priority: 'Low', task: 'Krio Language Interface', status: 'Not Started' },
  { priority: 'Low', task: 'Cold Chain Temperature Logging', status: 'Not Started' },
];

export default function EmergencyPage() {
  const { user, isSuperAdmin, isMasterAdmin } = useRBAC();
  const isAdmin = isSuperAdmin() || isMasterAdmin();
  
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState({
    district: '',
    contact_type: 'ambulance',
    phone: '',
    name: '',
  });
  const [message, setMessage] = useState('');
  const [showTargets, setShowTargets] = useState(false);

  // Load emergency contacts
  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('is_active', true)
      .order('district', { ascending: true });
    
    if (!error && data) {
      setContacts(data);
    }
    setLoading(false);
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    
    if (editingContact) {
      // Update existing
      const { error } = await supabase
        .from('emergency_contacts')
        .update({
          district: formData.district,
          contact_type: formData.contact_type,
          phone: formData.phone,
          name: formData.name,
        })
        .eq('id', editingContact.id);
      
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Contact updated successfully!');
        setEditingContact(null);
        resetForm();
        loadContacts();
      }
    } else {
      // Add new
      const { error } = await supabase
        .from('emergency_contacts')
        .insert({
          district: formData.district,
          contact_type: formData.contact_type,
          phone: formData.phone,
          name: formData.name,
          is_active: true,
        });
      
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Contact added successfully!');
        resetForm();
        loadContacts();
      }
    }
  }

  async function handleDeleteContact(id: string) {
    if (confirm('Are you sure you want to delete this contact?')) {
      const { error } = await supabase
        .from('emergency_contacts')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Contact deleted successfully!');
        loadContacts();
      }
    }
  }

  function resetForm() {
    setFormData({
      district: '',
      contact_type: 'ambulance',
      phone: '',
      name: '',
    });
  }

  function editContact(contact: EmergencyContact) {
    setEditingContact(contact);
    setFormData({
      district: contact.district,
      contact_type: contact.contact_type,
      phone: contact.phone,
      name: contact.name,
    });
    setShowAdminPanel(true);
  }

  function makeCall(phone: string) {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  }

  // Group contacts by district
  const contactsByDistrict: Record<string, EmergencyContact[]> = {};
  contacts.forEach(contact => {
    if (!contactsByDistrict[contact.district]) {
      contactsByDistrict[contact.district] = [];
    }
    contactsByDistrict[contact.district].push(contact);
  });

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-red-700">🚨 Emergency Contacts</h1>
            <p className="text-gray-600">Quick access to emergency numbers across all 16 districts</p>
          </div>

          {/* Admin Button (only for Master Admin and Super Admin) */}
          {isAdmin && (
            <div className="flex justify-end mb-4 gap-2">
              <button
                onClick={() => {
                  setShowAdminPanel(!showAdminPanel);
                  setEditingContact(null);
                  resetForm();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                {showAdminPanel ? 'Hide Admin Panel' : '✏️ Admin: Edit Contacts'}
              </button>
              <button
                onClick={() => setShowTargets(!showTargets)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                {showTargets ? 'Hide Next Targets' : '🎯 Next Targets'}
              </button>
            </div>
          )}

          {/* Next Targets Section */}
          {(showTargets || !isAdmin) && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
                🎯 Project Roadmap – Next Targets
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">Priority</th>
                      <th className="border p-2 text-left">Feature</th>
                      <th className="border p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NEXT_TARGETS.map((target, idx) => (
                      <tr key={idx}>
                        <td className="border p-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            target.priority === 'High' ? 'bg-red-100 text-red-800' :
                            target.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {target.priority}
                          </span>
                        </td>
                        <td className="border p-2">{target.task}</td>
                        <td className="border p-2">
                          <span className="text-orange-600 font-medium">{target.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Next priority: <strong>Referral Escalation Matrix (15-min emergency alert)</strong>
              </p>
            </div>
          )}

          {/* Admin Edit Panel */}
          {showAdminPanel && isAdmin && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">
                {editingContact ? '✏️ Edit Emergency Contact' : '➕ Add New Emergency Contact'}
              </h2>
              <form onSubmit={handleSaveContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">District *</label>
                    <select
                      value={formData.district}
                      onChange={(e) => setFormData({...formData, district: e.target.value})}
                      required
                      className="w-full border rounded-lg p-2"
                    >
                      <option value="">Select District</option>
                      {DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Type *</label>
                    <select
                      value={formData.contact_type}
                      onChange={(e) => setFormData({...formData, contact_type: e.target.value as any})}
                      required
                      className="w-full border rounded-lg p-2"
                    >
                      {Object.entries(CONTACT_TYPES).map(([key, type]) => (
                        <option key={key} value={key}>{type.emoji} {type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                      placeholder="e.g., 076123456"
                      className="w-full border rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Person/Office Name"
                      className="w-full border rounded-lg p-2"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg">
                    {editingContact ? 'Update Contact' : 'Add Contact'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContact(null);
                      resetForm();
                      setShowAdminPanel(false);
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
                {message && <p className="text-green-600">{message}</p>}
              </form>
            </div>
          )}

          {/* Emergency Contacts Display by District */}
          {loading ? (
            <div className="text-center py-8">Loading emergency contacts...</div>
          ) : (
            <div className="space-y-6">
              {DISTRICTS.map(district => {
                const districtContacts = contactsByDistrict[district] || [];
                if (districtContacts.length === 0) return null;
                
                return (
                  <div key={district} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-red-600 text-white px-4 py-2">
                      <h2 className="text-xl font-bold">{district} District</h2>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {districtContacts.map(contact => {
                          const typeInfo = CONTACT_TYPES[contact.contact_type];
                          return (
                            <div key={contact.id} className={`${typeInfo.color} rounded-lg p-3 flex justify-between items-center`}>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{typeInfo.emoji}</span>
                                  <div>
                                    <div className="font-semibold">{typeInfo.name}</div>
                                    <div className="text-sm">{contact.name || contact.phone}</div>
                                    <div className="text-sm font-mono">{contact.phone}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => makeCall(contact.phone)}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                                >
                                  📞 Call
                                </button>
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => editContact(contact)}
                                      className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteContact(contact.id)}
                                      className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show message if no contacts exist */}
          {!loading && contacts.length === 0 && (
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg text-center">
              ⚠️ No emergency contacts found. 
              {isAdmin && ' Click "Admin: Edit Contacts" to add emergency numbers for each district.'}
              {!isAdmin && ' Please contact your administrator to add emergency contacts.'}
            </div>
          )}

          {/* Offline notice */}
          <div className="mt-6 text-center text-sm text-gray-500">
            📡 Emergency contacts are cached offline. Tap "Call" to dial on mobile devices.
          </div>
        </div>
      </div>
    </>
  );
}