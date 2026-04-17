// src/types/lab.ts

export type LabRequest = {
  id?: number
  request_id: string
  patient_id: string
  patient_name: string
  patient_email?: string | null
  patient_phone?: string | null
  requested_by: string
  requested_by_role: string
  request_date: string
  priority: 'routine' | 'urgent' | 'stat'
  clinical_notes?: string | null
  relevant_diagnosis?: string | null
  current_medications?: string | null
  allergies?: string | null
  pregnancy_status?: boolean
  gestational_age?: number | null
  fasting_status?: 'fasted' | 'not_fasted' | 'not_applicable' | null
  consent_obtained?: boolean
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled' | 'rejected'
  cancelled_reason?: string | null
  cancelled_by?: string | null
  cancelled_at?: string | null
  collected_by?: string | null
  collected_at?: string | null
  processed_by?: string | null
  processed_at?: string | null
  verified_by?: string | null
  verified_at?: string | null
  created_at: string
  updated_at?: string
}

export type LabRequestItem = {
  id?: number
  request_id: string
  test_id: string
  test_name: string
  test_category?: string
  specimen_type?: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'invalid'
  result_value?: string | null
  result_numeric?: number | null
  result_text?: string | null
  result_choice?: string | null
  result_date?: string | null
  performed_by?: string | null
  performed_by_name?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  interpretation?: string | null
  is_abnormal?: boolean
  flag?: 'Normal' | 'Low' | 'High' | 'Critical Low' | 'Critical High' | null
  reference_range?: string | null
  normal_range?: string | null
  unit?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string
}

export type LabSample = {
  id?: number
  sample_id: string
  request_id: string
  request_item_id?: number
  patient_id: string
  specimen_type: string
  collected_by: string
  collected_at: string
  specimen_quality?: 'Good' | 'Hemolyzed' | 'Clotted' | 'Insufficient' | 'Contaminated' | 'Rejected'
  specimen_quality_notes?: string
  rejection_reason?: string
  rejected_by?: string
  rejected_at?: string
  received_by_lab?: string
  received_at?: string
  processed_by?: string
  processed_at?: string
  storage_location?: string
  disposal_date?: string
  disposal_method?: string
  created_at: string
}

export type LabTestCatalog = {
  id: number
  test_id: string
  test_name: string
  test_code?: string
  loinc_code?: string
  category: string
  specimen_type: string
  specimen_volume?: string
  specimen_container?: string
  result_format: 'Numeric' | 'Text' | 'Choice' | 'Range' | 'Date' | 'Boolean'
  result_options?: string
  normal_range_min?: number
  normal_range_max?: number
  unit?: string
  turnaround_hours?: number
  requires_fasting?: boolean
  requires_consent?: boolean
  pregnancy_considerations?: string
  pediatric_note?: string
  price?: number
  is_active: boolean
  created_at: string
  updated_at: string
}