'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { offlineService, Patient } from '@/lib/offlineService';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadPatients();
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      loadPatients(); // Reload when online
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function loadPatients() {
    setLoading(true);
    // Always load from offline storage first (instant)
    const offlinePatients = offlineService.getPatientsOffline();
    setPatients(offlinePatients);
    setLoading(false);
    
    // If online, also try to fetch from cloud and merge
    if (navigator.onLine) {
      fetchPatientsFromCloud();
    }
  }

  async function fetchPatientsFromCloud() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) return;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/patients?select=patient_id,full_name,phone,district,date_of_birth,village`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      
      if (response.ok) {
        const cloudPatients = await response.json();
        // Merge with offline patients
        const allPatients = [...offlineService.getPatientsOffline()];
        cloudPatients.forEach((cloudPatient: Patient) => {
          if (!allPatients.find(p => p.patient_id === cloudPatient.patient_id)) {
            allPatients.push(cloudPatient);
          }
        });
        setPatients(allPatients);
      }
    } catch (error) {
      console.log('Cloud fetch failed, using offline data only');
    }
  }

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Offline Warning Banner */}
          {!isOnline && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg text-center">
              <span className="text-yellow-800">📡 You are offline. Showing cached patients only.</span>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Patient List</h1>
            <Link href="/register" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              + Register New Patient
            </Link>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No patients found. <Link href="/register" className="text-green-600">Register your first patient</Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Patient ID</th>
                    <th className="px-4 py-3 text-left">Full Name</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">District</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.patient_id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{patient.patient_id}</td>
                      <td className="px-4 py-3 font-medium">{patient.full_name}</td>
                      <td className="px-4 py-3 text-sm">{patient.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm">{patient.district || '-'}</td>
                      <td className="px-4 py-3">
                        <Link href={`/patients/${patient.patient_id}`} className="text-green-600 hover:underline text-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredPatients.length} of {patients.length} patients
            {!isOnline && " (offline mode - cached data only)"}
          </div>
        </div>
      </div>
    </>
  );
}