import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Only SUPER_ADMIN can wipe devices
  if (!session || session.user.user_metadata?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, wipe } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Update the force_logout flag in staff_users
  const { error } = await supabase
    .from('staff_users')
    .update({ force_logout: wipe === true })
    .eq('id', userId);

  if (error) {
    console.error('Wipe error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, wiped: wipe });
}