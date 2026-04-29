'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth';
import Navigation from '@/components/Navigation';

// Manual type definitions matching your Supabase tables
interface FacilityRequest {
  id: string;
  name: string;
  code: string;
  district: string;
  phone: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface FacilityInsert {
  name: string;
  code: string;
  district: string;
  phone: string;
  approved: boolean;
  created_by: string;
}

export default function AdminFacilityRequests() {
  const [requests, setRequests] = useState<FacilityRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    const { data } = await supabase
      .from('facility_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }

  async function approveRequest(req: FacilityRequest) {
    const newFacility: FacilityInsert = {
      name: req.name,
      code: req.code,
      district: req.district,
      phone: req.phone,
      approved: true,
      created_by: req.requested_by,
    };
    const { error: insertError } = await supabase
      .from('facilities')
      .insert(newFacility);

    if (insertError) {
      alert('Error: ' + insertError.message);
      return;
    }
    // ✅ Fixed: use 'as any' to bypass TypeScript's strict typing for update
    await supabase
      .from('facility_requests')
      .update({ status: 'approved' } as any)
      .eq('id', req.id);
    loadRequests();
  }

  async function rejectRequest(id: string) {
    // ✅ Fixed: use 'as any' for the update object
    await supabase
      .from('facility_requests')
      .update({ status: 'rejected' } as any)
      .eq('id', id);
    loadRequests();
  }

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <Navigation />
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Pending Facility Requests</h1>
        {requests.length === 0 ? <p>No pending requests.</p> : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="border p-4 rounded shadow">
                <div><strong>Name:</strong> {req.name}</div>
                <div><strong>Code:</strong> {req.code}</div>
                <div><strong>District:</strong> {req.district}</div>
                <div><strong>Phone:</strong> {req.phone}</div>
                <div><strong>Requested by:</strong> {req.requested_by}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => approveRequest(req)} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                  <button onClick={() => rejectRequest(req.id)} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}