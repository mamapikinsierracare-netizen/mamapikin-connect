// src/lib/syncFacilities.ts
import { commDB } from './communicationDB';
import { supabase } from './supabase';

export async function syncFacilities() {
  if (!navigator.onLine) return;
  const { data, error } = await supabase.from('facilities').select('*');
  if (error) throw error;
  await commDB.facilities.bulkPut(data);
}