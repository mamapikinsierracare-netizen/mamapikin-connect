// src/lib/labWorkflow.ts - Laboratory workflow documentation

export const LabWorkflowStages = {
  PRE_ANALYTICAL: {
    stage: 1,
    name: 'Pre-Analytical Phase',
    steps: [
      { step: 1, name: 'Test Ordering', description: 'Clinician orders tests in the system', responsible: 'Doctor/Nurse' },
      { step: 2, name: 'Patient Identification', description: 'Verify patient identity using two identifiers', responsible: 'Lab Staff' },
      { step: 3, name: 'Sample Collection', description: 'Collect appropriate specimen in correct container', responsible: 'Phlebotomist/Nurse' },
      { step: 4, name: 'Sample Labeling', description: 'Label specimen with patient ID, date, time, and collector initials', responsible: 'Phlebotomist/Nurse' },
      { step: 5, name: 'Sample Transport', description: 'Transport to laboratory within appropriate time and temperature', responsible: 'Courier/Lab Staff' },
      { step: 6, name: 'Sample Receipt', description: 'Log sample receipt, check for hemolysis/clotting', responsible: 'Lab Technician' },
      { step: 7, name: 'Sample Registration', description: 'Register sample in LIS, assign to workstations', responsible: 'Data Entry' },
      { step: 8, name: 'Sample Storage', description: 'Store samples at appropriate temperature until testing', responsible: 'Lab Technician' }
    ]
  },
  ANALYTICAL: {
    stage: 2,
    name: 'Analytical Phase',
    steps: [
      { step: 9, name: 'Test Assignment', description: 'Assign tests to appropriate workstations/analyzers', responsible: 'Section Head' },
      { step: 10, name: 'Quality Control', description: 'Run QC materials, verify within acceptable limits', responsible: 'Lab Technician' },
      { step: 11, name: 'Sample Processing', description: 'Process samples (centrifugation, aliquoting, extraction)', responsible: 'Lab Technician' },
      { step: 12, name: 'Test Execution', description: 'Run tests on analyzers or perform manual tests', responsible: 'Lab Technician' },
      { step: 13, name: 'Result Recording', description: 'Record results in LIS with proper units and reference ranges', responsible: 'Lab Technician' },
      { step: 14, name: 'Result Verification', description: 'Verify results against QC, delta check, and clinical correlation', responsible: 'Senior Technician' },
      { step: 15, name: 'Abnormal Flagging', description: 'Flag results outside reference ranges or critical limits', responsible: 'System Auto' }
    ]
  },
  POST_ANALYTICAL: {
    stage: 3,
    name: 'Post-Analytical Phase',
    steps: [
      { step: 16, name: 'Result Validation', description: 'Medical/Technical validation of results', responsible: 'Pathologist/Senior Tech' },
      { step: 17, name: 'Critical Value Notification', description: 'Immediate notification of critical results to clinician', responsible: 'Lab Staff' },
      { step: 18, name: 'Report Generation', description: 'Generate formatted laboratory report', responsible: 'System Auto' },
      { step: 19, name: 'Report Review', description: 'Final review by pathologist before release', responsible: 'Pathologist' },
      { step: 20, name: 'Result Publishing', description: 'Release results to patient portal, email, WhatsApp, or print', responsible: 'Lab Staff' },
      { step: 21, name: 'Sample Storage', description: 'Store samples for repeat testing (7 days minimum)', responsible: 'Lab Technician' },
      { step: 22, name: 'Sample Disposal', description: 'Dispose of samples according to safety protocols', responsible: 'Lab Technician' }
    ]
  }
}