import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';                // 👈 ADDED for token generation

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Generate a secure random token for the patient history link
    const historyToken = crypto.randomBytes(32).toString('hex');   // 👈 ADDED

    // Map client fields to Supabase table columns
    const supabasePayload = {
      referral_code: payload.referral_code,
      patient_id: payload.patient_id,
      patient_name: payload.patient_name,
      patient_phone: payload.patient_phone || null,
      referring_facility_id: payload.from_facility,
      receiving_facility_id: payload.to_facility,
      urgency: payload.urgency,
      reason: payload.reason,
      clinical_notes: payload.clinical_notes || null,
      vital_signs: payload.vital_signs || null,
      medications_given: payload.medications_given || null,
      status: payload.status,
      created_at: payload.referral_date,
      history_token: historyToken,          // 👈 ADDED – store token in DB
    };

    const { error, data } = await supabase
      .from('referrals')
      .insert(supabasePayload)
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Optionally return the token so the frontend can build the patient history link
    return NextResponse.json({
      success: true,
      data,
      history_token: historyToken,          // 👈 ADDED – helps frontend create link
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}