import Dexie, { Table } from 'dexie';

// Define the structure of a Patient record for offline storage
export interface OfflinePatient {
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
  synced: boolean;
  pending_sync: boolean;
  last_modified: number;
}

// Define the structure of an ANC visit record for offline storage
export interface OfflineANC {
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
  synced: boolean;
  pending_sync: boolean;
  last_modified: number;
}

// Define the structure of a Prescription record for offline storage
export interface OfflinePrescription {
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
  synced: boolean;
  pending_sync: boolean;
  last_modified: number;
}

// Define the structure of a Lab Request for offline storage
export interface OfflineLabRequest {
  id: string;
  patient_id: string;
  test_name: string;
  priority: string;
  status: string;
  ordered_by: string;
  ordered_at: string;
  result_value?: string;
  result_flag?: string;
  synced: boolean;
  pending_sync: boolean;
  last_modified: number;
}

// Define the structure of a Delivery record for offline storage
export interface OfflineDelivery {
  id: string;
  patient_id: string;
  delivery_date: string;
  mode_of_delivery: string;
  baby_gender: string;
  baby_birth_weight_kg?: number;
  baby_apgar_1min?: number;
  baby_apgar_5min?: number;
  pph_risk_score?: number;
  synced: boolean;
  pending_sync: boolean;
  last_modified: number;
}

// Define the Sync Queue item structure
export interface SyncQueueItem {
  id?: number;
  operation: string; // 'INSERT', 'UPDATE', 'DELETE'
  table: string;     // 'patients', 'anc_visits', 'prescriptions', etc.
  data: any;
  timestamp: number;
  retry_count: number;
}

// Create the database class
class MamaPikinDB extends Dexie {
  patients!: Table<OfflinePatient, string>;
  anc_visits!: Table<OfflineANC, string>;
  prescriptions!: Table<OfflinePrescription, string>;
  lab_requests!: Table<OfflineLabRequest, string>;
  deliveries!: Table<OfflineDelivery, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('MamaPikinDB');
    
    // Define database version and schema
    this.version(1).stores({
      patients: 'id, full_name, phone, district, synced, pending_sync, last_modified',
      anc_visits: 'id, patient_id, visit_date, synced, pending_sync, last_modified',
      prescriptions: 'id, patient_id, synced, pending_sync, last_modified',
      lab_requests: 'id, patient_id, status, synced, pending_sync, last_modified',
      deliveries: 'id, patient_id, delivery_date, synced, pending_sync, last_modified',
      sync_queue: '++id, operation, table, timestamp, retry_count'
    });
  }
}

// Create and export database instance
export const db = new MamaPikinDB();

// Save data locally with sync flag
export async function saveOffline(tableName: string, data: any): Promise<any> {
  const dbTable = db[tableName as keyof MamaPikinDB] as Table;
  
  // Add metadata for offline sync
  const record = {
    ...data,
    synced: false,
    pending_sync: true,
    last_modified: Date.now()
  };
  
  // Save to local database
  await dbTable.put(record);
  
  // Add to sync queue
  await db.sync_queue.add({
    operation: 'INSERT',
    table: tableName,
    data: record,
    timestamp: Date.now(),
    retry_count: 0
  });
  
  console.log(`Saved ${tableName} record offline:`, record.id);
  return record;
}

// Update data locally
export async function updateOffline(tableName: string, id: string, updates: any): Promise<void> {
  const dbTable = db[tableName as keyof MamaPikinDB] as Table;
  
  const existing = await dbTable.get(id);
  if (existing) {
    const updated = {
      ...existing,
      ...updates,
      synced: false,
      pending_sync: true,
      last_modified: Date.now()
    };
    
    await dbTable.put(updated);
    
    await db.sync_queue.add({
      operation: 'UPDATE',
      table: tableName,
      data: updated,
      timestamp: Date.now(),
      retry_count: 0
    });
  }
}

// Delete data locally
export async function deleteOffline(tableName: string, id: string): Promise<void> {
  const dbTable = db[tableName as keyof MamaPikinDB] as Table;
  
  await dbTable.delete(id);
  
  await db.sync_queue.add({
    operation: 'DELETE',
    table: tableName,
    data: { id },
    timestamp: Date.now(),
    retry_count: 0
  });
}

// Get all unsynced data from all tables - FIXED: using filter instead of where().equals()
export async function getUnsyncedData(): Promise<{
  patients: OfflinePatient[];
  anc_visits: OfflineANC[];
  prescriptions: OfflinePrescription[];
  lab_requests: OfflineLabRequest[];
  deliveries: OfflineDelivery[];
}> {
  // Use filter instead of where().equals() to avoid TypeScript errors with boolean
  const patients = await db.patients.filter(p => p.pending_sync === true).toArray();
  const anc_visits = await db.anc_visits.filter(a => a.pending_sync === true).toArray();
  const prescriptions = await db.prescriptions.filter(p => p.pending_sync === true).toArray();
  const lab_requests = await db.lab_requests.filter(l => l.pending_sync === true).toArray();
  const deliveries = await db.deliveries.filter(d => d.pending_sync === true).toArray();
  
  return { patients, anc_visits, prescriptions, lab_requests, deliveries };
}

// Mark a record as synced
export async function markAsSynced(tableName: string, id: string): Promise<void> {
  const dbTable = db[tableName as keyof MamaPikinDB] as Table;
  await dbTable.update(id, { synced: true, pending_sync: false });
  
  // Remove from sync queue - FIXED: using filter and delete
  const items = await db.sync_queue.filter(item => item.data?.id === id).toArray();
  for (const item of items) {
    if (item.id) {
      await db.sync_queue.delete(item.id);
    }
  }
}

// Get all pending sync queue items
export async function getPendingSyncQueue(): Promise<SyncQueueItem[]> {
  return await db.sync_queue.toArray();
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  return await db.sync_queue.count();
}

// Clear all sync queue (use after successful sync)
export async function clearSyncQueue(): Promise<void> {
  await db.sync_queue.clear();
}

// Get all offline patients (for viewing)
export async function getOfflinePatients(): Promise<OfflinePatient[]> {
  return await db.patients.toArray();
}

// Get offline patients by district - FIXED: using filter
export async function getOfflinePatientsByDistrict(district: string): Promise<OfflinePatient[]> {
  return await db.patients.filter(p => p.district === district).toArray();
}

// Get offline patient by ID
export async function getOfflinePatientById(id: string): Promise<OfflinePatient | undefined> {
  return await db.patients.get(id);
}

// Get offline ANC visits for a patient - FIXED: using filter
export async function getOfflineAncVisits(patientId: string): Promise<OfflineANC[]> {
  return await db.anc_visits.filter(a => a.patient_id === patientId).toArray();
}

// Get offline prescriptions for a patient - FIXED: using filter
export async function getOfflinePrescriptions(patientId: string): Promise<OfflinePrescription[]> {
  return await db.prescriptions.filter(p => p.patient_id === patientId).toArray();
}

// Clear all offline data (use with caution)
export async function clearAllOfflineData(): Promise<void> {
  await db.patients.clear();
  await db.anc_visits.clear();
  await db.prescriptions.clear();
  await db.lab_requests.clear();
  await db.deliveries.clear();
  await db.sync_queue.clear();
  console.log('All offline data cleared');
}

// Get database statistics
export async function getOfflineStats(): Promise<{
  patients: number;
  anc_visits: number;
  prescriptions: number;
  pending_sync: number;
}> {
  const patients = await db.patients.count();
  const anc_visits = await db.anc_visits.count();
  const prescriptions = await db.prescriptions.count();
  const pending_sync = await db.sync_queue.count();
  
  return { patients, anc_visits, prescriptions, pending_sync };
}