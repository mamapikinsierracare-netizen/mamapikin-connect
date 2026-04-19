// src/app/api/sms/danger-alert/route.ts

import { NextRequest, NextResponse } from 'next/server';

// For now, log the alert (we'll add actual SMS later)
export async function POST(request: NextRequest) {
  try {
    const alert = await request.json();
    
    console.log('🔴 DANGER SIGN ALERT 🔴');
    console.log('Patient:', alert.patientName, `(${alert.patientId})`);
    console.log('Danger Sign:', alert.dangerSign);
    console.log('Facility:', alert.facilityName);
    console.log('CHW:', alert.chwName);
    console.log('Time:', new Date(alert.recordedAt).toLocaleString());

    // TODO: Add actual SMS sending with Africa's Talking
    // For demo, we'll just log

    return NextResponse.json({ 
      success: true, 
      message: 'Alert logged. SMS will be sent when configured.' 
    });
    
  } catch (error) {
    console.error('SMS API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send alert' },
      { status: 500 }
    );
  }
}