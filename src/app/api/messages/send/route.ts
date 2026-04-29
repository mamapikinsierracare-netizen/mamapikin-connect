// src/app/api/messages/send/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const message = await request.json();
    // Validate that the sending facility exists and is allowed
    // Store in Supabase (central table)
    const { error } = await supabase.from('facility_messages').insert({
      from_facility_id: message.fromFacilityId,
      to_facility_id: message.toFacilityId,
      subject: message.subject,
      content: message.content,
      is_urgent: message.isUrgent,
      is_operational: message.isOperational,
      patient_id: message.patientId,
      status: 'sent',
      created_at: message.createdAt,
    });
    if (error) throw error;
    // Here you could also trigger a push notification to the target facility's devices
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}