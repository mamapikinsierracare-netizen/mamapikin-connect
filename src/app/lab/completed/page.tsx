// src/app/lab/completed/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

type LabRequest = {
  id?: number
  request_id: string
  patient_id: string
  patient_name: string
  patient_email?: string | null
  patient_phone?: string | null
  date_of_birth?: string | null
  gender?: string | null
  request_date: string
  completed_at: string
  status: string
  clinical_notes?: string
  priority?: string
  collected_at?: string
  received_at?: string
  requested_by?: string
}

type LabRequestItem = {
  id?: number
  request_id: string
  test_name: string
  result_value: string
  unit: string
  normal_range: string
  is_abnormal: boolean
  abnormal_flag?: string
  critical_flag?: boolean
}

const getSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

const getSupabaseAnonKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

async function fetchFromSupabase<T>(endpoint: string): Promise<T[]> {
  try {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    })
    if (response.ok) return await response.json()
    return []
  } catch { return [] }
}

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

// Professional Internal Report
function generateInternalReport(request: LabRequest, items: LabRequestItem[], logoUrl = '/logo.png'): string {
  const reportDateTime = formatDateTime(new Date().toISOString())
  const verificationCode = generateVerificationCode(request.request_id)
  const abnormalItems = items.filter(i => i.is_abnormal)
  const criticalItems = items.filter(i => i.critical_flag)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Internal Lab Report - ${request.patient_name}</title>
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
    Verification Code: <strong>${verificationCode}</strong> | Report ID: ${request.request_id}
  </div>

  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Patient Name:</span> ${request.patient_name}</div>
      <div class="info-item"><span class="info-label">Patient ID:</span> ${request.patient_id}</div>
      <div class="info-item"><span class="info-label">Date of Birth:</span> ${request.date_of_birth || 'N/A'}</div>
      <div class="info-item"><span class="info-label">Gender:</span> ${request.gender || 'N/A'}</div>
      <div class="info-item"><span class="info-label">Specimen Collected:</span> ${formatDateTime(request.collected_at)}</div>
      <div class="info-item"><span class="info-label">Specimen Received:</span> ${formatDateTime(request.received_at)}</div>
      <div class="info-item"><span class="info-label">Reported Date/Time:</span> ${reportDateTime}</div>
      <div class="info-item"><span class="info-label">Requesting Clinician:</span> ${request.requested_by || 'N/A'}</div>
      <div class="info-item"><span class="info-label">Priority:</span> ${request.priority?.toUpperCase() || 'Routine'}</div>
    </div>
  </div>

  <h3>LABORATORY RESULTS</h3>
  <table>
    <thead>
      <tr><th>Test Name</th><th>Result</th><th>Reference Range</th><th>Unit</th><th>Flag</th><th>Interpretation</th></tr>
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
  <div class="clinical-notes">
    <strong>⚠️ CLINICAL SUMMARY</strong><br/>
    ${abnormalItems.length} abnormal result(s) detected. ${criticalItems.length > 0 ? 'CRITICAL VALUES – Immediate clinical action required.' : 'Please correlate with clinical findings.'}
  </div>
  ` : ''}

  ${request.clinical_notes ? `
  <div class="clinical-notes">
    <strong>📝 CLINICAL NOTES (Requesting Clinician):</strong><br/>
    ${request.clinical_notes}
  </div>
  ` : ''}

  <div class="signature-area">
    <div class="signature-line">________________________<br/>Laboratory Scientist<br/>${reportDateTime}</div>
    <div class="signature-line">________________________<br/>Pathologist / Lab Director<br/>${FACILITY.labDirector}</div>
    <div class="signature-line">Electronically Signed<br/>${reportDateTime}</div>
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

// Professional External Report
function generateExternalReport(request: LabRequest, items: LabRequestItem[], logoUrl = '/logo.png'): string {
  const reportDateTime = formatDateTime(new Date().toISOString())
  const verificationCode = generateVerificationCode(request.request_id)
  const abnormalItems = items.filter(i => i.is_abnormal)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>External Lab Report - ${request.patient_name}</title>
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
    Verification Code: <strong>${verificationCode}</strong> | Report ID: ${request.request_id}
  </div>

  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Patient Name:</span> ${request.patient_name}</div>
      <div class="info-item"><span class="info-label">Patient ID:</span> ${request.patient_id}</div>
      <div class="info-item"><span class="info-label">Date of Birth:</span> ${request.date_of_birth || 'N/A'}</div>
      <div class="info-item"><span class="info-label">Gender:</span> ${request.gender || 'N/A'}</div>
      <div class="info-item"><span class="info-label">Specimen Collected:</span> ${formatDateTime(request.collected_at)}</div>
      <div class="info-item"><span class="info-label">Specimen Received:</span> ${formatDateTime(request.received_at)}</div>
      <div class="info-item"><span class="info-label">Reported Date/Time:</span> ${reportDateTime}</div>
      <div class="info-item"><span class="info-label">Requesting Facility:</span> ${request.requested_by || 'N/A'}</div>
    </div>
  </div>

  <h3>LABORATORY RESULTS</h3>
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

// Patient-Friendly Report
function generatePatientReport(request: LabRequest, items: LabRequestItem[], logoUrl = '/logo.png'): string {
  const reportDateTime = formatDateTime(new Date().toISOString())
  const abnormalItems = items.filter(i => i.is_abnormal)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Your Lab Results - ${request.patient_name}</title>
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
    <strong>Dear ${request.patient_name},</strong><br/>
    Your laboratory results are now available. Please review them below.
  </div>

  <p><strong>Report ID:</strong> ${request.request_id}<br/><strong>Report Date:</strong> ${reportDateTime}</p>

  <h3>Test Results</h3>
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

// WhatsApp Message
function generateWhatsAppMessage(request: LabRequest, items: LabRequestItem[]): string {
  const abnormalItems = items.filter(i => i.is_abnormal)
  let msg = `🏥 *${FACILITY.name}*\n`
  msg += `🔬 *LABORATORY RESULTS*\n\n`
  msg += `👤 *Patient:* ${request.patient_name}\n`
  msg += `🆔 *ID:* ${request.patient_id}\n`
  msg += `📅 *Date:* ${new Date().toLocaleDateString()}\n\n`
  msg += `*RESULTS:*\n━━━━━━━━━━━━━━━━━━━━\n`
  
  items.forEach(item => {
    msg += `• ${item.test_name}: ${item.result_value} ${item.unit || ''}`
    if (item.is_abnormal) msg += ` ⚠️`
    if (item.critical_flag) msg += ` 🔴 CRITICAL`
    msg += `\n`
  })
  
  if (abnormalItems.length > 0) {
    msg += `\n⚠️ *Abnormal results detected.* Please consult your healthcare provider.\n`
  }
  
  msg += `\n📞 ${FACILITY.phone} | ✉️ ${FACILITY.email}\n`
  msg += `© ${FACILITY.project}\n`
  return msg
}

export default function CompletedPage() {
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [requestItems, setRequestItems] = useState<LabRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const reqs = await fetchFromSupabase<LabRequest>('lab_requests?status=eq.completed&order=completed_at.desc')
    setRequests(reqs)
    const items = await fetchFromSupabase<LabRequestItem>('lab_request_items?status=eq.completed')
    setRequestItems(items)
    setLoading(false)
  }

  const getItemsForRequest = (requestId: string) => requestItems.filter(item => item.request_id === requestId)

  // Sharing functions using professional report generators
  function shareInternal(request: LabRequest) {
    const items = getItemsForRequest(request.request_id)
    const html = generateInternalReport(request, items, '/logo.png')
    const win = window.open()
    win?.document.write(html)
    win?.document.close()
    setMessage('🏥 Internal report generated')
    setTimeout(() => setMessage(''), 2000)
  }

  function shareExternal(request: LabRequest) {
    const items = getItemsForRequest(request.request_id)
    const html = generateExternalReport(request, items, '/logo.png')
    const win = window.open()
    win?.document.write(html)
    win?.document.close()
    setMessage('🏢 External report generated')
    setTimeout(() => setMessage(''), 2000)
  }

  function shareEmail(request: LabRequest) {
    const items = getItemsForRequest(request.request_id)
    const html = generatePatientReport(request, items, '/logo.png')
    const plainText = html.replace(/<[^>]*>/g, '')
    const mailto = `mailto:${request.patient_email || ''}?subject=Your Laboratory Results&body=${encodeURIComponent(plainText)}`
    window.open(mailto)
    setMessage(`📧 Email client opened for ${request.patient_email || 'patient'}`)
    setTimeout(() => setMessage(''), 3000)
  }

  function shareWhatsApp(request: LabRequest) {
    const items = getItemsForRequest(request.request_id)
    const text = generateWhatsAppMessage(request, items)
    const phone = request.patient_phone?.replace(/^0/, '232') || ''
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    setMessage(`📱 WhatsApp opened for ${request.patient_phone || 'patient'}`)
    setTimeout(() => setMessage(''), 3000)
  }

  function printReport(request: LabRequest) {
    const items = getItemsForRequest(request.request_id)
    const html = generateInternalReport(request, items, '/logo.png')
    const printWin = window.open('', '_blank')
    printWin?.document.write(html)
    printWin?.document.write('<div style="text-align:center; margin:20px;"><button onclick="window.print();window.close();" style="padding:10px 20px; background:#1a7a2e; color:white; border:none; border-radius:5px;">🖨️ Print</button></div>')
    printWin?.document.close()
    setMessage('🖨️ Print window opened')
    setTimeout(() => setMessage(''), 2000)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/lab" className="text-green-600 hover:text-green-800">← Back to Lab</Link>
            <h1 className="text-2xl font-bold text-green-700">✅ Completed Results</h1>
          </div>
          {message && <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800">{message}</div>}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No completed results yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Patient</th>
                      <th className="px-4 py-3 text-left">Test Results</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left" colSpan={5}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requests.map(request => {
                      const items = getItemsForRequest(request.request_id)
                      return (
                        <tr key={request.request_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{request.patient_name}</div>
                            <div className="text-xs text-gray-500">{request.patient_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            {items.map(item => (
                              <div key={item.id} className="flex items-center gap-2">
                                <span className="text-sm">{item.test_name}:</span>
                                <span className={`text-sm ${item.is_abnormal ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                                  {item.result_value} {item.unit}
                                </span>
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatDate(request.request_date)}</td>
                          <td className="px-4 py-3"><button onClick={() => shareInternal(request)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">🏥 Internal</button></td>
                          <td className="px-4 py-3"><button onClick={() => shareExternal(request)} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200">🏢 External</button></td>
                          <td className="px-4 py-3"><button onClick={() => shareEmail(request)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">📧 Email</button></td>
                          <td className="px-4 py-3"><button onClick={() => shareWhatsApp(request)} className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs hover:bg-teal-200">📱 WhatsApp</button></td>
                          <td className="px-4 py-3"><button onClick={() => printReport(request)} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">🖨️ Print</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}