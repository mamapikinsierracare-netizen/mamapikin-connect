'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { smsService } from '@/lib/smsService';
import { commDB } from '@/lib/communicationDB';
import { supabase } from '@/lib/supabase';

type Patient = {
  patient_id: string;
  full_name: string;
  phone: string | null;
  district: string | null;
};

type PatientDetails = {
  patient_id: string;
  full_name: string;
  phone: string | null;
  district: string | null;
  emergency_contact: string | null;
  is_pregnant: boolean;
  is_breastfeeding: boolean;
  high_risk: boolean;
  risk_score?: number;
  registered_at?: string;
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

type Facility = {
  id: string;
  code: string;
  name: string;
  district: string;
  phone: string;
};

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
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?select=patient_id,full_name,phone&approved=eq.true,district`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
    });
    if (response.ok) return await response.json();
  } catch (e) {
    console.log('Error fetching patients:', e);
  }
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

async function getPatientDetails(patientId: string): Promise<PatientDetails | null> {
  try {
    const localPatient = await (commDB as any).patients.get(patientId);
    if (localPatient) {
      return {
        patient_id: localPatient.id,
        full_name: localPatient.name,
        phone: localPatient.phone,
        district: localPatient.district,
        emergency_contact: localPatient.emergency_contact || null,
        is_pregnant: localPatient.is_pregnant || false,
        is_breastfeeding: localPatient.is_breastfeeding || false,
        high_risk: localPatient.high_risk || false,
        risk_score: localPatient.risk_score,
        registered_at: localPatient.registered_at,
      };
    }
  } catch (e) {
    console.log('Dexie fetch failed, falling back to Supabase', e);
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/patients?patient_id=eq.${patientId}&select=patient_id,full_name,phone,district,emergency_contact,is_pregnant,is_breastfeeding,high_risk,risk_score,registered_at`,
      { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) return data[0];
    }
  } catch (e) {
    console.log('Supabase fetch failed', e);
  }
  return null;
}

async function saveReferral(referral: any, isOnline: boolean): Promise<{ success: boolean; data?: any; history_token?: string; referral_code?: string }> {
  const existing = localStorage.getItem('offline_referrals');
  const referrals = existing ? JSON.parse(existing) : [];
  referrals.push(referral);
  localStorage.setItem('offline_referrals', JSON.stringify(referrals));
  if (isOnline) {
    try {
      const response = await fetch('/api/referrals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(referral)
      });
      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result.data, history_token: result.history_token, referral_code: result.data.referral_code };
      } else {
        const errorText = await response.text();
        console.log('API save failed:', errorText);
        return { success: false };
      }
    } catch (e) {
      console.log('Cloud save failed, saved locally only', e);
      return { success: false };
    }
  }
  return { success: true };
}

export default function ReferralPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [toFacilityId, setToFacilityId] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency'>('routine');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [facilitiesList, setFacilitiesList] = useState<Facility[]>([]);

  useEffect(() => {
    if (!localStorage.getItem('facility_id')) {
      localStorage.setItem('facility_id', 'KBH');
      localStorage.setItem('facility_name', 'Kabala Hospital');
    }
    loadPatients();
    loadFacilitiesFromSupabase();
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
    if (local) setRecentReferrals(JSON.parse(local).slice(-5));
  }

  async function loadFacilitiesFromSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return;
    }
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/facilities?select=id,name,code,district,phone`, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || data.length === 0) {
        console.error('No facilities found in database');
        setFacilitiesList([]);
        return;
      }
      const mapped: Facility[] = data.map((f: any) => ({
        id: f.id,
        code: f.code || '',
        name: f.name,
        district: f.district || '',
        phone: f.phone || '',
      }));
      setFacilitiesList(mapped);
    } catch (err) {
      console.error('Failed to load facilities:', err);
      setFacilitiesList([]);
    }
  }

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handlePatientSelect(patient: Patient) {
    setSelectedPatient(patient);
    setSearchTerm(patient.full_name);
    setShowDropdown(false);
    const details = await getPatientDetails(patient.patient_id);
    setPatientDetails(details);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setMessage('Please select a patient');
      setMessageType('error');
      return;
    }
    if (!toFacilityId) {
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.user_metadata?.facility_id) {
        console.error('User metadata:', userData.user?.user_metadata);
        throw new Error('Could not determine your facility. Please log out and log in again.');
      }
      const fromFacilityUUID = userData.user.user_metadata.facility_id;
      const selectedFacility = facilitiesList.find(f => f.id === toFacilityId);
      if (!selectedFacility) throw new Error('Receiving facility not found');

      const referralCode = generateReferralCode();
      const referral = {
        referral_code: referralCode,
        patient_id: selectedPatient.patient_id,
        patient_name: selectedPatient.full_name,
        from_facility: fromFacilityUUID,
        to_facility: selectedFacility.id,
        to_facility_phone: selectedFacility.phone,
        reason: reason,
        urgency: urgency,
        clinical_notes: clinicalNotes,
        status: 'pending',
        referral_date: new Date().toISOString(),
        created_by: localStorage.getItem('chw_name') || 'CHW'
      };

      const saved = await saveReferral(referral, connectionStatus === 'online');

      if (saved.success) {
        let historyLink = '';
        if (saved.history_token && saved.referral_code) {
          historyLink = `${window.location.origin}/referral-view?token=${saved.history_token}&ref=${saved.referral_code}`;
        }

        if (urgency === 'emergency' || urgency === 'urgent') {
          // ✅ NOW includes the optional historyLink (type now accepts it)
          await smsService.sendReferralAlert({
            patientName: selectedPatient.full_name,
            patientId: selectedPatient.patient_id,
            fromFacility: localStorage.getItem('facility_name') || 'Kabala Hospital',
            toFacility: selectedFacility.name,
            referralCode: saved.referral_code || referralCode,
            reason: reason,
            urgency: urgency,
            historyLink: historyLink   // ✅ this is now allowed
          });
        }

        let successMsg = `✅ Referral created successfully!\n\nReferral Code: ${saved.referral_code || referralCode}\nUrgency: ${urgency.toUpperCase()}\nReceiving Facility: ${selectedFacility.name}\n\n`;
        if (historyLink) {
          successMsg += `🔗 Patient history link (share with receiving facility):\n${historyLink}\n\n`;
        }
        successMsg += `${urgency === 'emergency' ? '📱 SMS alert sent to receiving facility!' : 'Please advise patient to visit the receiving facility.'}`;

        setMessageType('success');
        setMessage(successMsg);

        setSelectedPatient(null);
        setPatientDetails(null);
        setSearchTerm('');
        setToFacilityId('');
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

  function getFacilityName(facilityId: string): string {
    const found = facilitiesList.find(f => f.id === facilityId);
    return found ? found.name : facilityId;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className={`mb-4 p-3 rounded-lg text-center ${connectionStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
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
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Select Patient *</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name or patient ID..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                />
                {showDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPatients.map(patient => (
                      <div key={patient.patient_id} onClick={() => handlePatientSelect(patient)} className="p-3 hover:bg-blue-50 cursor-pointer border-b">
                        <div className="font-medium">{patient.full_name}</div>
                        <div className="text-sm text-gray-500">ID: {patient.patient_id} | 📞 {patient.phone || 'No phone'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedPatient && patientDetails && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">📋 Patient Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="font-semibold">Phone:</span> {patientDetails.phone || 'N/A'}</div>
                    <div><span className="font-semibold">District:</span> {patientDetails.district || 'N/A'}</div>
                    <div><span className="font-semibold">Emergency Contact:</span> {patientDetails.emergency_contact || 'N/A'}</div>
                    <div><span className="font-semibold">High Risk:</span> {patientDetails.high_risk ? '⚠️ Yes' : 'No'}</div>
                    <div><span className="font-semibold">Pregnant:</span> {patientDetails.is_pregnant ? 'Yes' : 'No'}</div>
                    <div><span className="font-semibold">Breastfeeding:</span> {patientDetails.is_breastfeeding ? 'Yes' : 'No'}</div>
                    {patientDetails.risk_score !== undefined && <div><span className="font-semibold">Risk Score:</span> {patientDetails.risk_score}</div>}
                  </div>
                  <Link href={`/patients/${selectedPatient.patient_id}`} className="text-blue-600 text-sm hover:underline inline-flex items-center gap-1">
                    📄 View Full Medical History (ANC, PNC, Deliveries, Immunisations) →
                  </Link>
                </div>
              )}
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Receiving Facility *</label>
              <select value={toFacilityId} onChange={(e) => setToFacilityId(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                <option value="">Select facility</option>
                {facilitiesList.map(f => <option key={f.id} value={f.id}>{f.name} ({f.district})</option>)}
              </select>
              {facilitiesList.length === 0 && <p className="text-red-600 text-sm mt-1">⚠️ No facilities loaded. Please contact administrator.</p>}
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Urgency Level *</label>
              <div className="grid grid-cols-3 gap-3">
                <button type="button" onClick={() => setUrgency('routine')} className={`py-2 rounded-lg border-2 transition ${urgency === 'routine' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>📋 Routine</button>
                <button type="button" onClick={() => setUrgency('urgent')} className={`py-2 rounded-lg border-2 transition ${urgency === 'urgent' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-300'}`}>⚠️ Urgent</button>
                <button type="button" onClick={() => setUrgency('emergency')} className={`py-2 rounded-lg border-2 transition ${urgency === 'emergency' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'}`}>🚨 Emergency</button>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Reason for Referral *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} required rows={3} placeholder="e.g., Need specialist care, C-section required, ICU admission..." className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Clinical Notes</label>
              <textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={4} placeholder="Relevant clinical findings, test results, medications given..." className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg text-white font-medium ${loading ? 'bg-gray-400' : urgency === 'emergency' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? 'Creating Referral...' : `Create ${urgency === 'emergency' ? 'EMERGENCY ' : ''}Referral`}
            </button>
          </form>
          {recentReferrals.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Referrals</h2>
              <div className="space-y-3">
                {recentReferrals.map(ref => (
                  <div key={ref.referral_code} className={`p-3 rounded-lg border-2 ${getUrgencyColor(ref.urgency)}`}>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div><div className="font-bold">{ref.patient_name}</div><div className="text-sm font-mono">{ref.referral_code}</div></div>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${ref.urgency === 'emergency' ? 'bg-red-600 text-white' : ref.urgency === 'urgent' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>{ref.urgency}</div>
                    </div>
                    <div className="text-sm mt-2">
                      <span className="text-gray-600">From:</span> {getFacilityName(ref.from_facility)}<br />
                      <span className="text-gray-600">To:</span> {getFacilityName(ref.to_facility)}<br />
                      <span className="text-gray-600">Reason:</span> {ref.reason.substring(0, 100)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{new Date(ref.referral_date).toLocaleString()}</div>
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