export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      referrals: {
  Row: {
    id: number;
    referral_code: string;
    patient_id: string;
    patient_name: string;
    referring_facility_id: string;
    receiving_facility_id: string;
    reason: string;
    urgency: 'routine' | 'urgent' | 'emergency';
    status: 'pending' | 'accepted' | 'rejected' | 'arrived' | 'closed';
    created_at: string;
    accepted_at: string | null;
    rejected_at: string | null;
    arrived_at: string | null;
    closed_at: string | null;
    feedback: Json | null;
    escalated: boolean;
    escalation_level: number;
    history_token: string | null;
    rejected_reason: string | null;   // ✅ ADDED
  };
  Insert: {
    id?: number;
    referral_code: string;
    patient_id: string;
    patient_name: string;
    referring_facility_id: string;
    receiving_facility_id: string;
    reason: string;
    urgency: 'routine' | 'urgent' | 'emergency';
    status?: 'pending' | 'accepted' | 'rejected' | 'arrived' | 'closed';
    created_at?: string;
    accepted_at?: string | null;
    rejected_at?: string | null;
    arrived_at?: string | null;
    closed_at?: string | null;
    feedback?: Json | null;
    escalated?: boolean;
    escalation_level?: number;
    history_token?: string | null;
    rejected_reason?: string | null;   // ✅ ADDED
  };
  Update: {
    id?: number;
    referral_code?: string;
    patient_id?: string;
    patient_name?: string;
    referring_facility_id?: string;
    receiving_facility_id?: string;
    reason?: string;
    urgency?: 'routine' | 'urgent' | 'emergency';
    status?: 'pending' | 'accepted' | 'rejected' | 'arrived' | 'closed';
    created_at?: string;
    accepted_at?: string | null;
    rejected_at?: string | null;
    arrived_at?: string | null;
    closed_at?: string | null;
    feedback?: Json | null;
    escalated?: boolean;
    escalation_level?: number;
    history_token?: string | null;
    rejected_reason?: string | null;   // ✅ ADDED
  };
},
      facilities: {
        Row: {
          id: string;
          name: string;
          code: string;
          district: string;
          phone: string;
          approved: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          district: string;
          phone: string;
          approved?: boolean;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          district?: string;
          phone?: string;
          approved?: boolean;
          created_by?: string;
          created_at?: string;
        };
      };
      facility_requests: {
        Row: {
          id: string;
          name: string;
          code: string;
          district: string;
          phone: string;
          requested_by: string;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          district: string;
          phone: string;
          requested_by: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          district?: string;
          phone?: string;
          requested_by?: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
      };
      patients: {
        Row: {
          patient_id: string;
          full_name: string;
          phone: string | null;
          district: string | null;
          date_of_birth: string;
          high_risk: boolean;
          created_at: string;
        };
        Insert: {
          patient_id: string;
          full_name: string;
          phone?: string | null;
          district?: string | null;
          date_of_birth: string;
          high_risk?: boolean;
          created_at?: string;
        };
        Update: {
          patient_id?: string;
          full_name?: string;
          phone?: string | null;
          district?: string | null;
          date_of_birth?: string;
          high_risk?: boolean;
          created_at?: string;
        };
      };
    };
  };
}