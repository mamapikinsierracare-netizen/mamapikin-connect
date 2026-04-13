'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function CheckTablesPage() {
  const [result, setResult] = useState('Click to check');

  async function checkTables() {
    setResult('Checking tables...');
    
    // Try to insert a test patient
    const testPatient = {
      id: 'TEST-' + Date.now(),
      full_name: 'Test Patient',
      phone: '0000000000',
      village: 'Test Village',
      district: 'Test District',
      is_pregnant: false,
      facility_code: 'TEST',
      consent_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      synced: false,
      pending_sync: false,
      last_modified: Date.now()
    };
    
    const { data, error } = await supabase
      .from('patients')
      .insert(testPatient)
      .select();
    
    if (error) {
      setResult('Error: ' + error.message);
    } else {
      setResult('Success! Patient table exists and insert worked. Test patient ID: ' + testPatient.id);
      
      // Clean up - delete test patient
      await supabase.from('patients').delete().eq('id', testPatient.id);
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Check Supabase Tables</h1>
      <button onClick={checkTables} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Check Patients Table
      </button>
      <p style={{ marginTop: '20px' }}>Result: {result}</p>
    </div>
  );
}