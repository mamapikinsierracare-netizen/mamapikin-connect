// src/types/rbac.ts

export type UserRole = 
  | 'MASTER_ADMIN'      // System owner - you
  | 'SUPER_ADMIN'       // National level
  | 'SYSTEM_ADMIN'      // District level
  | 'FACILITY_ADMIN'    // Facility level
  | 'SENIOR_DOCTOR'     // Clinical supervisor
  | 'DOCTOR'            // Medical officer
  | 'SENIOR_NURSE'      // Nursing supervisor
  | 'NURSE'             // Registered nurse
  | 'MIDWIFE'           // Skilled birth attendant
  | 'SENIOR_PHARMACIST' // Pharmacy supervisor
  | 'PHARMACIST'        // Dispensing pharmacist
  | 'SENIOR_LAB_TECH'   // Lab supervisor
  | 'LAB_TECHNICIAN'    // Lab technician
  | 'DATA_ENTRY_OFFICER'// Data entry
  | 'CHO'               // Community Health Officer
  | 'CHW'               // Community Health Worker
  | 'TBA'               // Traditional Birth Attendant
  | 'PATIENT'           // Patient (self)
  | 'VIEWER'            // Read-only viewer

export type User = {
  id: string
  email: string
  role: UserRole
  full_name: string
  facility_code: string | null
  facility_name: string | null
  district: string | null
  district_name: string | null
  region: string | null
  employee_id: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  created_by: string | null
  last_login: string | null
}

// Role hierarchy levels
export const roleHierarchy: Record<UserRole, number> = {
  'MASTER_ADMIN': 100,
  'SUPER_ADMIN': 95,
  'SYSTEM_ADMIN': 90,
  'FACILITY_ADMIN': 85,
  'SENIOR_DOCTOR': 75,
  'DOCTOR': 70,
  'SENIOR_NURSE': 65,
  'NURSE': 60,
  'MIDWIFE': 60,
  'SENIOR_PHARMACIST': 55,
  'PHARMACIST': 50,
  'SENIOR_LAB_TECH': 55,
  'LAB_TECHNICIAN': 50,
  'DATA_ENTRY_OFFICER': 45,
  'CHO': 40,
  'CHW': 35,
  'TBA': 30,
  'PATIENT': 20,
  'VIEWER': 10
}

// Role display names for UI
export const roleDisplayNames: Record<UserRole, string> = {
  'MASTER_ADMIN': 'Master Administrator',
  'SUPER_ADMIN': 'Super Administrator (National)',
  'SYSTEM_ADMIN': 'System Administrator (District)',
  'FACILITY_ADMIN': 'Facility Administrator',
  'SENIOR_DOCTOR': 'Senior Doctor',
  'DOCTOR': 'Doctor',
  'SENIOR_NURSE': 'Senior Nurse',
  'NURSE': 'Nurse',
  'MIDWIFE': 'Midwife',
  'SENIOR_PHARMACIST': 'Senior Pharmacist',
  'PHARMACIST': 'Pharmacist',
  'SENIOR_LAB_TECH': 'Senior Lab Technician',
  'LAB_TECHNICIAN': 'Lab Technician',
  'DATA_ENTRY_OFFICER': 'Data Entry Officer',
  'CHO': 'Community Health Officer',
  'CHW': 'Community Health Worker',
  'TBA': 'Traditional Birth Attendant',
  'PATIENT': 'Patient',
  'VIEWER': 'Viewer (Read-Only)'
}

// Role descriptions for training
export const roleDescriptions: Record<UserRole, string> = {
  'MASTER_ADMIN': 'System owner. Full access to everything. Can create/delete any admin.',
  'SUPER_ADMIN': 'National level oversight. Can view all districts, approve national requests.',
  'SYSTEM_ADMIN': 'District level management. Manages all facilities in assigned district.',
  'FACILITY_ADMIN': 'Facility level management. Manages staff, approves facility-level requests.',
  'SENIOR_DOCTOR': 'Clinical supervisor. Can approve complex cases, supervise doctors.',
  'DOCTOR': 'Medical officer. Diagnoses, prescribes, manages high-risk patients.',
  'SENIOR_NURSE': 'Nursing supervisor. Oversees nurses and midwives.',
  'NURSE': 'Registered nurse. Provides patient care, records ANC/PNC visits.',
  'MIDWIFE': 'Skilled birth attendant. Manages deliveries, newborn care.',
  'SENIOR_PHARMACIST': 'Pharmacy supervisor. Approves bulk orders, manages controlled substances.',
  'PHARMACIST': 'Dispenses medications, manages inventory, alerts for expiries.',
  'SENIOR_LAB_TECH': 'Lab supervisor. Quality control, approves test results.',
  'LAB_TECHNICIAN': 'Processes lab tests, enters results, flags abnormal values.',
  'DATA_ENTRY_OFFICER': 'Enters patient data, manages records, assists with reports.',
  'CHO': 'Community Health Officer. Supervises CHWs, coordinates outreach.',
  'CHW': 'Community Health Worker. Home visits, health education, defaulter tracing.',
  'TBA': 'Traditional Birth Attendant. Records home deliveries, refers emergencies.',
  'PATIENT': 'Can view own medical records, generate emergency access tokens.',
  'VIEWER': 'Read-only access. Can view reports and patient data (no edits).'
}