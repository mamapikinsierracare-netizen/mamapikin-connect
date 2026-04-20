'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { smsService } from '@/lib/smsService';

type Patient = {
  patient_id: string;
  full_name: string;
  phone: string | null;
  district: string | null;
};

type Referral = {
  referral_code: string;
  patient_id: string;
  patient_name: string;
  from_facility: string;
  to_facility: string;
  to_facility_phone: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  clinical_notes: string;
  status: string;
  referral_date: string;
};

// Facilities list for Sierra Leone
const facilities = [
  { name: 'PCMH (Princess Christian Maternity)', district: 'Western Area Urban', phone: '076-901-234' },
  { name: 'Connaught Hospital', district: 'Western Area Urban', phone: '076-901-238' },
  { name: 'Makeni Government Hospital', district: 'Bombali', phone: '076-456-700' },
  { name: 'Kenema Government Hospital', district: 'Kenema', phone: '076-234-500' },
  { name: 'Bo Government Hospital', district: 'Bo', phone: '076-123-700' },
  { name: 'Koidu Government Hospital', district: 'Kono', phone: '076-345-600' },
];

function generateReferralCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REF-${dateStr}-${random}`;
}

async function getPatients(): Promise<Patient[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) return [];
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?select=patient_id,full_name,phone,district`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log('Error fetching patients:', e);
  }
  
  // Fallback to localStorage
  const localPatients = localStorage.getItem('offline_patients');
  if (localPatients) {
    const patients = JSON.parse(localPatients);
    return patients.map((p: any) => ({
      patient_id: p.patient_id,
      full_name: p.full_name,
      phone: p.phone,
      district: p.district
    }));
  }
  
  return [];
}

async function saveReferral(referral: any, isOnline: boolean): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Save to localStorage first
  const existing = localStorage.getItem('offline_referrals');
  const referrals = existing ? JSON.parse(existing) : [];
  referrals.push(referral);
  localStorage.setItem('offline_referrals', JSON.stringify(referrals));
  
  // Try to save to Supabase if online
  if (isOnline && supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/referrals`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(referral)
      });
      return response.ok;
    } catch (e) {
      console.log('Cloud save failed, saved locally only');
      return false;
    }
  }
  
  return true;
}

export default function ReferralPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [toFacility, setToFacility] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency'>('routine');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    loadPatients();
    loadRecentReferrals();
    
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadPatients() {
    const allPatients = await getPatients();
    setPatients(allPatients);
  }

  function loadRecentReferrals() {
    const local = localStorage.getItem('offline_referrals');
    if (local) {
      setRecentReferrals(JSON.parse(local).slice(-5));
    }
  }

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setMessage('Please select a patient');
      setMessageType('error');
      return;
    }
    if (!toFacility) {
      setMessage('Please select a receiving facility');
      setMessageType('error');
      return;
    }
    if (!reason) {
      setMessage('Please provide a reason for referral');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const referralCode = generateReferralCode();
      const selectedFacility = facilities.find(f => f.name === toFacility);
      
      const referral = {
        referral_code: referralCode,
        patient_id: selectedPatient.patient_id,
        patient_name: selectedPatient.full_name,
        from_facility: localStorage.getItem('facility_name') || 'MamaPikin Clinic',
        to_facility: toFacility,
        to_facility_phone: selectedFacility?.phone || '',
        reason: reason,
        urgency: urgency,
        clinical_notes: clinicalNotes,
        status: 'pending',
        referral_date: new Date().toISOString(),
        created_by: localStorage.getItem('chw_name') || 'CHW'
      };

      const saved = await saveReferral(referral, connectionStatus === 'online');
      
      if (saved) {
        // Send SMS for emergency/urgent referrals
        if (urgency === 'emergency' || urgency === 'urgent') {
          await smsService.sendReferralAlert({
            patientName: selectedPatient.full_name,
            patientId: selectedPatient.patient_id,
            fromFacility: referral.from_facility,
            toFacility: toFacility,
            referralCode: referralCode,
            reason: reason,
            urgency: urgency
          });
        }
        
        setMessageType('success');
        setMessage(`✅ Referral created successfully!\n\nReferral Code: ${referralCode}\nUrgency: ${urgency.toUpperCase()}\nReceiving Facility: ${toFacility}\n\n${urgency === 'emergency' ? '📱 SMS alert sent to receiving facility!' : 'Please advise patient to visit the receiving facility.'}`);
        
        // Reset form
        setSelectedPatient(null);
        setSearchTerm('');
        setToFacility('');
        setReason('');
        setUrgency('routine');
        setClinicalNotes('');
        loadRecentReferrals();
      } else {
        setMessageType('error');
        setMessage('Failed to save referral. Please try again.');
      }
    } catch (error) {
      setMessageType('error');
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  function getUrgencyColor(urgency: string): string {
    switch (urgency) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-400';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-400';
      default: return 'bg-blue-100 text-blue-800 border-blue-400';
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className={`mb-4 p-3 rounded-lg text-center ${
            connectionStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {connectionStatus === 'online' ? '✅ Online Mode' : '📡 Offline Mode - Referrals saved locally'}
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-blue-700">🔄 Patient Referral</h1>
            <p className="text-gray-600">Refer patients to other healthcare facilities</p>
          </div>
          
          {message && (
            <div className={`mb-4 p-4 rounded-lg whitespace-pre-line ${
              messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-400' :
              messageType === 'error' ? 'bg-red-100 text-red-800 border border-red-400' :
              'bg-yellow-100 text-yellow-800 border border-yellow-400'
            }`}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            {/* Patient Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Select Patient *</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name or patient ID..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                />
                {showDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPatients.map(patient => (
                      <div
                        key={patient.patient_id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setSearchTerm(patient.full_name);
                          setShowDropdown(false);
                        }}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                      >
                        <div className="font-medium">{patient.full_name}</div>
                        <div className="text-sm text-gray-500">ID: {patient.patient_id} | 📞 {patient.phone || 'No phone'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedPatient && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                  Selected: <strong>{selectedPatient.full_name}</strong> ({selectedPatient.patient_id})
                </div>
              )}
            </div>
            
            {/* Receiving Facility */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Receiving Facility *</label>
              <select
                value={toFacility}
                onChange={(e) => setToFacility(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Select facility</option>
                {facilities.map(f => (
                  <option key={f.name} value={f.name}>{f.name} ({f.district})</option>
                ))}
              </select>
            </div>
            
            {/* Urgency Level */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Urgency Level *</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setUrgency('routine')}
                  className={`py-2 rounded-lg border-2 transition ${
                    urgency === 'routine' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  📋 Routine
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('urgent')}
                  className={`py-2 rounded-lg border-2 transition ${
                    urgency === 'urgent' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  ⚠️ Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('emergency')}
                  className={`py-2 rounded-lg border-2 transition ${
                    urgency === 'emergency' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  🚨 Emergency
                </button>
              </div>
            </div>
            
            {/* Reason */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Reason for Referral *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                placeholder="e.g., Need specialist care, C-section required, ICU admission..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            
            {/* Clinical Notes */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Clinical Notes</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={4}
                placeholder="Relevant clinical findings, test results, medications given..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-medium ${
                loading ? 'bg-gray-400' : urgency === 'emergency' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Creating Referral...' : `Create ${urgency === 'emergency' ? 'EMERGENCY ' : ''}Referral`}
            </button>
          </form>
          
          {/* Recent Referrals */}
          {recentReferrals.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Referrals</h2>
              <div className="space-y-3">
                {recentReferrals.map(ref => (
                  <div key={ref.referral_code} className={`p-3 rounded-lg border-2 ${getUrgencyColor(ref.urgency)}`}>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <div className="font-bold">{ref.patient_name}</div>
                        <div className="text-sm font-mono">{ref.referral_code}</div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        ref.urgency === 'emergency' ? 'bg-red-600 text-white' :
                        ref.urgency === 'urgent' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {ref.urgency}
                      </div>
                    </div>
                    <div className="text-sm mt-2">
                      <span className="text-gray-600">From:</span> {ref.from_facility}<br />
                      <span className="text-gray-600">To:</span> {ref.to_facility}<br />
                      <span className="text-gray-600">Reason:</span> {ref.reason.substring(0, 100)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(ref.referral_date).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}