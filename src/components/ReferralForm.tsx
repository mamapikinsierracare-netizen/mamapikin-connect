// src/components/ReferralForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { createReferral } from '@/lib/referralService';
import { Facility, commDB } from '@/lib/communicationDB';
import { useFacility } from '@/hooks/useFacility';

interface ReferralFormData {
  patientId: string;
  patientName: string;
  patientPhone: string;
  receivingFacilityId: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  reason: string;
  clinicalNotes: string;
  vitalSigns: {
    bp?: string;
    pulse?: number;
    temperature?: number;
    oxygen?: number;
  };
  medicationsGiven: string;
}

export default function ReferralForm() {
  const { facilityId } = useFacility();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [formData, setFormData] = useState<ReferralFormData>({
    patientId: '',
    patientName: '',
    patientPhone: '',
    receivingFacilityId: '',
    urgency: 'routine',
    reason: '',
    clinicalNotes: '',
    vitalSigns: {},
    medicationsGiven: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Load facility list from local Dexie (cached offline)
  useEffect(() => {
    async function loadFacilities() {
      const all = await commDB.facilities.toArray();
      // Filter out current facility and only active ones
      const others = all.filter(f => f.id !== facilityId && f.isActive);
      setFacilities(others);
    }
    loadFacilities();
  }, [facilityId]);

  // Simulate patient search (you would replace with actual patient selector)
  // For now, we allow manual entry – production would have a search field.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.patientName || !formData.receivingFacilityId || !formData.reason) {
      setError('Please fill all required fields (*)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createReferral({
        patientId: formData.patientId,
        patientName: formData.patientName,
        patientPhone: formData.patientPhone || undefined,
        referringFacilityId: facilityId,
        receivingFacilityId: formData.receivingFacilityId,
        urgency: formData.urgency,
        reason: formData.reason,
        clinicalNotes: formData.clinicalNotes,
        vitalSigns: formData.vitalSigns,
        medicationsGiven: formData.medicationsGiven,
      });
      setSubmitted(true);
      // Clear form after success
      setFormData({
        patientId: '',
        patientName: '',
        patientPhone: '',
        receivingFacilityId: '',
        urgency: 'routine',
        reason: '',
        clinicalNotes: '',
        vitalSigns: {},
        medicationsGiven: '',
      });
    } catch (err) {
      setError('Failed to create referral. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
        <strong>Referral Created!</strong> It will sync when online. The receiving facility will be notified.
        <button onClick={() => setSubmitted(false)} className="ml-4 text-sm underline">Create another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">New Referral</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

      <div className="mb-4">
        <label className="block font-semibold">Patient ID *</label>
        <input type="text" name="patientId" value={formData.patientId} onChange={handleChange} className="w-full border p-2 rounded" required />
      </div>
      <div className="mb-4">
        <label className="block font-semibold">Patient Name *</label>
        <input type="text" name="patientName" value={formData.patientName} onChange={handleChange} className="w-full border p-2 rounded" required />
      </div>
      <div className="mb-4">
        <label className="block font-semibold">Patient Phone (optional)</label>
        <input type="tel" name="patientPhone" value={formData.patientPhone} onChange={handleChange} className="w-full border p-2 rounded" />
      </div>

      <div className="mb-4">
        <label className="block font-semibold">Receiving Facility *</label>
        <select name="receivingFacilityId" value={formData.receivingFacilityId} onChange={handleChange} className="w-full border p-2 rounded" required>
          <option value="">Select a facility</option>
          {facilities.map(f => (
            <option key={f.id} value={f.id}>{f.name} ({f.district})</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block font-semibold">Urgency *</label>
        <select name="urgency" value={formData.urgency} onChange={handleChange} className="w-full border p-2 rounded">
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block font-semibold">Reason for Referral *</label>
        <textarea name="reason" value={formData.reason} onChange={handleChange} rows={3} className="w-full border p-2 rounded" required />
      </div>

      <div className="mb-4">
        <label className="block font-semibold">Clinical Notes</label>
        <textarea name="clinicalNotes" value={formData.clinicalNotes} onChange={handleChange} rows={3} className="w-full border p-2 rounded" />
      </div>

      <fieldset className="border p-4 rounded mb-4">
        <legend className="font-semibold">Vital Signs (snapshot at referral)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" name="vitalSigns.bp" placeholder="BP (e.g., 120/80)" value={formData.vitalSigns.bp || ''} onChange={handleChange} className="border p-2 rounded" />
          <input type="number" name="vitalSigns.pulse" placeholder="Pulse (bpm)" value={formData.vitalSigns.pulse || ''} onChange={handleChange} className="border p-2 rounded" />
          <input type="number" name="vitalSigns.temperature" placeholder="Temperature (°C)" value={formData.vitalSigns.temperature || ''} onChange={handleChange} className="border p-2 rounded" step="0.1" />
          <input type="number" name="vitalSigns.oxygen" placeholder="Oxygen saturation (%)" value={formData.vitalSigns.oxygen || ''} onChange={handleChange} className="border p-2 rounded" />
        </div>
      </fieldset>

      <div className="mb-4">
        <label className="block font-semibold">Medications Given Before Referral</label>
        <textarea name="medicationsGiven" value={formData.medicationsGiven} onChange={handleChange} rows={2} className="w-full border p-2 rounded" />
      </div>

      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
        {loading ? 'Creating...' : 'Create Referral'}
      </button>
    </form>
  );
}