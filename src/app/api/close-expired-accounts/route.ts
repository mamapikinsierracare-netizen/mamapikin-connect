import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }
  
  const today = new Date().toISOString().split('T')[0]
  
  try {
    // Find all active accounts where closing date is in the past
    const response = await fetch(`${supabaseUrl}/rest/v1/patients?account_status=eq.active&account_closing_date=lt.${today}`, {
      headers: { 
        'apikey': supabaseAnonKey, 
        'Authorization': `Bearer ${supabaseAnonKey}` 
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch expired accounts' }, { status: 500 })
    }
    
    const expiredAccounts = await response.json()
    
    // Close each expired account
    let closedCount = 0
    for (const patient of expiredAccounts) {
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/patients?patient_id=eq.${patient.patient_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_status: 'closed',
          closed_at: new Date().toISOString(),
          closure_reason: 'Auto-closed: Account reached closing date'
        })
      })
      
      if (updateResponse.ok) {
        closedCount++
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Closed ${closedCount} expired accounts`,
      closed: closedCount,
      totalExpired: expiredAccounts.length
    })
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}