import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.user_metadata?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await req.json();
  if (!data || !Array.isArray(data)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  // Insert each row into the 'patients' table (adjust table name as needed)
  for (const row of data) {
    const { error } = await supabase
      .from('patients')
      .insert({
        patient_name: row.patient_name,
        facility_id: row.facility_id,
        date_of_birth: row.date_of_birth,
      });
    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, imported: data.length });
}