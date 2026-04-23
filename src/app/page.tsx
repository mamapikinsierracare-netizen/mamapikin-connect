// src/app/page.tsx
// MamaPikin Connect - Home Page (Role-Appropriate Dashboard)
// Accessible to all authenticated users. Shows different content based on role.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useRBAC } from '@/hooks/useRBAC';
import { supabase } from '@/lib/supabase';

// Simple loading component for slow connections
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      <p className="ml-3 text-gray-600">Loading dashboard...</p>
    </div>
  );
}

// ============================================
// Dashboard for non-admin roles
// (CHW, Nurse, Midwife, CHO, TBA, etc.)
// ============================================
function CommunityDashboard() {
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Dynamically import Dexie to avoid server-side issues
        const { default: db } = await import('@/lib/offlineService');

        // Get pending sync queue count
        const pending = await db.syncQueue.where('status').equals('pending').count();
        setPendingSyncCount(pending);

        // Get recent patients (last 7 days) from local DB
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const patients = await db.patients
          .where('registered_at')
          .above(sevenDaysAgo.toISOString())
          .limit(5)
          .toArray();
        setRecentPatients(patients);

        // Get today's appointments (if scheduler table exists)
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const appointments = await db.appointments
            ?.where('appointment_date')
            .equals(todayStr)
            .toArray() || [];
          setTodayAppointments(appointments);
        } catch (err) {
          console.warn('Appointments table not available yet', err);
          setTodayAppointments([]);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-green-800">Welcome, Community Health Worker</h1>
      
      {/* Quick action buttons – large touch targets for low literacy */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/register" className="bg-green-600 text-white p-4 rounded-xl text-center text-lg font-semibold shadow hover:bg-green-700">
          ➕ Register Patient
        </Link>
        <Link href="/anc" className="bg-blue-600 text-white p-4 rounded-xl text-center text-lg font-semibold shadow hover:bg-blue-700">
          🤰 ANC Visit
        </Link>
        <Link href="/pnc" className="bg-purple-600 text-white p-4 rounded-xl text-center text-lg font-semibold shadow hover:bg-purple-700">
          👩‍👧 PNC Visit
        </Link>
        <Link href="/immunisation" className="bg-yellow-600 text-white p-4 rounded-xl text-center text-lg font-semibold shadow hover:bg-yellow-700">
          💉 Immunisation
        </Link>
      </div>

      {/* Sync status – critical for offline-first */}
      <div className="bg-gray-100 p-3 rounded-lg mb-4 flex justify-between items-center">
        <span className="font-medium">📡 Offline sync queue:</span>
        <span className={`px-3 py-1 rounded-full ${pendingSyncCount > 0 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
          {pendingSyncCount} pending {pendingSyncCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Today's appointments */}
      <div className="bg-white shadow rounded-lg p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">📅 Today's Appointments</h2>
        {todayAppointments.length === 0 ? (
          <p className="text-gray-500">No appointments scheduled for today.</p>
        ) : (
          <ul className="divide-y">
            {todayAppointments.map((apt: any) => (
              <li key={apt.id} className="py-2">
                <span className="font-medium">{apt.patient_name || apt.patient_id}</span> – {apt.time || 'View details'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent patients */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">🆕 Recently Registered</h2>
        {recentPatients.length === 0 ? (
          <p className="text-gray-500">No recent registrations.</p>
        ) : (
          <ul className="divide-y">
            {recentPatients.map((p: any) => (
              <li key={p.patient_id || p.id} className="py-2">
                <Link href={`/patients/${p.patient_id || p.id}`} className="text-blue-600 hover:underline">
                  {p.full_name || p.name || 'Unknown'}
                </Link>
                <span className="text-sm text-gray-500 ml-2">
                  {new Date(p.registered_at || p.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================
// Admin quick summary (optional – can redirect to /analytics)
// ============================================
function AdminDashboard() {
  const [stats, setStats] = useState({ patients: 0, anc: 0, deliveries: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        // Example: fetch counts from Supabase (real data)
        const { data: patients } = await supabase.from('patients').select('id', { count: 'exact', head: true });
        const { data: anc } = await supabase.from('anc_visits').select('id', { count: 'exact', head: true });
        const { data: deliveries } = await supabase.from('deliveries').select('id', { count: 'exact', head: true });
        setStats({
          patients: patients?.length || 0,
          anc: anc?.length || 0,
          deliveries: deliveries?.length || 0,
        });
      } catch (error) {
        console.error('Failed to load summary stats', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-green-800">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow text-center">
          <div className="text-3xl font-bold text-green-700">{stats.patients}</div>
          <div className="text-gray-500">Total Patients</div>
        </div>
        <div className="bg-white p-4 rounded shadow text-center">
          <div className="text-3xl font-bold text-blue-700">{stats.anc}</div>
          <div className="text-gray-500">ANC Visits</div>
        </div>
        <div className="bg-white p-4 rounded shadow text-center">
          <div className="text-3xl font-bold text-purple-700">{stats.deliveries}</div>
          <div className="text-gray-500">Deliveries</div>
        </div>
      </div>
      <div className="text-center">
        <Link href="/analytics" className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-green-700">
          📊 Open Full Analytics Dashboard →
        </Link>
      </div>
    </div>
  );
}

// ============================================
// MAIN HOME PAGE COMPONENT
// ============================================
export default function HomePage() {
  const { user, isAdmin, isLoading } = useRBAC();

  // Show loading while auth is being resolved
  if (isLoading) {
    return (
      <>
        <Navigation />
        <LoadingSpinner />
      </>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return (
      <>
        <Navigation />
        <LoadingSpinner />
      </>
    );
  }

  const userIsAdmin = isAdmin(); // Uses your RBAC hook logic

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-4">
        {userIsAdmin ? <AdminDashboard /> : <CommunityDashboard />}
      </div>
    </>
  );
}