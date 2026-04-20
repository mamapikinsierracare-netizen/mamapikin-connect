// src/app/api/sms/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Africa's Talking credentials (set in Vercel environment variables)
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME || 'sandbox';
const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const SUPERVISOR_PHONE = process.env.SUPERVISOR_PHONE || '';
const DISTRICT_HEALTH_OFFICER = process.env.DISTRICT_HEALTH_OFFICER || '';

export async function POST(request: NextRequest) {
  try {
    const { message, type, alert } = await request.json();
    
    console.log(`📱 SMS Request [${type}]:`, message);
    
    // For now, log the SMS (actual SMS sending requires Africa's Talking account)
    // When you have Africa's Talking credentials, uncomment the code below
    
    /*
    // Actual SMS sending with Africa's Talking
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({
      username: AFRICASTALKING_USERNAME,
      apiKey: AFRICASTALKING_API_KEY
    });
    
    const sms = at.SMS;
    
    // Determine recipients based on alert type
    let recipients = [];
    if (type === 'danger') {
      recipients = [SUPERVISOR_PHONE, DISTRICT_HEALTH_OFFICER];
      if (alert.alert.patientPhone) recipients.push(alert.alert.patientPhone);
    } else if (type === 'referral') {
      recipients = [alert.alert.toFacilityPhone || SUPERVISOR_PHONE];
    }
    
    const result = await sms.send({
      to: recipients,
      message: message,
      from: 'MamaPikin'
    });
    
    console.log('SMS sent:', result);
    */
    
    // Return success even if SMS not configured (for demo)
    return NextResponse.json({ 
      success: true, 
      message: 'Alert logged. SMS will be sent when Africa\'s Talking is configured.',
      queued: false
    });
    
  } catch (error) {
    console.error('SMS API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}