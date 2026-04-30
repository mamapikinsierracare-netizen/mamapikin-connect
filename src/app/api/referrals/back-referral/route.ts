import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // 1. Create Supabase client using cookies (works in Next.js App Router)
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Not needed for route handlers
        },
        remove(name: string, options: any) {
          // Not needed for route handlers
        },
      },
    }
  )

  // 2. Get the logged-in user
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
  }
  
  // 3. Parse request body
  const body = await request.json()
  const { 
    referral_id, 
    outcome, 
    diagnosis, 
    treatment, 
    notes 
  } = body
  
  if (!referral_id || !outcome) {
    return NextResponse.json({ error: 'Missing referral_id or outcome' }, { status: 400 })
  }
  
  // 4. Fetch original referral with patient info
  const { data: referral, error: fetchError } = await supabase
    .from('referrals')
    .select(`
      id,
      referral_code,
      referring_facility_id,
      patients (first_name, last_name)
    `)
    .eq('id', referral_id)
    .single()
  
  if (fetchError || !referral) {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
  }
  
  // Safely extract patient name (handle both array and object)
  let patientName = 'Unknown patient'
  if (referral.patients) {
    const patientData = Array.isArray(referral.patients) ? referral.patients[0] : referral.patients
    if (patientData) {
      patientName = `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim()
      if (!patientName) patientName = 'Unknown patient'
    }
  }
  
  // 5. Update referral with back-referral data and close it
  const { error: updateError } = await supabase
    .from('referrals')
    .update({
      back_referral_outcome: outcome,
      back_referral_diagnosis: diagnosis || null,
      back_referral_treatment: treatment || null,
      back_referral_note: notes || null,
      back_referral_date: new Date().toISOString(),
      back_referral_submitted_by: session.user.id,
      status: 'closed',
      closed_at: new Date().toISOString()
    })
    .eq('id', referral_id)
  
  if (updateError) {
    console.error('Update error:', updateError)
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
  }
  
  // 6. Send in-app message to referring facility
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      recipient_facility_id: referral.referring_facility_id,
      sender_user_id: session.user.id,
      subject: `Back-Referral: ${referral.referral_code}`,
      message: `Patient ${patientName} has been ${outcome} at our facility.\nDiagnosis: ${diagnosis || 'not provided'}\nTreatment: ${treatment || 'not provided'}\nNotes: ${notes || 'none'}`,
      is_read: false,
      created_at: new Date().toISOString()
    })
  
  if (messageError) {
    // Non-critical – log but don't fail
    console.error('Could not send in-app message:', messageError)
  }
  
  // 7. Optional: Send email to referring facility if Resend configured
  if (process.env.RESEND_API_KEY && process.env.FROM_EMAIL) {
    const { data: facility } = await supabase
      .from('facilities')
      .select('email, name')
      .eq('id', referral.referring_facility_id)
      .single()
    
    if (facility?.email) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `MamaPikin <${process.env.FROM_EMAIL}>`,
            to: [facility.email],
            subject: `Back-Referral Update: ${referral.referral_code}`,
            html: `
              <h2>Back‑Referral Received</h2>
              <p><strong>Patient:</strong> ${patientName}</p>
              <p><strong>Outcome:</strong> ${outcome}</p>
              <p><strong>Diagnosis:</strong> ${diagnosis || '–'}</p>
              <p><strong>Treatment:</strong> ${treatment || '–'}</p>
              <p><strong>Notes:</strong> ${notes || '–'}</p>
              <p>This referral is now closed. You can view full details in MamaPikin Connect.</p>
            `
          })
        })
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr)
      }
    }
  }
  
  // 8. Return success
  return NextResponse.json({ success: true, message: 'Back‑referral submitted successfully' })
}