// src/hooks/useFacility.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useFacility() {
  const [facilityId, setFacilityId] = useState<string>('');

  useEffect(() => {
    const fetchFacility = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.facility_id) {
        setFacilityId(user.user_metadata.facility_id);
      } else {
        // Fallback for testing – replace with actual logic
        setFacilityId('KBH'); // Kabala Hospital code
      }
    };
    fetchFacility();
  }, []);

  return { facilityId };
}