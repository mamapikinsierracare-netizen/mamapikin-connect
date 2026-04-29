import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  console.log('🕐 Running referral escalation check...');
  
  const supabase = await createClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  
  // Find pending emergency referrals older than 15 minutes
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select(`
      id,
      referral_code,
      patient_name,
      urgency,
      status,
      created_at,
      referring_facility_id,
      escalation_level,
      facilities!referring_facility_id (name, district)
    `)
    .eq('urgency', 'emergency')
    .eq('status', 'pending')
    .eq('escalated', false)
    .lt('created_at', fifteenMinutesAgo);
  
  if (error) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  if (!referrals || referrals.length === 0) {
    return NextResponse.json({ message: 'No escalations needed' });
  }
  
  const escalatedReferrals = [];
  
  for (const referral of referrals) {
    const newLevel = (referral.escalation_level || 0) + 1;
    // ✅ Fix: facilities is an array – take first element
    const district = referral.facilities?.[0]?.district || 'Unknown';
    const facilityName = referral.facilities?.[0]?.name || 'Unknown facility';
    
    // Get district supervisor phone
    const supervisorPhone = await getDistrictSupervisorPhone(district);
    
    if (supervisorPhone) {
      // ✅ Fixed: Proper function call with parentheses and correct arguments
      await sendEscalationSMS(
        supervisorPhone,
        referral.referral_code,
        referral.patient_name,
        facilityName,
        newLevel
      );
    }
    
    // Update the referral escalation status
    await supabase
      .from('referrals')
      .update({
        escalated: true,
        escalation_level: newLevel,
        last_escalated_at: new Date().toISOString()
      })
      .eq('id', referral.id);
    
    escalatedReferrals.push(referral.referral_code);
  }
  
  return NextResponse.json({ 
    message: `Escalated ${escalatedReferrals.length} referrals`,
    escalated: escalatedReferrals
  });
}

// Helper: Get district supervisor phone (you need a table)
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
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';
  
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