// src/lib/smsService.ts

export interface DangerSignAlert {
  patientName: string;
  patientId: string;
  patientPhone?: string;
  dangerSigns: string[];
  gestationalAge?: number;
  facilityName: string;
  chwName: string;
  recordedAt: Date;
}

export interface ReferralAlert {
  patientName: string;
  patientId: string;
  fromFacility: string;
  toFacility: string;
  referralCode: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergency';
}

class SMSService {
  private queue: any[] = [];
  private isOnline: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processQueue();
      });
      window.addEventListener('offline', () => { this.isOnline = false; });
      this.loadQueue();
    }
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem('sms_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (e) { console.error('Failed to load SMS queue:', e); }
  }

  private saveQueue() {
    try {
      localStorage.setItem('sms_queue', JSON.stringify(this.queue));
    } catch (e) { console.error('Failed to save SMS queue:', e); }
  }

  private addToQueue(alert: any) {
    this.queue.push({ ...alert, queuedAt: new Date().toISOString() });
    this.saveQueue();
    console.log('📱 SMS added to queue:', alert);
  }

  async sendDangerSignAlert(alert: DangerSignAlert): Promise<boolean> {
    const message = `🚨 DANGER SIGN ALERT 🚨\n\nPatient: ${alert.patientName} (${alert.patientId})\nDanger Signs: ${alert.dangerSigns.join(', ')}\nGestational Age: ${alert.gestationalAge || 'Unknown'} weeks\nFacility: ${alert.facilityName}\nCHW: ${alert.chwName}\nTime: ${alert.recordedAt.toLocaleString()}\n\nURGENT: Please review this patient immediately.`;

    if (!this.isOnline) {
      this.addToQueue({ type: 'danger', alert, message });
      return false;
    }

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'danger', alert })
      });
      return response.ok;
    } catch (error) {
      this.addToQueue({ type: 'danger', alert, message });
      return false;
    }
  }

  async sendReferralAlert(alert: ReferralAlert): Promise<boolean> {
    const urgencyEmoji = alert.urgency === 'emergency' ? '🚨' : alert.urgency === 'urgent' ? '⚠️' : '📋';
    const message = `${urgencyEmoji} REFERRAL NOTIFICATION ${urgencyEmoji}\n\nPatient: ${alert.patientName} (${alert.patientId})\nFrom: ${alert.fromFacility}\nTo: ${alert.toFacility}\nCode: ${alert.referralCode}\nReason: ${alert.reason}\nUrgency: ${alert.urgency.toUpperCase()}\n\nPlease confirm receipt.`;

    if (!this.isOnline) {
      this.addToQueue({ type: 'referral', alert, message });
      return false;
    }

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'referral', alert })
      });
      return response.ok;
    } catch (error) {
      this.addToQueue({ type: 'referral', alert, message });
      return false;
    }
  }

  async processQueue(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;
    
    console.log(`📤 Processing ${this.queue.length} queued SMS...`);
    const failed: any[] = [];
    
    for (const item of this.queue) {
      try {
        const response = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: item.message, type: item.type, alert: item.alert })
        });
        if (!response.ok) failed.push(item);
      } catch (e) {
        failed.push(item);
      }
    }
    
    this.queue = failed;
    this.saveQueue();
    console.log(`✅ SMS queue processed. ${failed.length} remaining.`);
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const smsService = new SMSService();