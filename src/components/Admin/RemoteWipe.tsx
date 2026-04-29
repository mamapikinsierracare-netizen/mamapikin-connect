'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface StaffUser {
  id: string;
  email: string;
  role: string;
  force_logout: boolean;
  full_name?: string;
}

export default function RemoteWipe() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_users')
      .select('id, email, role, force_logout')
      .order('email');

    if (error) {
      console.error(error);
      setMessage('Failed to load users');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  async function handleWipe(userId: string, shouldWipe: boolean) {
    setMessage('Updating...');
    const res = await fetch('/api/admin/wipe-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, wipe: shouldWipe }),
    });

    if (res.ok) {
      setMessage(shouldWipe ? 'User marked for remote wipe' : 'Wipe cancelled');
      fetchUsers(); // Refresh list
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
  }

  if (loading) return <p>Loading users...</p>;

  return (
    <div className="mt-4 bg-white p-4 rounded shadow">
      <h3 className="text-lg font-bold mb-2">🔒 Remote Device Wipe</h3>
      <p className="text-sm text-gray-600 mb-3">
        Mark a user to force logout and delete all local data on their device on next sync.
      </p>
      {message && <p className="text-blue-600 mb-2">{message}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Email</th>
              <th className="border p-2">Role</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="border p-2">{user.email}</td>
                <td className="border p-2">{user.role}</td>
                <td className="border p-2">
                  {user.force_logout ? (
                    <span className="text-red-600 font-semibold">⚠️ Pending Wipe</span>
                  ) : (
                    <span className="text-green-600">Active</span>
                  )}
                </td>
                <td className="border p-2">
                  {user.force_logout ? (
                    <button
                      onClick={() => handleWipe(user.id, false)}
                      className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Cancel Wipe
                    </button>
                  ) : (
                    <button
                      onClick={() => handleWipe(user.id, true)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Wipe Device
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}