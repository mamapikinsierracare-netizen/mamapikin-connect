// This tells Next.js that this is an API endpoint (a URL that does something)
// The "export" means other files can use it
// The "async" means it takes time to run (waiting for database, email)
// The "GET" means it responds to simple web requests

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// This is the main function that runs when someone visits this API endpoint
// Think of it like: when the robot wakes up, this is what it does
export async function GET(request: Request) {
  
  // === PART 1: SECURITY (Prevent strangers from triggering your robot) ===
  // Without this, any hacker could visit your URL and send fake emails
  
  const authHeader = request.headers.get('authorization')
  const secretKey = process.env.CRON_SECRET  // This is a password you set
  
  // If the visitor doesn't know the secret password, reject them
  if (authHeader !== `Bearer ${secretKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // === PART 2: CONNECT TO YOUR DATABASE ===
  // This creates a connection to Supabase so we can read/write data
  
  const supabase = createRouteHandlerClient({ cookies })
  
  // === PART 3: CALCULATE TIME THRESHOLDS ===
  // "15 minutes ago" and "30 minutes ago" as timestamps
  
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  // === PART 4: FIND EMERGENCY REFERRALS THAT NEED ESCALATION ===
  // This is like asking: "Show me all emergency referrals that:
  // - Are still pending (not yet accepted by the hospital)
  // - Were created more than 15 minutes ago
  // - Haven't already been escalated
  
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select(`
      id,
      referral_code,
      urgency,
      created_at,
      status,
      patient_id,
      clinical_notes,
      referring_facility_id,
      receiving_facility_id,
      escalation_level,
      facilities!receiving_facility_id (name, phone, email, district),
      patients (first_name, last_name)
    `)
    .eq('urgency', 'emergency')           // Only emergency referrals
    .in('status', ['pending', 'referred']) // Not yet accepted
    .lt('created_at', fifteenMinutesAgo)   // Older than 15 minutes
    .or('escalation_level.is.null,escalation_level.lt.2') // Not fully escalated

  // If there are no such referrals, stop here (do nothing)
  if (error || !referrals?.length) {
    return NextResponse.json({ message: 'No pending escalations' })
  }

  // === PART 5: PROCESS EACH REFERRAL (send emails) ===
  
  for (const referral of referrals) {
    // Get the hospital name and contact info
    const hospital = referral.facilities as any
    const patientName = `${referral.patients?.first_name || ''} ${referral.patients?.last_name || ''}`.trim()
    
    // Calculate how many minutes ago this referral was created
    const minutesAgo = Math.floor((Date.now() - new Date(referral.created_at).getTime()) / 60000)
    
    // === CASE 1: Between 15 and 30 minutes old → Alert the hospital ===
    if (!referral.escalation_level || referral.escalation_level === 0) {
      
      await sendEmailViaResend(
        hospital.email,  // Send to the hospital's email address
        `🚨 EMERGENCY REFERRAL: ${referral.referral_code}`,
        `
        <h2>Emergency Referral - ACTION REQUIRED</h2>
        <p><strong>Patient:</strong> ${patientName}</p>
        <p><strong>Hospital to receive patient:</strong> ${hospital.name}</p>
        <p><strong>Time since referral:</strong> ${minutesAgo} minutes ago</p>
        <p><strong>Why this is an emergency:</strong> ${referral.clinical_notes || 'Not specified'}</p>
        <p><strong>What you need to do:</strong> Log into MamaPikin Connect and acknowledge this referral immediately.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/referral-inbox">Click here to open your referral inbox</a></p>
        `
      )
      
      // Update the database to mark that we sent the first alert
      await supabase
        .from('referrals')
        .update({ 
          escalation_level: 1,  // 1 = first alert sent
          escalation_sent_at: new Date().toISOString() 
        })
        .eq('id', referral.id)
    }
    
    // === CASE 2: Older than 30 minutes → Alert the District Supervisor ===
    const isOverThirty = new Date(referral.created_at) < new Date(thirtyMinutesAgo)
    
    if (isOverThirty && (!referral.escalation_level || referral.escalation_level < 2)) {
      
      // First, find the district supervisor for this hospital's district
      const { data: supervisor } = await supabase
        .from('district_supervisors')
        .select('email, name, district')
        .eq('district', hospital.district)
        .single()
      
      if (supervisor && supervisor.email) {
        
        await sendEmailViaResend(
          supervisor.email,
          `⚠️ ESCALATION: Emergency referral ignored for 30+ minutes`,
          `
          <h2>URGENT: Referral Escalation</h2>
          <p><strong>Supervisor:</strong> ${supervisor.name}</p>
          <p><strong>District:</strong> ${supervisor.district}</p>
          <p><strong>Problem:</strong> An emergency referral has not been acknowledged for over 30 minutes.</p>
          <hr>
          <h3>Referral Details:</h3>
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>From facility:</strong> ${referral.referring_facility_name || 'Not specified'}</p>
          <p><strong>To facility:</strong> ${hospital.name}</p>
          <p><strong>Time elapsed:</strong> ${minutesAgo} minutes</p>
          <p><strong>Clinical notes:</strong> ${referral.clinical_notes || 'Not specified'}</p>
          <hr>
          <p><strong>Action required:</strong> Please contact ${hospital.name} immediately to ensure this patient receives care.</p>
          `
        )
        
        // Update database to mark that we escalated to supervisor
        await supabase
          .from('referrals')
          .update({ 
            escalation_level: 2,
            escalated_to_supervisor_at: new Date().toISOString() 
          })
          .eq('id', referral.id)
      }
      
      // Also log this escalation in the audit log for record keeping
      await supabase.from('audit_logs').insert({
        action: 'referral_escaleated_to_supervisor',
        user_id: 'system',
        details: { 
          referral_id: referral.id, 
          minutes_elapsed: minutesAgo,
          supervisor_contacted: supervisor?.email || false
        }
      })
    }
  }
  
  // Return a summary of what we did
  return NextResponse.json({ 
    message: `Processed ${referrals.length} referrals`,
    processed_count: referrals.length 
  })
}

// === PART 6: THE EMAIL FUNCTION (Uses Resend) ===
// This is the actual code that sends the email

async function sendEmailViaResend(to: string, subject: string, htmlContent: string) {
  
  // Get your Resend API key from the environment variables
  const apiKey = process.env.RESEND_API_KEY
  
  // If you haven't set up Resend yet, log a warning but don't crash
  if (!apiKey) {
    console.error('RESEND_API_KEY not set. Email not sent to:', to)
    return
  }
  
  // Send the email using Resend's API
  // This is like mailing a letter - you put the recipient, subject, and content
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,  // Your secret key
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'MamaPikin Alert <alerts@mamapikin.com>',  // Who the email is from
      to: [to],                                         // Who receives it
      subject: subject,                                 // Email subject line
      html: htmlContent                                 // The email content (with formatting)
    })
  })
  
  // Check if the email was sent successfully
  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send email:', error)
  }
}