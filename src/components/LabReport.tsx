// src/components/ShareLabReport.tsx
'use client'

import { LabRequest, LabRequestItem } from '@/types/lab'

// Generate HTML for internal facility sharing
export function generateInternalReport(request: LabRequest, items: LabRequestItem[]): string {
  const reportDate = new Date().toLocaleDateString()
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Internal Lab Report - ${request.patient_name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  .header { text-align: center; border-bottom: 3px solid #1a7a2e; padding-bottom: 15px; margin-bottom: 20px; }
  .logo { font-size: 24px; font-weight: bold; color: #1a7a2e; }
  .title { font-size: 18px; color: #1a5bb8; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #1a7a2e; color: white; }
  .abnormal { background: #fee2e2; color: #dc2626; font-weight: bold; }
  .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">🏥 MamaPikin Connect</div>
    <div class="title">INTERNAL LABORATORY REPORT</div>
    <div>Sierra Leone National Health Laboratory | ISO 15189:2022</div>
  </div>
  <h3>Patient: ${request.patient_name} (ID: ${request.patient_id})</h3>
  <p>Report Date: ${reportDate} | Request ID: ${request.request_id}</p>
  <table>
    <thead><tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Unit</th></tr></thead>
    <tbody>
      ${items.map(item => `<tr class="${item.is_abnormal ? 'abnormal' : ''}">
        <td>${item.test_name}</td>
        <td>${item.result_value || 'Pending'}</td>
        <td>${item.normal_range || 'N/A'}</td>
        <td>${item.unit}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">
    <p>Electronically generated report - Valid without signature</p>
    <p>MamaPikin Connect | Protecting Mothers and Children in Sierra Leone</p>
  </div>
</body>
</html>`
}

// Generate HTML for external facility sharing
export function generateExternalReport(request: LabRequest, items: LabRequestItem[]): string {
  const reportDate = new Date().toLocaleDateString()
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>External Lab Report - ${request.patient_name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  .header { text-align: center; border-bottom: 3px solid #1a7a2e; padding-bottom: 15px; margin-bottom: 20px; }
  .logo { font-size: 28px; font-weight: bold; color: #1a7a2e; }
  .official { background: #f0fdf4; padding: 5px; text-align: center; font-size: 12px; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #1a7a2e; color: white; }
  .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; }
  .note { background: #fff3cd; padding: 10px; margin: 15px 0; border-radius: 5px; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">🏥 MamaPikin Connect</div>
    <div>Sierra Leone National Health Laboratory Network</div>
    <div>ISO 15189:2022 Accredited Laboratory</div>
  </div>
  <div class="official">📋 OFFICIAL LABORATORY REPORT - FOR EXTERNAL USE</div>
  <h3>Patient: ${request.patient_name} (ID: ${request.patient_id})</h3>
  <p>Report Date: ${reportDate} | Request ID: ${request.request_id}</p>
  <table>
    <thead><tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Unit</th></tr></thead>
    <tbody>
      ${items.map(item => `<tr class="${item.is_abnormal ? 'abnormal' : ''}">
        <td>${item.test_name}</td>
        <td>${item.result_value || 'Pending'}</td>
        <td>${item.normal_range || 'N/A'}</td>
        <td>${item.unit}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="note">
    <strong>📌 LABORATORY NOTE:</strong> These results have been verified and authorized. Reference ranges are specific to the methodology used. Clinical correlation is recommended.
  </div>
  <div class="footer">
    <p>MamaPikin Connect - Sierra Leone Ministry of Health | www.mamapikin.sl</p>
  </div>
</body>
</html>`
}

// Generate patient-friendly report for email/WhatsApp
export function generatePatientReport(request: LabRequest, items: LabRequestItem[]): string {
  const reportDate = new Date().toLocaleDateString()
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Your Lab Results - ${request.patient_name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; max-width: 600px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #1a7a2e; padding-bottom: 15px; margin-bottom: 20px; }
  .logo { font-size: 22px; font-weight: bold; color: #1a7a2e; }
  .greeting { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  .result-item { border-bottom: 1px solid #eee; padding: 10px 0; }
  .result-name { font-weight: bold; }
  .result-value { float: right; }
  .normal { color: #10b981; }
  .abnormal { color: #ef4444; font-weight: bold; }
  .footer { text-align: center; font-size: 11px; color: #666; margin-top: 20px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">🏥 MamaPikin Connect</div>
    <div>Your Laboratory Results</div>
  </div>
  <div class="greeting">
    <strong>Dear ${request.patient_name},</strong><br/>
    Your laboratory results are now available.
  </div>
  ${items.map(item => `
    <div class="result-item">
      <div class="result-name">${item.test_name}</div>
      <div class="result-value ${item.is_abnormal ? 'abnormal' : 'normal'}">${item.result_value || 'Pending'} ${item.unit}</div>
      <div style="font-size: 12px; color: #666;">Reference: ${item.normal_range || 'N/A'} ${item.unit}</div>
    </div>
  `).join('')}
  <div class="footer">
    <p>Please discuss these results with your healthcare provider.</p>
    <p>MamaPikin Connect - Protecting Mothers and Children in Sierra Leone</p>
  </div>
</body>
</html>`
}

// WhatsApp message
export function generateWhatsAppMessage(request: LabRequest, items: LabRequestItem[]): string {
  let msg = `🏥 *MamaPikin Connect Laboratory Results*\n\n`
  msg += `👤 *Patient:* ${request.patient_name}\n`
  msg += `🆔 *ID:* ${request.patient_id}\n`
  msg += `📅 *Date:* ${new Date().toLocaleDateString()}\n\n`
  msg += `*Results:*\n`
  items.forEach(item => {
    msg += `• ${item.test_name}: ${item.result_value} ${item.unit}`
    if (item.is_abnormal) msg += ` ⚠️`
    msg += `\n`
  })
  msg += `\n📞 Contact your healthcare provider for interpretation.\n`
  msg += `© MamaPikin Connect - Sierra Leone Ministry of Health`
  return msg
}