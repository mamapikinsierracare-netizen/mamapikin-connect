import { supabase } from './auth';
import { db, getUnsyncedData, markAsSynced } from './db';

export let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
export let isSyncing = false;

// Listen to online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    syncNow();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

// Main sync function
export async function syncNow() {
  if (!isOnline || isSyncing) return;
  
  isSyncing = true;
  
  try {
    const unsynced = await getUnsyncedData();
    
    // Sync patients
    for (const patient of unsynced.patients) {
      const { error } = await supabase
        .from('patients')
        .upsert({
          id: patient.id,
          full_name: patient.full_name,
          phone: patient.phone,
          village: patient.village,
          district: patient.district,
          is_pregnant: patient.is_pregnant
        });
      
      if (!error) {
        await markAsSynced('patients', patient.id);
      }
    }
    
    console.log('Sync completed');
    
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    isSyncing = false;
  }
}

// Auto-sync every 60 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (isOnline && !isSyncing) {
      syncNow();
    }
  }, 60000);
}