// src/app/referral-view/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // adjust import to your supabase client
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ReferralViewPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const refCode = searchParams.get('ref');
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing token');
      setLoading(false);
      return;
    }

    async function fetchPatientHistory() {
      try {
        // First verify the token is valid and get the referral
        const { data: referral, error: refError } = await supabase
          .from('referrals')
          .select('patient_id, clinical_notes, reason, urgency, referral_code')
          .eq('history_token', token)
          .single();

        if (refError || !referral) {
          throw new Error('Invalid or expired link');
        }

        // Then fetch full patient details (KYC + ANC/PNC etc.)
        const { data: patient, error: patError } = await supabase
          .from('patients')
          .select('*')
          .eq('patient_id', referral.patient_id)
          .single();

        if (patError) throw new Error('Patient not found');

        // Optionally fetch recent ANC visits, deliveries, etc.
        const [ancVisits, pncVisits, immunisations] = await Promise.all([
          supabase.from('anc_visits').select('*').eq('patient_id', referral.patient_id).order('visit_date', { ascending: false }).limit(5),
          supabase.from('pnc_visits').select('*').eq('patient_id', referral.patient_id).order('visit_date', { ascending: false }).limit(5),
          supabase.from('immunisations').select('*').eq('patient_id', referral.patient_id).order('date_given', { ascending: false }).limit(10)
        ]);

        setPatientData({
          ...patient,
          referral: referral,
          anc: ancVisits.data || [],
          pnc: pncVisits.data || [],
          immunisations: immunisations.data || [],
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPatientHistory();
  }, [token]);

  if (loading) return <div className="p-8 text-center">Loading patient history...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  if (!patientData) return <div className="p-8 text-center">No data found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="border-b pb-4 mb-4">
            <h1 className="text-2xl font-bold text-blue-700">Patient Clinical Summary</h1>
            <p className="text-gray-500">Referral Code: {patientData.referral?.referral_code}</p>
          </div>

          {/* Patient Demographics */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">👤 Patient Information</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Name:</span> {patientData.full_name}</div>
              <div><span className="font-medium">Date of Birth:</span> {new Date(patientData.date_of_birth).toLocaleDateString()}</div>
              <div><span className="font-medium">Phone:</span> {patientData.phone || 'N/A'}</div>
              <div><span className="font-medium">District:</span> {patientData.district || 'N/A'}</div>
              <div><span className="font-medium">High Risk:</span> {patientData.high_risk ? '⚠️ Yes' : 'No'}</div>
              <div><span className="font-medium">Risk Score:</span> {patientData.risk_score ?? 'Not calculated'}</div>
            </div>
          </div>

          {/* Referral Details */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">🔄 Referral Information</h2>
            <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-500">
              <p><span className="font-medium">Reason for referral:</span> {patientData.referral?.reason}</p>
              <p className="mt-1"><span className="font-medium">Clinical notes:</span> {patientData.referral?.clinical_notes || 'None'}</p>
              <p className="mt-1"><span className="font-medium">Urgency:</span> <span className={`font-bold ${patientData.referral?.urgency === 'emergency' ? 'text-red-600' : 'text-orange-600'}`}>{patientData.referral?.urgency?.toUpperCase()}</span></p>
            </div>
          </div>

          {/* Recent ANC Visits */}
          {patientData.anc.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">🤰 Recent ANC Visits</h2>
              <div className="space-y-2">
                {patientData.anc.map((visit: any) => (
                  <div key={visit.id} className="border p-3 rounded">
                    <div className="font-medium">{new Date(visit.visit_date).toLocaleDateString()} – {visit.visit_number || 'Visit'}</div>
                    <div className="text-sm text-gray-600">BP: {visit.blood_pressure}, Weight: {visit.weight}kg</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent PNC Visits */}
          {patientData.pnc.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">👩‍👧 Recent PNC Visits</h2>
              <div className="space-y-2">
                {patientData.pnc.map((visit: any) => (
                  <div key={visit.id} className="border p-3 rounded">
                    <div className="font-medium">{new Date(visit.visit_date).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-600">Mother: {visit.mother_condition}, Baby: {visit.baby_condition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Immunisations */}
          {patientData.immunisations.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">💉 Immunisations</h2>
              <div className="space-y-2">
                {patientData.immunisations.map((imm: any) => (
                  <div key={imm.id} className="border p-3 rounded">
                    <div className="font-medium">{imm.vaccine_name} – {new Date(imm.date_given).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-gray-500 text-sm mt-6">
            This information is provided for clinical purposes. Do not share this link.
          </div>
        </div>
      </div>
    </div>
  );
}