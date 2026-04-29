'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth';

type ReferralWithDetails = {
  id: number;
  referral_code: string;
  patient_id: string;
  patient_name: string;
  referring_facility_id: string;
  receiving_facility_id: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: string;
  created_at: string;
  referring_facility_name?: string;
};

export default function ReferralInbox() {
  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<ReferralWithDetails | null>(null);
  const [feedback, setFeedback] = useState({ diagnosis: '', treatment: '', outcome: 'alive', notes: '' });

  useEffect(() => {
    async function loadInbox() {
      // Get current facility UUID from session (set during login)
      const { data: facilityId, error: idError } = await supabase.rpc('get_app_current_facility_id');
      if (idError || !facilityId) {
        console.error('Could not get facility ID', idError);
        setLoading(false);
        return;
      }

      // Fetch referrals where receiving_facility_id = current facility
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
          referring_facility:referring_facility_id ( name )
        `)
        .eq('receiving_facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading referrals:', error);
      } else {
        const mapped = (data || []).map(item => ({
          ...item,
          referring_facility_name: item.referring_facility?.name || item.referring_facility_id
        }));
        setReferrals(mapped);
      }
      setLoading(false);
    }
    loadInbox();
  }, []);

  const handleAccept = async (id: number) => {
    const { error } = await supabase
      .from('referrals')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'accepted' } : r));
    }
  };

  const handleReject = async (id: number, reason: string) => {
    const { error } = await supabase
      .from('referrals')
      .update({ status: 'rejected', rejected_at: new Date().toISOString(), rejected_reason: reason })
      .eq('id', id);
    if (!error) {
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    }
  };

  const handleArrived = async (id: number) => {
    const { error } = await supabase
      .from('referrals')
      .update({ status: 'arrived', arrived_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'arrived' } : r));
    }
  };

  const handleSubmitFeedback = async (id: number) => {
    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        feedback: {
          diagnosis: feedback.diagnosis,
          treatment: feedback.treatment,
          outcome: feedback.outcome,
          notes: feedback.notes,
          provided_at: new Date().toISOString()
        }
      })
      .eq('id', id);
    if (!error) {
      setSelectedReferral(null);
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'closed' } : r));
      setFeedback({ diagnosis: '', treatment: '', outcome: 'alive', notes: '' });
    }
  };

  if (loading) return <div>Loading referrals...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Referral Inbox</h1>
      {referrals.length === 0 ? <p>No incoming referrals.</p> : (
        <div className="space-y-4">
          {referrals.map(ref => (
            <div key={ref.id} className="border p-4 rounded shadow">
              <div className="flex justify-between">
                <span className="font-bold">{ref.referral_code}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  ref.urgency === 'emergency' ? 'bg-red-100 text-red-800' :
                  ref.urgency === 'urgent' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                }`}>{ref.urgency.toUpperCase()}</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Referral Feedback</h2>
            <input placeholder="Diagnosis" value={feedback.diagnosis} onChange={e => setFeedback({...feedback, diagnosis: e.target.value})} className="w-full border p-2 mb-2" />
            <textarea placeholder="Treatment given" value={feedback.treatment} onChange={e => setFeedback({...feedback, treatment: e.target.value})} className="w-full border p-2 mb-2" />
            <select value={feedback.outcome} onChange={e => setFeedback({...feedback, outcome: e.target.value})} className="w-full border p-2 mb-2">
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