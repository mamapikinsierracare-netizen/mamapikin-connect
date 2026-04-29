'use client';
import { useState } from 'react';
import { supabase } from '@/lib/auth';
import Navigation from '@/components/Navigation';

export default function FacilityRequestPage() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage('You must be logged in.');
      setLoading(false);
      return;
    }

    // Get the user's email or ID for requested_by
    const requested_by = user.email || user.id;
    const status = 'pending';

    const { error } = await supabase
      .from('facility_requests')
      .insert({
        name,
        code,
        district,
        phone,
        requested_by,   // ✅ now defined
        status,         // ✅ now defined
      } as any);

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Request submitted. Admin will review it.');
      setName('');
      setCode('');
      setDistrict('');
      setPhone('');
    }
    setLoading(false);
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
          <h1 className="text-2xl font-bold mb-4">Request New Facility</h1>
          <form onSubmit={handleSubmit}>
            <input className="w-full border p-2 mb-2" placeholder="Facility Name *" value={name} onChange={e => setName(e.target.value)} required />
            <input className="w-full border p-2 mb-2" placeholder="Short Code (e.g., PCMH)" value={code} onChange={e => setCode(e.target.value)} />
            <input className="w-full border p-2 mb-2" placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} />
            <input className="w-full border p-2 mb-2" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white w-full py-2 rounded">
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
            {message && <p className="mt-4 text-center">{message}</p>}
          </form>
        </div>
      </div>
    </>
  );
}