'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type ReferralStatus = Database['public']['Tables']['referrals']['Row']['status'];
type Feedback = {
  diagnosis: string;
  treatment: string;
  outcome: 'alive' | 'died' | 'referred_elsewhere';
  notes: string;
};

type ReferralWithDetails = Database['public']['Tables']['referrals']['Row'] & {
  referring_facility_name?: string;
};

export default function ReferralInbox() {
  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<ReferralWithDetails | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({
    diagnosis: '',
    treatment: '',
    outcome: 'alive',
    notes: ''
  });

  useEffect(() => {
    async function loadInbox() {
      const { data: facilityId, error: idError } = await supabase.rpc('get_app_current_facility_id');
      if (idError || !facilityId) {
        console.error('Could not get facility ID', idError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          referral_code,
          patient_id,
          patient_name,
          referring_facility_id,
          receiving_facility_id,
          reason,
          urgency,
          status,
          created_at,
          accepted_at,
          rejected_at,
          arrived_at,
          closed_at,
          feedback,
          escalated,
          escalation_level,
          history_token,
          referring_facility:referring_facility_id ( name )
        `)
        .eq('receiving_facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading referrals:', error);
        setReferrals([]);
      } else {
        const mapped = (data || []).map((item: any) => ({
          ...item,
          referring_facility_name: item.referring_facility?.[0]?.name || item.referring_facility_id
        })) as ReferralWithDetails[];
        setReferrals(mapped);
      }
      setLoading(false);
    }
    loadInbox();
  }, []);

  // Fully typed update helper
  const updateReferral = async (id: number, updates: Database['public']['Tables']['referrals']['Update']) => {
    const { error } = await supabase
      .from('referrals')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('Update error:', error);
      return false;
    }
    return true;
  };

  const handleAccept = async (id: number) => {
    const success = await updateReferral(id, {
      status: 'accepted',
      accepted_at: new Date().toISOString()
    });
    if (success) {
      setReferrals(prev => prev.map(r => (r.id === id ? { ...r, status: 'accepted' } : r)));
    }
  };

  const handleReject = async (id: number, reason: string) => {
    const success = await updateReferral(id, {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_reason: reason
    });
    if (success) {
      setReferrals(prev => prev.map(r => (r.id === id ? { ...r, status: 'rejected' } : r)));
    }
  };

  const handleArrived = async (id: number) => {
    const success = await updateReferral(id, {
      status: 'arrived',
      arrived_at: new Date().toISOString()
    });
    if (success) {
      setReferrals(prev => prev.map(r => (r.id === id ? { ...r, status: 'arrived' } : r)));
    }
  };

  const handleSubmitFeedback = async (id: number) => {
    const success = await updateReferral(id, {
      status: 'closed',
      closed_at: new Date().toISOString(),
      feedback: {
        ...feedback,
        provided_at: new Date().toISOString()
      }
    });
    if (success) {
      setSelectedReferral(null);
      setReferrals(prev => prev.map(r => (r.id === id ? { ...r, status: 'closed' } : r)));
      setFeedback({ diagnosis: '', treatment: '', outcome: 'alive', notes: '' });
    }
  };

  if (loading) return <div className="p-4">Loading referrals...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Referral Inbox</h1>
      {referrals.length === 0 ? (
        <p>No incoming referrals.</p>
      ) : (
        <div className="space-y-4">
          {referrals.map(ref => (
            <div key={ref.id} className="border p-4 rounded shadow">
              <div className="flex justify-between">
                <span className="font-bold">{ref.referral_code}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  ref.urgency === 'emergency' ? 'bg-red-100 text-red-800' :
                  ref.urgency === 'urgent' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {ref.urgency.toUpperCase()}
                </span>
              </div>
              <div>Patient: {ref.patient_name}</div>
              <div>From: {ref.referring_facility_name || ref.referring_facility_id}</div>
              <div>Reason: {ref.reason}</div>
              <div className="text-sm text-gray-500 mt-1">Status: {ref.status}</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {ref.status === 'pending' && (
                  <>
                    <button onClick={() => handleAccept(ref.id)} className="bg-green-600 text-white px-3 py-1 rounded">Accept</button>
                    <button onClick={() => handleReject(ref.id, 'No capacity')} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                  </>
                )}
                {ref.status === 'accepted' && (
                  <button onClick={() => handleArrived(ref.id)} className="bg-blue-600 text-white px-3 py-1 rounded">Mark Arrived</button>
                )}
                {ref.status === 'arrived' && (
                  <button onClick={() => setSelectedReferral(ref)} className="bg-purple-600 text-white px-3 py-1 rounded">Complete & Feedback</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Referral Feedback</h2>
            <input placeholder="Diagnosis" value={feedback.diagnosis} onChange={e => setFeedback({...feedback, diagnosis: e.target.value})} className="w-full border p-2 mb-2" />
            <textarea placeholder="Treatment given" value={feedback.treatment} onChange={e => setFeedback({...feedback, treatment: e.target.value})} className="w-full border p-2 mb-2" />
            <select value={feedback.outcome} onChange={e => setFeedback({...feedback, outcome: e.target.value as Feedback['outcome']})} className="w-full border p-2 mb-2">
              <option value="alive">Alive</option>
              <option value="died">Died</option>
              <option value="referred_elsewhere">Referred elsewhere</option>
            </select>
            <textarea placeholder="Additional notes" value={feedback.notes} onChange={e => setFeedback({...feedback, notes: e.target.value})} className="w-full border p-2 mb-2" />
            <button onClick={() => handleSubmitFeedback(selectedReferral.id)} className="bg-green-600 text-white px-4 py-2 rounded w-full">Submit & Close Referral</button>
          </div>
        </div>
      )}
    </div>
  );
}