// src/app/api/dhis2/export/route.ts
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function fetchFromSupabase<T>(endpoint: string): Promise<T[]> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    if (response.ok) return await response.json()
    return []
  } catch { return [] }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || getCurrentPeriod()
    const facilityId = searchParams.get('facility') || 'all'

    // Get data for the period
    const anc1Count = await getAnc1Count(period)
    const anc4Count = await getAnc4Count(period)
    const deliveriesCount = await getDeliveriesCount(period)
    const pnc1Count = await getPnc1Count(period)
    const fullyImmunisedCount = await getFullyImmunisedCount(period)
    const malariaTestsCount = await getMalariaTestsCount(period)
    const malariaPositiveCount = await getMalariaPositiveCount(period)

    // Format for DHIS2
    const dhis2Data = {
      period: period,
      orgUnit: facilityId === 'all' ? 'ImspTQPwCqd' : facilityId, // Default org unit ID
      dataValues: [
        { dataElement: 'ANC1', value: anc1Count },
        { dataElement: 'ANC4', value: anc4Count },
        { dataElement: 'FacilityDeliveries', value: deliveriesCount },
        { dataElement: 'PNC1', value: pnc1Count },
        { dataElement: 'FullyImmunised', value: fullyImmunisedCount },
        { dataElement: 'MalariaTests', value: malariaTestsCount },
        { dataElement: 'MalariaPositive', value: malariaPositiveCount },
      ]
    }

    return NextResponse.json(dhis2Data)
  } catch (error) {
    console.error('DHIS2 export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}${month}`
}

async function getAnc1Count(period: string): Promise<number> {
  const [year, month] = [period.slice(0,4), period.slice(4,6)]
  const startDate = `${year}-${month}-01`
  const endDate = `${year}-${month}-31`
  
  const visits = await fetchFromSupabase<any>(
    `anc_visits?visit_number=eq.1&visit_date=gte.${startDate}&visit_date=lte.${endDate}`
  )
  return visits.length
}

async function getAnc4Count(period: string): Promise<number> {
  const [year, month] = [period.slice(0,4), period.slice(4,6)]
  const startDate = `${year}-${month}-01`
  const endDate = `${year}-${month}-31`
  
  const visits = await fetchFromSupabase<any>(
    `anc_visits?visit_number=eq.4&visit_date=gte.${startDate}&visit_date=lte.${endDate}`
  )
  return visits.length
}

async function getDeliveriesCount(period: string): Promise<number> {
  const [year, month] = [period.slice(0,4), period.slice(4,6)]
  const startDate = `${year}-${month}-01`
  const endDate = `${year}-${month}-31`
  
  const deliveries = await fetchFromSupabase<any>(
    `deliveries?delivery_date=gte.${startDate}&delivery_date=lte.${endDate}&delivery_place=eq.Facility`
  )
  return deliveries.length
}

async function getPnc1Count(period: string): Promise<number> {
  const [year, month] = [period.slice(0,4), period.slice(4,6)]
  const startDate = `${year}-${month}-01`
  const endDate = `${year}-${month}-31`
  
  const visits = await fetchFromSupabase<any>(
    `pnc_visits?visit_number=eq.1&visit_date=gte.${startDate}&visit_date=lte.${endDate}`
  )
  return visits.length
}

async function getFullyImmunisedCount(period: string): Promise<number> {
  // Children who received all vaccines by 12 months
  const immunisations = await fetchFromSupabase<any>('immunisations')
  const childrenWithMeasles = new Set()
  const childrenWithPenta3 = new Set()
  
  immunisations.forEach((imm: any) => {
    if (imm.vaccine_code === 'MEASLES') childrenWithMeasles.add(imm.child_id)
    if (imm.vaccine_code === 'PENTA' && imm.dose_number === 3) childrenWithPenta3.add(imm.child_id)
  })
  
  // Fully immunised = has both Measles AND Penta3
  let count = 0
  childrenWithPenta3.forEach((childId: any) => {
    if (childrenWithMeasles.has(childId)) count++
  })
  return count
}

async function getMalariaTestsCount(period: string): Promise<number> {
  const [year, month] = [period.slice(0,4), period.slice(4,6)]
  const startDate = `${year}-${month}-01`
  const endDate = `${year}-${month}-31`
  
  const tests = await fetchFromSupabase<any>(
    `lab_request_items?test_name=ilike.%Malaria%&created_at=gte.${startDate}&created_at=lte.${endDate}`
  )
  return tests.length
}

async function getMalariaPositiveCount(period: string): Promise<number> {
  const [year, month] = [period.slice(0,4), period.slice(4,6)]
  const startDate = `${year}-${month}-01`
  const endDate = `${year}-${month}-31`
  
  const tests = await fetchFromSupabase<any>(
    `lab_request_items?test_name=ilike.%Malaria%&result_value=ilike.%Positive%&created_at=gte.${startDate}&created_at=lte.${endDate}`
  )
  return tests.length
}