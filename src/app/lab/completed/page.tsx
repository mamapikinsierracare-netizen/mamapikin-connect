// src/app/lab/completed/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { db } from '@/lib/db'

// ============ TYPES ============
type LabResult = {
  id: string
  result_id: string
  order_id: string
  patient_id: string
  test_name: string
  result_value: string
  reference_range: string
  flag: string
  verified_by: string
  status: string
  created_at: string
  // Joined fields from Orders
  patient_name?: string
  priority?: string
  clinical_notes?: string
  patient_phone?: string
  patient_email?: string
}

type OrderRecord = {
  patient_id: string
  patient_name: string
  priority: string
  clinical_notes: string
  patient_phone?: string
  patient_email?: string
}

const getSupabaseUrl = (): string => process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const getSupabaseAnonKey = (): string => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// ============ HELPERS ============
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB')
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return 'Not recorded'
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ============ PROFESSIONAL REPORT GENERATION ============

// Facility information
const FACILITY = {
  name: 'MamaPikin Connect National Reference Laboratory',
  address: '48B Wilkinson Road, Freetown, Sierra Leone',
  phone: '+232 76 123 456',
  email: 'lab@mamapikin.sl',
  website: 'www.mamapikin.sl',
  accreditation: 'ISO 15189:2022 – Accredited by SLAAS',
  labDirector: 'Dr. Fatmata Sesay (MD, MSc Clinical Pathology)',
  labLicense: 'MOH/SL/LAB/2024/001',
  project: 'MamaPikin Connect – Sierra Leone Ministry of Health'
}

// Generate verification code
const generateVerificationCode = (requestId: string) => {
  const hash = Array.from(requestId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return `V-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`
}

// Safe parsing of the semicolon-separated results payload
const parseResultValues = (resultString: string) => {
  return resultString.split('; ').filter(val => val.trim() !== '')
}

// Per-test interpretation
const getTestInterpretation = (testName: string, resultValue: string, normalRange: string): string => {
  const testLower = testName.toLowerCase()
  const num = parseFloat(resultValue)
  const range = normalRange.split('-').map(Number)
  if (range.length === 2 && !isNaN(num)) {
    if (num < range[0]) {
      if (testLower.includes('hemoglobin') || testLower.includes('hb')) return 'LOW – Possible anemia. Clinical correlation advised.'
      if (testLower.includes('glucose')) return 'LOW – Hypoglycemia. Review medication and fasting status.'
      if (testLower.includes('potassium')) return 'LOW – Hypokalemia. May affect cardiac function.'
      return 'LOW – Below reference interval. Clinical correlation advised.'
    }
    if (num > range[1]) {
      if (testLower.includes('hemoglobin') || testLower.includes('hb')) return 'HIGH – Possible polycythemia or dehydration.'
      if (testLower.includes('glucose')) return 'HIGH – Hyperglycemia. Possible diabetes mellitus.'
      if (testLower.includes('creatinine')) return 'HIGH – May indicate renal impairment.'
      if (testLower.includes('malaria')) return 'POSITIVE – Malaria parasites detected. Immediate treatment advised.'
      return 'HIGH – Above reference interval. Clinical correlation advised.'
    }
  }
  if (testLower.includes('malaria') && resultValue.toLowerCase().includes('positive')) {
    return 'POSITIVE – Malaria parasites detected. Immediate treatment advised.'
  }
  if (testLower.includes('hiv') && resultValue.toLowerCase().includes('reactive')) {
    return 'REACTIVE – Confirmatory testing required. Counselling advised.'
  }
  return 'Within reference interval – No significant abnormality detected.'
}

// Transform flat Result string back into an array of items for the HTML generators
const mapResultToItems = (report: LabResult) => {
  return parseResultValues(report.result_value).map(line => {
    let cleanLine = line.replace(/\[.*?\]/g, '').trim()
    const [param, val] = cleanLine.split(':')
    const isCrit = line.includes('[Critical]')
    const isAbn = line.includes('[Abnormal]')
    return {
      test_name: param?.trim() || report.test_name,
      result_value: val?.trim() || '',
      normal_range: report.reference_range || 'N/A',
      unit: '',
      is_abnormal: isAbn || isCrit,
      critical_flag: isCrit,
      abnormal_flag: isAbn ? 'Y' : ''
    }
  })
}

// 1. Professional Internal Report
function generateInternalReport(report: LabResult, logoUrl = '/logo.png'): string {
  const reportDateTime = formatDateTime(report.created_at)
  const verificationCode = generateVerificationCode(report.result_id)
  const items = mapResultToItems(report)
  const abnormalItems = items.filter(i => i.is_abnormal)
  const criticalItems = items.filter(i => i.critical_flag)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Internal Lab Report - ${report.patient_name}</title>
<style>
  @media print { body { margin: 0; padding: 0; } }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: white; }
  .report-container { max-width: 1100px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
  .header { text-align: center; border-bottom: 3px solid #1a7a2e; padding-bottom: 15px; margin-bottom: 20px; }
  .logo { max-height: 70px; margin-bottom: 10px; }
  .facility-name { font-size: 22px; font-weight: bold; color: #1a7a2e; }
  .accreditation { font-size: 11px; color: #2c3e50; font-style: italic; }
  .report-title { font-size: 18px; font-weight: bold; color: #1a5bb8; margin: 10px 0; }
  .verification { text-align: right; font-size: 10px; font-family: monospace; margin-top: -15px; }
  .info-section { margin-bottom: 20px; border: 1px solid #ddd; padding: 12px; border-radius: 6px; background: #fafafa; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .info-item { flex: 1; min-width: 220px; }
  .info-label { font-weight: bold; color: #1a7a2e; display: inline-block; width: 140px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
  th, td { border: 1px solid #ccc; padding: 8px 6px; text-align: left; vertical-align: top; }
  th { background: #1a7a2e; color: white; font-weight: bold; }
  .abnormal { background: #fee2e2; color: #b91c1c; font-weight: bold; }
  .critical { background: #fecaca; color: #991b1b; font-weight: bold; border-left: 4px solid #dc2626; }
  .interpretation { font-size: 11px; color: #4b5563; margin-top: 4px; font-style: italic; }
  .clinical-notes { background: #f0fdf4; padding: 12px; border-left: 4px solid #1a7a2e; margin: 15px 0; border-radius: 4px; }
  .signature-area { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 20px; }
  .signature-line { width: 220px; text-align: center; }
  .footer { margin-top: 25px; text-align: center; font-size: 9px; color: #555; border-top: 1px solid #eee; padding-top: 10px; }
  .disclaimer { font-size: 8px; color: #777; margin-top: 5px; }
</style>
</head>
<body>
<div class="report-container">
  <div class="header">
    <img src="${logoUrl}" alt="MamaPikin Connect Logo" class="logo" onerror="this.style.display='none'" />
    <div class="facility-name">${FACILITY.name}</div>
    <div>${FACILITY.address}</div>
    <div>📞 ${FACILITY.phone} | ✉️ ${FACILITY.email} | 🌐 ${FACILITY.website}</div>
    <div class="accreditation">${FACILITY.accreditation} | Lab License: ${FACILITY.labLicense}</div>
    <div class="report-title">INTERNAL LABORATORY REPORT</div>
    <div>For clinical use only – not for distribution outside this facility</div>
  </div>
  <div class="verification">
    Verification Code: <strong>${verificationCode}</strong> | Report ID: ${report.result_id}
  </div>

  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Patient Name:</span> ${report.patient_name}</div>
      <div class="info-item"><span class="info-label">Patient ID:</span> ${report.patient_id}</div>
      <div class="info-item"><span class="info-label">Order Ref:</span> ${report.order_id}</div>
      <div class="info-item"><span class="info-label">Reported Date/Time:</span> ${reportDateTime}</div>
      <div class="info-item"><span class="info-label">Verified By:</span> ${report.verified_by || 'N/A'}</div>
      <div class="info-item"><span class="info-label">Priority:</span> ${report.priority?.toUpperCase() || 'Routine'}</div>
    </div>
  </div>

  <h3>LABORATORY RESULTS: ${report.test_name}</h3>
  <table>
    <thead>
      <tr><th>Test Name / Parameter</th><th>Result</th><th>Reference Range</th><th>Unit</th><th>Flag</th><th>Interpretation</th></tr>
    </thead>
    <tbody>
      ${items.map(item => {
        let rowClass = ''
        let flagText = ''
        if (item.critical_flag) { rowClass = 'critical'; flagText = '⚠️ CRITICAL' }
        else if (item.is_abnormal) { rowClass = 'abnormal'; flagText = item.abnormal_flag === 'H' ? 'HIGH ↑' : 'LOW ↓' }
        else { flagText = 'NORMAL' }
        const interpretation = getTestInterpretation(item.test_name, item.result_value || '', item.normal_range || '')
        return `<tr class="${rowClass}">
          <td>${item.test_name}</td>
          <td><strong>${item.result_value || 'Pending'}</strong></td>
          <td>${item.normal_range || 'N/A'}</td>
          <td>${item.unit || ''}</td>
          <td>${flagText}</td>
          <td class="interpretation">${interpretation}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  ${abnormalItems.length > 0 ? `
  <div class="clinical-notes" ${criticalItems.length > 0 ? 'style="background:#fecaca; border-left-color:#dc2626;"' : ''}>
    <strong>⚠️ CLINICAL SUMMARY</strong><br/>
    ${abnormalItems.length} abnormal result(s) detected. ${criticalItems.length > 0 ? 'CRITICAL VALUES – Immediate clinical action required.' : 'Please correlate with clinical findings.'}
  </div>
  ` : ''}

  ${report.clinical_notes ? `
  <div class="clinical-notes">
    <strong>📝 CLINICAL NOTES (Requesting Clinician):</strong><br/>
    ${report.clinical_notes}
  </div>
  ` : ''}

  <div class="signature-area">
    <div class="signature-line">________________________<br/>Laboratory Scientist<br/>${reportDateTime}</div>
    <div class="signature-line">________________________<br/>Pathologist / Lab Director<br/>${FACILITY.labDirector}</div>
    <div class="signature-line">Electronically Signed<br/>${report.verified_by}</div>
  </div>

  <div class="footer">
    <p>This report is electronically generated and legally valid without a physical signature (ISO 15189:2022, Clause 5.9).</p>
    <p>${FACILITY.project}</p>
    <div class="disclaimer">Any alteration, reproduction, or distribution without authorization invalidates this report. Verify authenticity with code ${verificationCode}.</div>
  </div>
</div>
</body>
</html>`
}

// 2. Professional External Report
function generateExternalReport(report: LabResult, logoUrl = '/logo.png'): string {
  const reportDateTime = formatDateTime(report.created_at)
  const verificationCode = generateVerificationCode(report.result_id)
  const items = mapResultToItems(report)
  const abnormalItems = items.filter(i => i.is_abnormal)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>External Lab Report - ${report.patient_name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: white; }
  .report-container { max-width: 1100px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
  .header { text-align: center; border-bottom: 3px solid #1a7a2e; padding-bottom: 15px; margin-bottom: 20px; }
  .logo { max-height: 70px; margin-bottom: 10px; }
  .facility-name { font-size: 22px; font-weight: bold; color: #1a7a2e; }
  .accreditation { font-size: 11px; color: #2c3e50; font-style: italic; }
  .report-title { font-size: 18px; font-weight: bold; color: #1a5bb8; margin: 10px 0; }
  .verification { text-align: right; font-size: 10px; font-family: monospace; margin-top: -15px; }
  .info-section { margin-bottom: 20px; border: 1px solid #ddd; padding: 12px; border-radius: 6px; background: #fafafa; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .info-label { font-weight: bold; color: #1a7a2e; display: inline-block; width: 140px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
  th, td { border: 1px solid #ccc; padding: 8px 6px; text-align: left; vertical-align: top; }
  th { background: #1a7a2e; color: white; font-weight: bold; }
  .abnormal { background: #fee2e2; color: #b91c1c; font-weight: bold; }
  .critical { background: #fecaca; color: #991b1b; font-weight: bold; border-left: 4px solid #dc2626; }
  .note { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; font-size: 12px; }
  .signature-area { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 20px; }
  .signature-line { width: 220px; text-align: center; }
  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #555; border-top: 1px solid #eee; padding-top: 10px; }
  .disclaimer { font-size: 8px; color: #777; margin-top: 5px; }
</style>
</head>
<body>
<div class="report-container">
  <div class="header">
    <img src="${logoUrl}" alt="MamaPikin Connect Logo" class="logo" onerror="this.style.display='none'" />
    <div class="facility-name">${FACILITY.name}</div>
    <div>${FACILITY.address}</div>
    <div>📞 ${FACILITY.phone} | ✉️ ${FACILITY.email} | 🌐 ${FACILITY.website}</div>
    <div class="accreditation">${FACILITY.accreditation} | Lab License: ${FACILITY.labLicense}</div>
    <div class="report-title">EXTERNAL LABORATORY REPORT</div>
  </div>
  <div class="verification">
    Verification Code: <strong>${verificationCode}</strong> | Report ID: ${report.result_id}
  </div>

  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Patient Name:</span> ${report.patient_name}</div>
      <div class="info-item"><span class="info-label">Patient ID:</span> ${report.patient_id}</div>
      <div class="info-item"><span class="info-label">Order Ref:</span> ${report.order_id}</div>
      <div class="info-item"><span class="info-label">Reported Date/Time:</span> ${reportDateTime}</div>
    </div>
  </div>

  <h3>LABORATORY RESULTS: ${report.test_name}</h3>
  <table>
    <thead>
      <tr><th>Test Name</th><th>Result</th><th>Reference Range</th><th>Unit</th><th>Flag</th></tr>
    </thead>
    <tbody>
      ${items.map(item => {
        let rowClass = ''
        let flagText = ''
        if (item.critical_flag) { rowClass = 'critical'; flagText = '⚠️ CRITICAL' }
        else if (item.is_abnormal) { rowClass = 'abnormal'; flagText = item.abnormal_flag === 'H' ? 'HIGH ↑' : 'LOW ↓' }
        else { flagText = 'NORMAL' }
        return `<tr class="${rowClass}">
          <td>${item.test_name}</td>
          <td><strong>${item.result_value || 'Pending'}</strong></td>
          <td>${item.normal_range || 'N/A'}</td>
          <td>${item.unit || ''}</td>
          <td>${flagText}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  ${abnormalItems.length > 0 ? `<div class="note"><strong>⚠️ CLINICAL NOTE:</strong> Abnormal results detected. Please correlate clinically.</div>` : ''}

  <div class="signature-area">
    <div class="signature-line">________________________<br/>Laboratory Scientist<br/>${reportDateTime}</div>
    <div class="signature-line">________________________<br/>Pathologist / Lab Director<br/>${FACILITY.labDirector}</div>
  </div>

  <div class="footer">
    <p>This report is electronically generated and is valid without a physical signature.</p>
    <p>${FACILITY.project}</p>
    <div class="disclaimer">Verify authenticity with code ${verificationCode}.</div>
  </div>
</div>
</body>
</html>`
}

// 3. Patient-Friendly Report
function generatePatientReport(report: LabResult, logoUrl = '/logo.png'): string {
  const reportDateTime = formatDateTime(report.created_at)
  const items = mapResultToItems(report)
  const abnormalItems = items.filter(i => i.is_abnormal)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Your Lab Results - ${report.patient_name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; max-width: 600px; margin: 0 auto; background: white; }
  .header { text-align: center; border-bottom: 2px solid #1a7a2e; padding-bottom: 15px; margin-bottom: 20px; }
  .logo { max-height: 50px; margin-bottom: 10px; }
  .facility-name { font-size: 18px; font-weight: bold; color: #1a7a2e; }
  .greeting { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  .result-item { border-bottom: 1px solid #eee; padding: 10px 0; }
  .result-name { font-weight: bold; }
  .result-value { float: right; }
  .normal { color: #10b981; }
  .abnormal { color: #ef4444; font-weight: bold; }
  .note { background: #fff3cd; padding: 10px; border-radius: 8px; margin: 15px 0; font-size: 13px; }
  .footer { text-align: center; font-size: 11px; color: #666; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
</style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" alt="MamaPikin Connect Logo" class="logo" onerror="this.style.display='none'" />
    <div class="facility-name">${FACILITY.name}</div>
    <div>Your Laboratory Results</div>
  </div>

  <div class="greeting">
    <strong>Dear ${report.patient_name},</strong><br/>
    Your laboratory results are now available. Please review them below.
  </div>

  <p><strong>Report ID:</strong> ${report.result_id}<br/><strong>Report Date:</strong> ${reportDateTime}</p>

  <h3>Test Results: ${report.test_name}</h3>
  ${items.map(item => `
    <div class="result-item">
      <div class="result-name">${item.test_name}</div>
      <div class="result-value ${item.is_abnormal ? 'abnormal' : 'normal'}">${item.result_value || 'Pending'} ${item.unit}</div>
      <div style="font-size: 12px; color: #666;">Reference: ${item.normal_range || 'N/A'} ${item.unit}</div>
    </div>
  `).join('')}

  ${abnormalItems.length > 0 ? `
  <div class="note">
    <strong>⚠️ Note:</strong> Some of your results are outside the normal range. Please discuss these findings with your healthcare provider.
  </div>
  ` : `
  <div class="note">
    ✅ All your results are within normal limits.
  </div>
  `}

  <div class="footer">
    <p>For questions about your results, contact your healthcare provider or the laboratory.</p>
    <p>📞 ${FACILITY.phone} | ✉️ ${FACILITY.email}</p>
    <p>${FACILITY.project}</p>
  </div>
</body>
</html>`
}

// 4. WhatsApp Message
function generateWhatsAppMessage(report: LabResult): string {
  const isCritical = report.flag === 'Critical'
  let msg = `🏥 *${FACILITY.name}*\n`
  msg += `🔬 *LABORATORY RESULTS*\n\n`
  msg += `👤 *Patient:* ${report.patient_name}\n`
  msg += `🆔 *ID:* ${report.patient_id}\n`
  msg += `📅 *Date:* ${new Date().toLocaleDateString()}\n\n`
  msg += `*${report.test_name.toUpperCase()}:*\n━━━━━━━━━━━━━━━\n`
  
  parseResultValues(report.result_value).forEach(line => {
    let cleanLine = line.replace(/\[.*?\]/g, '').trim()
    msg += `• ${cleanLine}`
    if (line.includes('[Critical]')) msg += ` 🔴 CRITICAL`
    else if (line.includes('[Abnormal]')) msg += ` ⚠️ Flag`
    msg += `\n`
  })
  
  if (isCritical) {
    msg += `\n⚠️ *CRITICAL RESULTS DETECTED.* Please consult your doctor immediately.\n`
  }
  
  msg += `\n📞 ${FACILITY.phone}\n`
  msg += `© ${FACILITY.project}\n`
  return msg
}


// ============ MAIN COMPONENT ============

export default function CompletedResultsPage() {
  const [results, setResults] = useState<LabResult[]>([])
  const [ordersDict, setOrdersDict] = useState<Record<string, OrderRecord>>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [flagFilter, setFlagFilter] = useState('all')

  useEffect(() => {
    loadCompletedResults()
  }, [])

  async function loadCompletedResults() {
    setLoading(true)
    const combinedResultsMap = new Map<string, LabResult>()
    const localOrderDict: Record<string, OrderRecord> = {}

    try {
      // 1. Fetch Local Data
      const localResults = await db.lab_results.toArray()
      const localOrders = await db.lab_orders.toArray()

      localOrders.forEach(o => { 
        localOrderDict[o.order_id] = {
          patient_id: o.patient_id, // Fixes TS Error
          patient_name: o.patient_name,
          priority: o.priority,
          clinical_notes: o.clinical_notes,
          patient_phone: '076000000', // Mock fallback
          patient_email: 'patient@example.com' // Mock fallback
        } 
      })

      localResults.forEach(res => {
        const match = localOrderDict[res.order_id]
        combinedResultsMap.set(res.result_id, {
          ...res,
          patient_id: (res as any).patient_id || match?.patient_id || 'Unknown ID', // Fixes TS Error
          patient_name: match?.patient_name || 'Unknown Patient',
          priority: match?.priority || 'Routine',
          clinical_notes: match?.clinical_notes || '',
          patient_phone: match?.patient_phone,
          patient_email: match?.patient_email
        })
      })

      // 2. Fetch Cloud Data
      if (navigator.onLine) {
        const supabaseUrl = getSupabaseUrl()
        const supabaseAnonKey = getSupabaseAnonKey()
        
        const resReq = await fetch(`${supabaseUrl}/rest/v1/lab_results?order=created_at.desc&limit=100`, { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }})
        const ordReq = await fetch(`${supabaseUrl}/rest/v1/lab_orders?select=order_id,patient_id,patient_name,priority,clinical_notes&limit=500`, { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }})

        if (resReq.ok && ordReq.ok) {
          const cloudResults = await resReq.json()
          const cloudOrders = await ordReq.json()
          
          cloudOrders.forEach((o: any) => { 
            localOrderDict[o.order_id] = { 
              patient_id: o.patient_id, // Fixes TS Error
              patient_name: o.patient_name, 
              priority: o.priority, 
              clinical_notes: o.clinical_notes,
              patient_phone: '076000000',
              patient_email: 'patient@example.com' 
            } 
          })

          cloudResults.forEach((res: LabResult) => {
            if (!combinedResultsMap.has(res.result_id)) {
              const match = localOrderDict[res.order_id]
              combinedResultsMap.set(res.result_id, {
                ...res,
                patient_id: res.patient_id || match?.patient_id || 'Unknown ID', // Fixes TS Error
                patient_name: match?.patient_name || 'Unknown Patient',
                priority: match?.priority || 'Routine',
                clinical_notes: match?.clinical_notes || '',
                patient_phone: match?.patient_phone,
                patient_email: match?.patient_email
              })
            }
          })
        }
      }
    } catch (err) { console.error(err) }

    setOrdersDict(localOrderDict)
    
    const finalArray = Array.from(combinedResultsMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    setResults(finalArray)
    setLoading(false)
  }

  // --- Actions ---
  function shareInternal(report: LabResult) {
    const html = generateInternalReport(report, '/logo.png')
    const win = window.open()
    win?.document.write(html)
    win?.document.close()
    setMessage('🏥 Internal HTML report generated successfully')
    setTimeout(() => setMessage(''), 3000)
  }

  function shareExternal(report: LabResult) {
    const html = generateExternalReport(report, '/logo.png')
    const win = window.open()
    win?.document.write(html)
    win?.document.close()
    setMessage('🏢 External HTML report generated successfully')
    setTimeout(() => setMessage(''), 3000)
  }

  function printReport(report: LabResult) {
    const html = generateInternalReport(report, '/logo.png')
    const printWin = window.open('', '_blank')
    printWin?.document.write(html)
    printWin?.document.write('<div style="text-align:center; margin:20px;"><button onclick="window.print();window.close();" style="padding:10px 20px; background:#1a7a2e; color:white; border:none; border-radius:5px; font-weight:bold; font-size:16px;">🖨️ Print Document</button></div>')
    printWin?.document.close()
    setMessage('🖨️ Print dialog opened')
    setTimeout(() => setMessage(''), 3000)
  }

  function shareEmail(report: LabResult) {
    const match = ordersDict[report.order_id]
    const email = match?.patient_email || ''
    const html = generatePatientReport(report, '/logo.png')
    const plainText = html.replace(/<[^>]*>/g, '')
    const mailto = `mailto:${email}?subject=Your Laboratory Results&body=${encodeURIComponent(plainText)}`
    window.open(mailto)
    setMessage(`📧 Default Email client opened`)
    setTimeout(() => setMessage(''), 3000)
  }

  function shareWhatsApp(report: LabResult) {
    const match = ordersDict[report.order_id]
    const phone = match?.patient_phone?.replace(/^0/, '232') || ''
    const text = generateWhatsAppMessage(report)
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    setMessage(`📱 WhatsApp application triggered`)
    setTimeout(() => setMessage(''), 3000)
  }

  // Filtering
  const filteredResults = results.filter(r => {
    const searchString = `${r.patient_name} ${r.patient_id} ${r.order_id} ${r.test_name}`.toLowerCase()
    const matchesSearch = searchString.includes(searchTerm.toLowerCase())
    const matchesFlag = flagFilter === 'all' || r.flag.toLowerCase() === flagFilter.toLowerCase()
    return matchesSearch && matchesFlag
  })

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8 relative">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link href="/lab" className="text-green-600 hover:text-green-800 font-bold">← Back to Lab</Link>
              <h1 className="text-3xl font-black text-gray-900 mt-1">✅ Completed Results</h1>
            </div>
            <button onClick={loadCompletedResults} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2">
              🔄 Refresh Records
            </button>
          </div>

          {message && <div className="mb-4 p-3 rounded-lg font-bold bg-green-100 text-green-800 border-l-4 border-green-500">{message}</div>}

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Search Patient or ID</label>
              <input type="text" placeholder="Search name, Patient ID, or Order ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Clinical Flag Filter</label>
              <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                <option value="all">All Diagnostic Results</option>
                <option value="normal">Normal Range Only</option>
                <option value="abnormal">Abnormal Flags Only</option>
                <option value="critical">🚨 Critical Anomalies Only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 font-bold animate-pulse">Compiling finalized laboratory matrix...</div>
          ) : filteredResults.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 font-medium border">No completed laboratory records found matching criteria.</div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left">
                  <thead className="bg-gray-800 text-white text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Clinical Flag</th>
                      <th className="px-6 py-4">Patient Identity</th>
                      <th className="px-6 py-4">Test Profile</th>
                      <th className="px-6 py-4 text-center" colSpan={5}>Export Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {filteredResults.map((res) => {
                      const isCritical = res.flag.toLowerCase() === 'critical'
                      const isAbnormal = res.flag.toLowerCase() === 'abnormal'
                      const items = mapResultToItems(res)
                      
                      return (
                        <tr key={res.result_id} className={`hover:bg-gray-50 transition-colors ${isCritical ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm uppercase border
                              ${isCritical ? 'bg-red-100 text-red-800 border-red-400 animate-pulse' : 
                                isAbnormal ? 'bg-orange-100 text-orange-800 border-orange-400' : 
                                'bg-green-100 text-green-800 border-green-300'}`}>
                              {isCritical ? '🚨 Critical' : isAbnormal ? '⚠️ Abnormal' : '✅ Normal'}
                            </span>
                            <div className="text-xs text-gray-500 mt-2 font-mono">{new Date(res.created_at).toLocaleDateString('en-GB')}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{res.patient_name}</div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {res.patient_id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-green-800 border-b border-gray-200 pb-1 mb-1">{res.test_name}</div>
                            {items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-gray-600">{item.test_name}:</span>
                                <span className={`text-xs font-black ${item.is_abnormal ? 'text-red-600' : 'text-gray-900'}`}>
                                  {item.result_value}
                                </span>
                              </div>
                            ))}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => shareInternal(res)} className="px-3 py-1.5 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200 shadow-sm text-xs">🏥 Internal</button>
                              <button onClick={() => shareExternal(res)} className="px-3 py-1.5 bg-purple-100 text-purple-700 font-bold rounded hover:bg-purple-200 shadow-sm text-xs">🏢 External</button>
                              <button onClick={() => shareEmail(res)} className="px-3 py-1.5 bg-green-100 text-green-700 font-bold rounded hover:bg-green-200 shadow-sm text-xs">📧 Email</button>
                              <button onClick={() => shareWhatsApp(res)} className="px-3 py-1.5 bg-teal-100 text-teal-700 font-bold rounded hover:bg-teal-200 shadow-sm text-xs">📱 WhatsApp</button>
                              <button onClick={() => printReport(res)} className="px-3 py-1.5 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 shadow-sm text-xs">🖨️ Print</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}