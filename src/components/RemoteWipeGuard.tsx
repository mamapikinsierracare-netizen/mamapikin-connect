'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // update import if needed
import { useRouter } from 'next/navigation';
import { commDB } from '@/lib/communicationDB'; // ✅ use existing Dexie instance

export default function RemoteWipeGuard() {
  const router = useRouter();

  useEffect(() => {
    async function checkWipe() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staff, error } = await supabase
        .from('staff_users')
        .select('force_logout')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking wipe status:', error);
        return;
      }

      if (staff?.force_logout === true) {
        // Clear all local Dexie data using commDB
        try {
          if (commDB && commDB.delete) {
            await commDB.delete();
            console.log('Local database wiped due to force_logout');
          } else {
            console.warn('commDB.delete not available');
          }
        } catch (err) {
          console.error('Failed to wipe local DB:', err);
        }

        // Sign out from Supabase
        await supabase.auth.signOut();
        
        // Clear any local storage items
        localStorage.removeItem('current_user');
        
        // Redirect to login with wipe message
        router.push('/login?wipe=1');
      }
    }

    checkWipe();
  }, [router]);

  return null;
}