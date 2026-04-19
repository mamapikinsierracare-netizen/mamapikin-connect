// Offline-first data service for MamaPikin Connect

export interface Patient {
  patient_id: string;
  full_name: string;
  phone: string | null;
  district: string | null;
  date_of_birth: string | null;
  village: string | null;
  registered_at?: string;
}

export interface AncVisit {
  visit_id: string;
  patient_id: string;
  visit_number: number;
  gestational_age: number | null;
  weight: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  danger_signs: string[];
  is_high_risk: boolean;
  visit_date: string;
  synced_to_cloud: boolean;
}

class OfflineService {
  private isOnline: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => { this.isOnline = true; this.syncAll(); });
      window.addEventListener('offline', () => { this.isOnline = false; });
    }
  }

  // Save patient offline
  async savePatient(patient: Patient): Promise<boolean> {
    try {
      const existing = localStorage.getItem('offline_patients');
      const patients = existing ? JSON.parse(existing) : [];
      
      // Check if patient already exists
      const exists = patients.find((p: Patient) => p.patient_id === patient.patient_id);
      if (!exists) {
        patients.push({ ...patient, registered_at: new Date().toISOString() });
        localStorage.setItem('offline_patients', JSON.stringify(patients));
      }
      
      console.log('💾 Patient saved offline:', patient.full_name);
      return true;
    } catch (error) {
      console.error('Failed to save patient offline:', error);
      return false;
    }
  }

  // Get all patients from offline storage
  getPatientsOffline(): Patient[] {
    try {
      const data = localStorage.getItem('offline_patients');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Search patients offline
  searchPatientsOffline(searchTerm: string): Patient[] {
    const patients = this.getPatientsOffline();
    if (!searchTerm.trim()) return patients;
    
    const lowerSearch = searchTerm.toLowerCase();
    return patients.filter(p => 
      p.full_name.toLowerCase().includes(lowerSearch) ||
      p.patient_id.toLowerCase().includes(lowerSearch) ||
      (p.phone && p.phone.includes(lowerSearch))
    );
  }

  // Save ANC visit offline
  async saveAncVisit(visit: AncVisit): Promise<boolean> {
    try {
      const key = `anc_visits_${visit.patient_id}`;
      const existing = localStorage.getItem(key);
      const visits = existing ? JSON.parse(existing) : [];
      
      // Check if visit already exists
      const exists = visits.find((v: AncVisit) => v.visit_id === visit.visit_id);
      if (!exists) {
        visits.push({ ...visit, synced_to_cloud: false });
        localStorage.setItem(key, JSON.stringify(visits));
      }
      
      console.log('💾 ANC visit saved offline');
      
      // Try to sync if online
      if (this.isOnline) {
        await this.syncAncVisit(visit);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save ANC visit offline:', error);
      return false;
    }
  }

  // Get ANC visits for a patient offline
  getAncVisitsOffline(patientId: string): AncVisit[] {
    try {
      const key = `anc_visits_${patientId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Sync single ANC visit to cloud
  async syncAncVisit(visit: AncVisit): Promise<boolean> {
    if (!this.isOnline) return false;
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) return false;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/anc_visits`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(visit)
      });
      
      if (response.ok) {
        // Mark as synced
        const key = `anc_visits_${visit.patient_id}`;
        const visits = this.getAncVisitsOffline(visit.patient_id);
        const updated = visits.map(v => 
          v.visit_id === visit.visit_id ? { ...v, synced_to_cloud: true } : v
        );
        localStorage.setItem(key, JSON.stringify(updated));
        console.log('✅ ANC visit synced to cloud');
        return true;
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
    return false;
  }

  // Sync all pending data
  async syncAll(): Promise<void> {
    if (!this.isOnline) return;
    
    console.log('🔄 Starting sync...');
    
    // Sync all ANC visits
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('anc_visits_')) {
        const visits = this.getAncVisitsOffline(key.replace('anc_visits_', ''));
        const unsynced = visits.filter(v => !v.synced_to_cloud);
        
        for (const visit of unsynced) {
          await this.syncAncVisit(visit);
        }
      }
    }
    
    console.log('✅ Sync complete');
  }

  // Check if online
  isOnlineNow(): boolean {
    return this.isOnline;
  }
}

export const offlineService = new OfflineService();