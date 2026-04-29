import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This endpoint will be called by cron-job.org
// No authentication required (or use a secret key for security)

export async function GET() {
  console.log('🕐 Running referral escalation check...');
  
  const supabase = await createClient();
  
  // Calculate time threshold: 15 minutes ago
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  
  // Find pending emergency referrals older than 15 minutes that haven't been escalated
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select(`
      id,
      referral_code,
      patient_name,
      emergency,
      referring_facility_id,
      receiving_facility_id,
      created_at,
      escalation_level,
      facilities!referring_facility_id (district, name)
    `)
    .eq('emergency', true)
    .eq('status', 'pending')
    .eq('escalated', false)
    .lt('created_at', fifteenMinutesAgo);
  
  if (error) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  if (!referrals || referrals.length === 0) {
    console.log('No pending emergency referrals to escalate');
    return NextResponse.json({ message: 'No escalations needed' });
  }
  
  console.log(`Found ${referrals.length} referrals to escalate`);
  
  const escalatedReferrals = [];
  
  for (const referral of referrals) {
    // Determine escalation level (0 = first alert, 1 = second alert, etc.)
    const newLevel = (referral.escalation_level || 0) + 1;
    
    // Get district supervisor contact (you need a table of supervisors)
    // For now, we'll use a fallback number – you should create a `district_supervisors` table
    const district = referral.facilities?.district || 'Unknown';
    const supervisorPhone = await getDistrictSupervisorPhone(district);
    
    if (supervisorPhone) {
      // Send SMS (implement smsService or call Africa's Talking directly)
      await sendEscalationSMS(
        supervisorPhone,
        referral.referral_code,
        referral.patient_name,
        referral.facilities?.name || 'Unknown facility',
        newLevel
      );
    }
    
    // Update the referral escalation status
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        escalated: true,
        escalation_level: newLevel,
        last_escalated_at: new Date().toISOString()
      })
      .eq('id', referral.id);
    
    if (updateError) {
      console.error(`Failed to update referral ${referral.id}:`, updateError);
    } else {
      escalatedReferrals.push(referral.referral_code);
    }
  }
  
  return NextResponse.json({ 
    message: `Escalated ${escalatedReferrals.length} referrals`,
    escalated: escalatedReferrals
  });
}

// Helper: Get district supervisor phone number
// You need to create a `district_supervisors` table in Supabase
async function getDistrictSupervisorPhone(district: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('district_supervisors')
    .select('phone')
    .eq('district', district)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !data) {
    console.warn(`No supervisor found for district: ${district}`);
    // Fallback: return a default number (e.g., district health office)
    return null;
  }
  return data.phone;
}

// Helper: Send SMS via Africa's Talking
async function sendEscalationSMS(
  phone: string, 
  referralCode: string, 
  patientName: string, 
  facilityName: string,
  level: number
): Promise<boolean> {
  // Africa's Talking credentials should be in environment variables
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;
  const username = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
  
  if (!apiKey) {
    console.error('Africa\'s Talking API key missing');
    return false;
  }
  
  const message = `🚨 URGENT: Emergency referral ${referralCode} for ${patientName} from ${facilityName} has not been acknowledged after ${level * 15} minutes. Please check immediately.`;
  
  try {
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'ApiKey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username,
        to: phone,
        message,
      }),
    });
    
    const result = await response.json();
    console.log(`SMS sent to ${phone}:`, result);
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}