// src/lib/communicationDB.ts
// Offline-first database for emails, inter-facility messages, bulletins, and referrals

import Dexie, { Table } from 'dexie';

// ============================================
// Email Outbox (offline queue)
// ============================================
export interface EmailOutbox {
  id?: number;             // auto-incremented
  to: string;
  subject: string;
  html: string;
  text?: string;
  facilityId?: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  createdAt: Date;
  errorMessage?: string;
}

// ============================================
// Facility-to-Facility Messages
// ============================================
export interface FacilityMessage {
  id?: number;             // auto-incremented
  fromFacilityId: string;
  toFacilityId: string;
  subject: string;
  content: string;
  isUrgent: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  isOperational: boolean;
  patientId?: string;
  threadId?: string;
  attachments?: string[];
  attempts?: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
}

// ============================================
// Facility Directory (cached offline)
// ============================================
export interface Facility {
  id: string;              // facility code (e.g., 'KBH')
  name: string;
  type: 'hospital' | 'chc' | 'phu' | 'clinic' | 'dhmt';
  district: string;
  chiefdom?: string;
  village?: string;
  email: string;
  email2?: string;
  phone: string;
  phone2?: string;
  lat?: number;
  lng?: number;
  capabilities: string[];
  isActive: boolean;
  lastUpdated: Date;
}

// ============================================
// System Bulletins
// ============================================
export interface SystemBulletin {
  id?: number;             // auto-incremented
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
  targetFacilities: string[] | 'all';
  expiresAt: Date;
  isRead: boolean;
  createdAt: Date;
}

// ============================================
// Communication Sync Queue
// ============================================
export interface CommunicationSyncQueue {
  id?: number;             // auto-incremented
  type: 'email' | 'message' | 'bulletin_read';
  payload: any;            // JSON of the item to sync
  priority: number;        // 1 = highest
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
}

// ============================================
// Referral System (Offline-First)
// ============================================
export interface Referral {
  id?: number;                    // auto-incremented
  referralCode: string;           // unique code like "KBH-20260423-001"
  patientId: string;
  patientName: string;
  patientPhone?: string;
  referringFacilityId: string;
  receivingFacilityId: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  reason: string;
  clinicalNotes?: string;
  vitalSigns?: {                  // snapshot at referral
    bp?: string;
    pulse?: number;
    temperature?: number;
    oxygen?: number;
  };
  medicationsGiven?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_transit' | 'arrived' | 'completed' | 'closed';
  createdAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectedReason?: string;
  arrivedAt?: Date;
  completedAt?: Date;
  closedAt?: Date;
  // Feedback from receiving facility
  feedback?: {
    diagnosis: string;
    treatment: string;
    outcome: 'alive' | 'died' | 'referred_elsewhere';
    notes?: string;
  };
  // Offline sync fields
  syncStatus: 'pending' | 'synced' | 'failed';
  attempts?: number;
  errorMessage?: string;
}

export interface ReferralInboxItem {
  id?: number;
  referralId: number;             // link to Referral
  facilityId: string;             // receiving facility ID (for indexing)
  status: 'new' | 'viewed' | 'responded';
  viewedAt?: Date;
  respondedAt?: Date;
}

// ============================================
// Dexie Database Class
// ============================================
class CommunicationDB extends Dexie {
  emails!: Table<EmailOutbox, number>;
  messages!: Table<FacilityMessage, number>;
  facilities!: Table<Facility, string>;   // primary key is facility id (string)
  bulletins!: Table<SystemBulletin, number>;
  syncQueue!: Table<CommunicationSyncQueue, number>;
  referrals!: Table<Referral, number>;
  referralInbox!: Table<ReferralInboxItem, number>;

  constructor() {
    super('MamaPikinCommunication');
    this.version(1).stores({
      emails: '++id, status, createdAt, facilityId',
      messages: '++id, fromFacilityId, toFacilityId, status, createdAt, isOperational, threadId',
      facilities: 'id, district, type, isActive',
      bulletins: '++id, severity, expiresAt, isRead',
      syncQueue: '++id, type, status, priority, nextRetryAt',
      referrals: '++id, referralCode, patientId, referringFacilityId, receivingFacilityId, status, createdAt, syncStatus',
      referralInbox: '++id, referralId, facilityId, status',
    });
  }
}

// Singleton instance
export const commDB = new CommunicationDB();