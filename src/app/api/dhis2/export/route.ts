// src/app/api/dhis2/export/route.ts
// MamaPikin Connect - DHIS2 Export API (Sierra Leone MoHS)
// v2.0 - Adapted to actual Supabase schema

import { NextResponse } from 'next/server'

// ============================================
// FORCE DYNAMIC ROUTE (prevents build error)
// ============================================
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ============================================
// Safe Supabase fetcher – returns [] on ANY error
// ============================================
async function safeFetchFromSupabase(endpoint: string): Promise<any[]> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ DHIS2: Missing Supabase credentials')
    return []
  }

  try {
    // Encode the endpoint to handle special characters
    const encodedEndpoint = encodeURI(endpoint)
    const url = `${supabaseUrl}/rest/v1/${encodedEndpoint}`
    
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      signal: AbortSignal.timeout(30000)
    })

    if (response.ok) {
      const data = await response.json()
      return Array.isArray(data) ? data : []
    }
    
    console.warn(`⚠️ DHIS2: HTTP ${response.status} for ${endpoint.substring(0, 80)}`)
    return []
    
  } catch (error) {
    console.warn(`⚠️ DHIS2: Network error for ${endpoint.substring(0, 80)}`)
    return []
  }
}

// ============================================
// MAIN GET HANDLER
// ============================================
export async function GET(request: Request) {
  console.log(`📊 DHIS2 Export: ${new Date().toISOString()}`)
  
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || getCurrentPeriod()
    const facilityId = searchParams.get('facility') || 'all'

    const [
      anc1Count,
      anc4Count,
      deliveriesCount,
      pnc1Count,
      fullyImmunisedCount,
      malariaTestsCount,
      malariaPositiveCount
    ] = await Promise.all([
      getAnc1Count(period),
      getAnc4Count(period),
      getDeliveriesCount(period),
      getPnc1Count(period),
      getFullyImmunisedCount(period),
      getMalariaTestsCount(period),
      getMalariaPositiveCount(period)
    ])

    const dhis2Data = {
      period,
      orgUnit: facilityId === 'all' ? 'ImspTQPwCqd' : facilityId,
      dataValues: [
        { dataElement: 'ANC1', value: anc1Count },
        { dataElement: 'ANC4', value: anc4Count },
        { dataElement: 'FacilityDeliveries', value: deliveriesCount },
        { dataElement: 'PNC1', value: pnc1Count },
        { dataElement: 'FullyImmunised', value: fullyImmunisedCount },
        { dataElement: 'MalariaTests', value: malariaTestsCount },
        { dataElement: 'MalariaPositive', value: malariaPositiveCount },
      ],
      _metadata: {
        generatedAt: new Date().toISOString(),
        source: 'MamaPikin Connect'
      }
    }

    return NextResponse.json(dhis2Data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    console.error('❌ DHIS2 fatal error:', error)
    return NextResponse.json(
      { error: 'Export failed', message: 'Unable to generate DHIS2 export. Please try again later.' },
      { status: 500 }
    )
  }
}

// ============================================
// Helper: Get date range from period (YYYYMM)
// ============================================
function getDateRange(period: string): { start: string; end: string } {
  const year = period.slice(0, 4)
  const month = period.slice(4, 6)
  const start = `${year}-${month}-01`
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  const end = `${year}-${month}-${lastDay}`
  return { start, end }
}

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ============================================
// ANC Metrics
// ============================================
async function getAnc1Count(period: string): Promise<number> {
  const { start, end } = getDateRange(period)
  const data = await safeFetchFromSupabase(
    `anc_visits?visit_number=eq.1&visit_date=gte.${start}&visit_date=lte.${end}&select=id`
  )
  return data.length
}

async function getAnc4Count(period: string): Promise<number> {
  const { start, end } = getDateRange(period)
  const data = await safeFetchFromSupabase(
    `anc_visits?visit_number=eq.4&visit_date=gte.${start}&visit_date=lte.${end}&select=id`
  )
  return data.length
}

// ============================================
// Delivery Metrics
// ============================================
async function getDeliveriesCount(period: string): Promise<number> {
  const { start, end } = getDateRange(period)
  const data = await safeFetchFromSupabase(
    `deliveries?delivery_date=gte.${start}&delivery_date=lte.${end}&delivery_place=eq.Facility&select=id`
  )
  return data.length
}

// ============================================
// PNC Metrics
// ============================================
async function getPnc1Count(period: string): Promise<number> {
  const { start, end } = getDateRange(period)
  const data = await safeFetchFromSupabase(
    `pnc_visits?visit_number=eq.1&visit_date=gte.${start}&visit_date=lte.${end}&select=id`
  )
  return data.length
}

// ============================================
// Immunisation Metrics (FIXED for your schema)
// ============================================
async function getFullyImmunisedCount(period: string): Promise<number> {
  // Fetch all immunisation records (no date filter – children are immunised over time)
  const immunisations = await safeFetchFromSupabase(
    'immunisations?select=patient_id,vaccine_name,dose_number'
  )
  
  if (immunisations.length === 0) {
    console.warn('⚠️ DHIS2: No immunisation data found')
    return 0
  }

  const childrenWithMeasles = new Set<string>()
  const childrenWithPenta3 = new Set<string>()
  
  for (const imm of immunisations) {
    const patientId = imm.patient_id
    if (!patientId) continue
    
    const vaccineName = imm.vaccine_name?.toUpperCase() || ''
    const doseNum = imm.dose_number
    
    // Check for Measles (any dose – usually 1 dose in Sierra Leone EPI)
    if (vaccineName.includes('MEASLES')) {
      childrenWithMeasles.add(patientId)
    }
    // Check for Penta (dose 3)
    if (vaccineName.includes('PENTA') && doseNum === 3) {
      childrenWithPenta3.add(patientId)
    }
  }
  
  // Count children who have both
  let count = 0
  for (const childId of childrenWithPenta3) {
    if (childrenWithMeasles.has(childId)) count++
  }
  
  console.log(`📊 Immunisation summary: Penta3 children: ${childrenWithPenta3.size}, Measles children: ${childrenWithMeasles.size}, Fully immunised: ${count}`)
  return count
}

// ============================================
// Malaria Metrics (FIXED for your schema)
// ============================================
async function getMalariaTestsCount(period: string): Promise<number> {
  const { start, end } = getDateRange(period)
  
  // Use proper PostgREST full-text search with asterisk
  const data = await safeFetchFromSupabase(
    `lab_request_items?test_name=ilike.*malaria*&created_at=gte.${start}&created_at=lte.${end}&select=id`
  )
  return data.length
}

async function getMalariaPositiveCount(period: string): Promise<number> {
  const { start, end } = getDateRange(period)
  
  // Match exact 'Positive' in result_value (case-insensitive)
  const data = await safeFetchFromSupabase(
    `lab_request_items?test_name=ilike.*malaria*&result_value=ilike.*positive*&created_at=gte.${start}&created_at=lte.${end}&select=id`
  )
  return data.length
}