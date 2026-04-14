import { supabase } from './supabaseClient';
import { db, getUnsyncedData, markAsSynced } from './db';

// Define types for sync data
interface SyncPatient {
  id: string;
  full_name: string;
  phone: string;
  village: string;
  district: string;
  date_of_birth?: string;
  blood_group?: string;
  allergies?: string;
  guardian_name?: string;
  guardian_phone?: string;
  is_pregnant: boolean;
  facility_code: string;
  consent_timestamp: string;
  created_at: string;
}

interface SyncAncVisit {
  id: string;
  patient_id: string;
  visit_number: number;
  gestational_age_weeks?: number;
  weight_kg?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  fundal_height_cm?: number;
  fetal_heart_rate?: number;
  danger_signs_present: boolean;
  danger_signs_list?: string;
  visit_date: string;
  next_visit_date?: string;
}

interface SyncPrescription {
  id: string;
  patient_id: string;
  medicine_id?: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  quantity: number;
  instructions?: string;
  status: string;
  prescribed_by: string;
  created_at: string;
}

interface SyncLabRequest {
  id: string;
  patient_id: string;
  test_name: string;
  priority: string;
  status: string;
  ordered_by: string;
  ordered_at: string;
  result_value?: string;
  result_flag?: string;
}

interface SyncDelivery {
  id: string;
  patient_id: string;
  delivery_date: string;
  mode_of_delivery: string;
  baby_gender: string;
  baby_birth_weight_kg?: number;
  baby_apgar_1min?: number;
  baby_apgar_5min?: number;
  pph_risk_score?: number;
}

// Sync a single patient to Supabase
async function syncPatient(patient: SyncPatient): Promise<boolean> {
  try {
    const patientData = {
      id: patient.id,
      full_name: patient.full_name,
      phone: patient.phone,
      village: patient.village,
      district: patient.district,
      date_of_birth: patient.date_of_birth,
      blood_group: patient.blood_group,
      allergies: patient.allergies,
      guardian_name: patient.guardian_name,
      guardian_phone: patient.guardian_phone,
      is_pregnant: patient.is_pregnant,
      facility_code: patient.facility_code,
      consent_timestamp: patient.consent_timestamp,
      created_at: patient.created_at,
    };
    
    const { error } = await supabase
      .from('patients')
      .upsert(patientData);
    
    if (error) {
      console.error('Error syncing patient:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing patient:', err);
    return false;
  }
}

// Sync a single ANC visit to Supabase
async function syncAncVisit(visit: SyncAncVisit): Promise<boolean> {
  try {
    const visitData = {
      id: visit.id,
      patient_id: visit.patient_id,
      visit_number: visit.visit_number,
      gestational_age_weeks: visit.gestational_age_weeks,
      weight_kg: visit.weight_kg,
      bp_systolic: visit.bp_systolic,
      bp_diastolic: visit.bp_diastolic,
      fundal_height_cm: visit.fundal_height_cm,
      fetal_heart_rate: visit.fetal_heart_rate,
      danger_signs_present: visit.danger_signs_present,
      danger_signs_list: visit.danger_signs_list,
      visit_date: visit.visit_date,
      next_visit_date: visit.next_visit_date,
    };
    
    const { error } = await supabase
      .from('anc_visits')
      .upsert(visitData);
    
    if (error) {
      console.error('Error syncing ANC visit:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing ANC visit:', err);
    return false;
  }
}

// Sync a single prescription to Supabase
async function syncPrescription(prescription: SyncPrescription): Promise<boolean> {
  try {
    const prescriptionData = {
      id: prescription.id,
      patient_id: prescription.patient_id,
      medicine_id: prescription.medicine_id,
      medicine_name: prescription.medicine_name,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration_days: prescription.duration_days,
      quantity: prescription.quantity,
      instructions: prescription.instructions,
      status: prescription.status,
      prescribed_by: prescription.prescribed_by,
      created_at: prescription.created_at,
    };
    
    const { error } = await supabase
      .from('prescriptions')
      .upsert(prescriptionData);
    
    if (error) {
      console.error('Error syncing prescription:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing prescription:', err);
    return false;
  }
}

// Sync a single lab request to Supabase
async function syncLabRequest(request: SyncLabRequest): Promise<boolean> {
  try {
    const requestData = {
      id: request.id,
      patient_id: request.patient_id,
      test_name: request.test_name,
      priority: request.priority,
      status: request.status,
      ordered_by: request.ordered_by,
      ordered_at: request.ordered_at,
      result_value: request.result_value,
      result_flag: request.result_flag,
    };
    
    const { error } = await supabase
      .from('lab_requests')
      .upsert(requestData);
    
    if (error) {
      console.error('Error syncing lab request:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing lab request:', err);
    return false;
  }
}

// Sync a single delivery to Supabase
async function syncDelivery(delivery: SyncDelivery): Promise<boolean> {
  try {
    const deliveryData = {
      id: delivery.id,
      patient_id: delivery.patient_id,
      delivery_date: delivery.delivery_date,
      mode_of_delivery: delivery.mode_of_delivery,
      baby_gender: delivery.baby_gender,
      baby_birth_weight_kg: delivery.baby_birth_weight_kg,
      baby_apgar_1min: delivery.baby_apgar_1min,
      baby_apgar_5min: delivery.baby_apgar_5min,
      pph_risk_score: delivery.pph_risk_score,
    };
    
    const { error } = await supabase
      .from('deliveries')
      .upsert(deliveryData);
    
    if (error) {
      console.error('Error syncing delivery:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing delivery:', err);
    return false;
  }
}

// Main sync function - sync all unsynced data to Supabase
export async function syncAllToSupabase(): Promise<{
  success: boolean;
  synced: { patients: number; anc_visits: number; prescriptions: number; lab_requests: number; deliveries: number };
  errors: string[];
}> {
  const result = {
    success: true,
    synced: { patients: 0, anc_visits: 0, prescriptions: 0, lab_requests: 0, deliveries: 0 },
    errors: [] as string[]
  };
  
  try {
    // Get all unsynced data
    const unsynced = await getUnsyncedData();
    
    // Sync patients
    for (const patient of unsynced.patients) {
      const success = await syncPatient(patient as SyncPatient);
      if (success) {
        await markAsSynced('patients', patient.id);
        result.synced.patients++;
      } else {
        result.errors.push(`Failed to sync patient: ${patient.id}`);
      }
    }
    
    // Sync ANC visits
    for (const visit of unsynced.anc_visits) {
      const success = await syncAncVisit(visit as SyncAncVisit);
      if (success) {
        await markAsSynced('anc_visits', visit.id);
        result.synced.anc_visits++;
      } else {
        result.errors.push(`Failed to sync ANC visit: ${visit.id}`);
      }
    }
    
    // Sync prescriptions
    for (const prescription of unsynced.prescriptions) {
      const success = await syncPrescription(prescription as SyncPrescription);
      if (success) {
        await markAsSynced('prescriptions', prescription.id);
        result.synced.prescriptions++;
      } else {
        result.errors.push(`Failed to sync prescription: ${prescription.id}`);
      }
    }
    
    // Sync lab requests
    for (const request of unsynced.lab_requests) {
      const success = await syncLabRequest(request as SyncLabRequest);
      if (success) {
        await markAsSynced('lab_requests', request.id);
        result.synced.lab_requests++;
      } else {
        result.errors.push(`Failed to sync lab request: ${request.id}`);
      }
    }
    
    // Sync deliveries
    for (const delivery of unsynced.deliveries) {
      const success = await syncDelivery(delivery as SyncDelivery);
      if (success) {
        await markAsSynced('deliveries', delivery.id);
        result.synced.deliveries++;
      } else {
        result.errors.push(`Failed to sync delivery: ${delivery.id}`);
      }
    }
    
    if (result.errors.length > 0) {
      result.success = false;
    }
    
    console.log('Sync completed:', result.synced);
    return result;
    
  } catch (error) {
    console.error('Sync error:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    return result;
  }
}

// Sync specific table data
export async function syncTable(tableName: string, ids: string[]): Promise<boolean> {
  try {
    if (tableName === 'patients') {
      const data = await db.patients.filter(p => ids.includes(p.id)).toArray();
      for (const item of data) {
        await syncPatient(item as SyncPatient);
        await markAsSynced(tableName, item.id);
      }
    } else if (tableName === 'anc_visits') {
      const data = await db.anc_visits.filter(a => ids.includes(a.id)).toArray();
      for (const item of data) {
        await syncAncVisit(item as SyncAncVisit);
        await markAsSynced(tableName, item.id);
      }
    } else if (tableName === 'prescriptions') {
      const data = await db.prescriptions.filter(p => ids.includes(p.id)).toArray();
      for (const item of data) {
        await syncPrescription(item as SyncPrescription);
        await markAsSynced(tableName, item.id);
      }
    } else if (tableName === 'lab_requests') {
      const data = await db.lab_requests.filter(l => ids.includes(l.id)).toArray();
      for (const item of data) {
        await syncLabRequest(item as SyncLabRequest);
        await markAsSynced(tableName, item.id);
      }
    } else if (tableName === 'deliveries') {
      const data = await db.deliveries.filter(d => ids.includes(d.id)).toArray();
      for (const item of data) {
        await syncDelivery(item as SyncDelivery);
        await markAsSynced(tableName, item.id);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error syncing ${tableName}:`, error);
    return false;
  }
}