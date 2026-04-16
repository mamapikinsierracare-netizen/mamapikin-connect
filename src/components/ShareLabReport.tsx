// src/components/ShareLabReport.tsx
// ISO 15189:2022 compliant laboratory report generator

// Helper: Current date/time in ISO format
const getCurrentDateTimeISO = () => {
  const now = new Date()
  return now.toISOString().replace('T', ' ').substring(0, 19)
}

// Helper: Format date for display
const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Not recorded'
  const d = new Date(dateStr)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

// Facility information – customize as needed
const FACILITY = {
  name: 'MamaPikin Connect National Reference Laboratory',
  address: '48B Wilkinson Road, Freetown, Sierra Leone',
  phone: '+232 76 123 456',
  email: 'lab@mamapikin.sl',
  website: 'www.mamapikin.sl',
  accreditation: 'ISO 15189:2022 – Accredited by SLAAS',
  labDirector: 'Dr. Fatmata Sesay (MD, MSc Clinical Pathology)',
  labLicense: 'MOH/SL/LAB/2024/001',
  project: 'MamaPikin Connect – Sierra Leone Ministry of Health',
  qrVerificationUrl: 'https://verify.mamapikin.sl'
}

// Generate unique report verification code (simple hash)
const generateVerificationCode = (requestId: string) => {
  const hash = Array.from(requestId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return `V-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`
}

// Per‑test interpretation logic
const getTestInterpretation = (testName: string, resultValue: string, normalRange: string): string => {
  const testLower = testName.toLowerCase()
  const num = parseFloat(resultValue)
  const range = normalRange.split('-').map(Number)
  if (range.length === 2 && !isNaN(num)) {
    if (num < range[0]) return `LOW – below reference interval. ${getLowInterpretation(testLower)}`
    if (num > range[1]) return `HIGH – above reference interval. ${getHighInterpretation(testLower)}`
  }
  return 'Within reference interval – no significant abnormality detected.'
}

const getLowInterpretation = (testLower: string): string => {
  if (testLower.includes('hemoglobin') || testLower.includes('hb')) return 'May indicate anemia.'
  if (testLower.includes('glucose')) return 'Hypoglycemia – possible insulin excess or fasting.'
  if (testLower.includes('potassium')) return 'Hypokalemia – may affect cardiac function.'
  return 'Clinically significant – correlate with patient history.'
}

const getHighInterpretation = (testLower: string): string => {
  if (testLower.includes('hemoglobin') || testLower.includes('hb')) return 'May indicate polycythemia or dehydration.'
  if (testLower.includes('glucose')) return 'Hyperglycemia – possible diabetes mellitus.'
  if (testLower.includes('potassium')) return 'Hyperkalemia – risk of cardiac arrhythmia.'
  if (testLower.includes('creatinine')) return 'May indicate renal impairment.'
  return 'Clinically significant – further investigation advised.'
}

// ----------------------------------------------------------------------
// INTERNAL REPORT (full detail for clinicians)
// ----------------------------------------------------------------------
export function generateInternalReport(request: any, items: any[], logoUrl = '/logo.png') {
  const reportDateTime = getCurrentDateTimeISO()
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
  .qr-placeholder { font-family: monospace; font-size: 9px; text-align: center; margin-top: 5px; }
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
      <div class="info-item"><span class="info-label">Specimen Collected:</span> ${request.collected_at ? formatDate(request.collected_at) : 'Not recorded'}</div>
      <div class="info-item"><span class="info-label">Specimen Received:</span> ${request.received_at ? formatDate(request.received_at) : 'Not recorded'}</div>
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
    <div class="signature-line">________________________<br/>Laboratory Scientist<br/>${new Date().toLocaleDateString()}</div>
    <div class="signature-line">________________________<br/>Pathologist / Lab Director<br/>${FACILITY.labDirector}</div>
    <div class="signature-line">Electronically Signed<br/>${reportDateTime}</div>
  </div>

  <div class="footer">
    <p>This report is electronically generated and legally valid without a physical signature (ISO 15189:2022, Clause 5.9).</p>
    <p>${FACILITY.project}</p>
    <div class="disclaimer">Any alteration, reproduction, or distribution without authorization invalidates this report. Verify authenticity at ${FACILITY.qrVerificationUrl} with code ${verificationCode}.</div>
    <div class="qr-placeholder">[ QR Code placeholder – verification URL: ${FACILITY.qrVerificationUrl}/${verificationCode} ]</div>
  </div>
</div>
</body>
</html>`
}

// ----------------------------------------------------------------------
// EXTERNAL REPORT (for other facilities)
// ----------------------------------------------------------------------
export function generateExternalReport(request: any, items: any[], logoUrl = '/logo.png') {
  const reportDateTime = getCurrentDateTimeISO()
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
  .official-badge { background: #f0fdf4; display: inline-block; padding: 4px 15px; border-radius: 20px; font-size: 12px; margin: 10px 0; }
  .info-section { margin-bottom: 20px; border: 1px solid #ddd; padding: 12px; border-radius: 6px; background: #fafafa; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .info-label { font-weight: bold; color: #1a7a2e; display: inline-block; width: 140px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  th { background: #1a7a2e; color: white; }
  .abnormal { background: #fee2e2; color: #b91c1c; font-weight: bold; }
  .signature-area { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 20px; }
  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #555; border-top: 1px solid #eee; padding-top: 10px; }
  .note { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; font-size: 12px; }
  .disclaimer { font-size: 8px; color: #777; margin-top: 5px; }
</style>
</head>
<body>
<div class="report-container">
  <div class="header">
    <img src="${logoUrl}" alt="MamaPikin Connect Logo" class="logo" onerror="this.style.display='none'" />
    <div class="facility-name">${FACILITY.name}</div>
    <div>${FACILITY.address} | 📞 ${FACILITY.phone} | ✉️ ${FACILITY.email}</div>
    <div class="accreditation">${FACILITY.accreditation}</div>
    <div class="official-badge">📋 OFFICIAL LABORATORY REPORT – FOR EXTERNAL USE</div>
    <div class="report-title">EXTERNAL LABORATORY REPORT</div>
  </div>
  <div class="verification" style="text-align:right; font-size:10px;">Verification Code: ${verificationCode} | Report ID: ${request.request_id}</div>

  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Patient Name:</span> ${request.patient_name}</div>
      <div class="info-item"><span class="info-label">Patient ID:</span> ${request.patient_id}</div>
      <div class="info-item"><span class="info-label">Date of Birth:</span> ${request.date_of_birth || 'N/A'}</div>
      <div class="info-item"><span class="info-label">Gender:</span> ${request.gender || 'N/A'}</div>
      <div class="info-item"><span class="info-label">Specimen Collected:</span> ${request.collected_at ? formatDate(request.collected_at) : 'Not recorded'}</div>
      <div class="info-item"><span class="info-label">Reported Date/Time:</span> ${reportDateTime}</div>
      <div class="info-item"><span class="info-label">Requesting Facility:</span> ${request.requested_by || 'N/A'}</div>
    </div>
  </div>

  <h3>LABORATORY RESULTS</h3>
  <table>
    <thead><tr><th>Test Name</th><th>Result</th><th>Reference Range</th><th>Unit</th><th>Flag</th></tr></thead>
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
    <div class="signature-line">________________________<br/>Laboratory Scientist</div>
    <div class="signature-line">________________________<br/>Pathologist / Lab Director</div>
  </div>

  <div class="footer">
    <p>This report is electronically generated and is valid without a physical signature.</p>
    <p>${FACILITY.project}</p>
    <div class="disclaimer">Verify authenticity at ${FACILITY.qrVerificationUrl} with code ${verificationCode}.</div>
  </div>
</div>
</body>
</html>`
}

// ----------------------------------------------------------------------
// PATIENT REPORT (friendly, for email/portal)
// ----------------------------------------------------------------------
export function generatePatientReport(request: any, items: any[], logoUrl = '/logo.png') {
  const reportDateTime = getCurrentDateTimeISO()
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
    Your laboratory results are now available.
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

// ----------------------------------------------------------------------
// WHATSAPP MESSAGE (text only)
// ----------------------------------------------------------------------
export function generateWhatsAppMessage(request: any, items: any[]) {
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