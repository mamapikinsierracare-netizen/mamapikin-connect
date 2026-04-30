// This file creates an API endpoint at:
// https://your-app.vercel.app/api/referrals/back-referral
// Only logged-in users can call it.

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // 1. Get the logged-in user from Supabase
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  
  // If no user is logged in, reject the request
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 2. Get the data sent from the frontend form
  const body = await request.json()
  const { 
    referral_id, 
    outcome,        // e.g., "treated", "transferred", "deceased"
    diagnosis,      // e.g., "Severe malaria"
    treatment,      // e.g., "IV artesunate, fluids"
    notes           // Any extra comments
  } = body
  
  // 3. Validate required fields
  if (!referral_id || !outcome) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  
  // 4. First, get the original referral to know which facility referred it
  const { data: referral, error: fetchError } = await supabase
    .from('referrals')
    .select('referring_facility_id, referral_code, patients(first_name, last_name)')
    .eq('id', referral_id)
    .single()
  
  if (fetchError || !referral) {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
  }
  
  // 5. Update the referral with back-referral information
  const { error: updateError } = await supabase
    .from('referrals')
    .update({
      back_referral_outcome: outcome,
      back_referral_diagnosis: diagnosis,
      back_referral_treatment: treatment,
      back_referral_note: notes,
      back_referral_date: new Date().toISOString(),
      back_referral_submitted_by: session.user.id,
      // Also update the referral status to 'closed' since it's complete
      status: 'closed'
    })
    .eq('id', referral_id)
  
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  
  // 6. Send notification to the referring facility (in-app message)
  const patientName = `${referral.patients?.first_name || ''} ${referral.patients?.last_name || ''}`.trim()
  
  await supabase.from('messages').insert({
    recipient_facility_id: referral.referring_facility_id,
    sender_user_id: session.user.id,
    subject: `Back-Referral Received: ${referral.referral_code}`,
    message: `Patient ${patientName} has been ${outcome} at our facility. Diagnosis: ${diagnosis || 'not specified'}. Treatment: ${treatment || 'not specified'}.`,
    is_read: false,
    created_at: new Date().toISOString()
  })
  
  // 7. Optional: send email to the referring facility's admin (if you want)
  // This uses the same Resend setup from before
  if (process.env.RESEND_API_KEY) {
    // Fetch the referring facility's email from facilities table
    const { data: facility } = await supabase
      .from('facilities')
      .select('email, name')
      .eq('id', referral.referring_facility_id)
      .single()
    
    if (facility?.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'MamaPikin <alerts@mamapikin.com>',
          to: [facility.email],
          subject: `Back-Referral Update: ${referral.referral_code}`,
          html: `<p>Patient ${patientName} has been ${outcome}.</p><p><strong>Diagnosis:</strong> ${diagnosis}</p><p><strong>Treatment:</strong> ${treatment}</p>`
        })
      })
    }
  }
  
  // 8. Return success
  return NextResponse.json({ success: true, message: 'Back-referral submitted' })
}