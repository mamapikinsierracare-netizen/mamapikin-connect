// src/lib/smsService.ts

interface DangerSignAlert {
  patientName: string;
  patientId: string;
  dangerSign: string;
  recordedAt: Date;
  facilityName: string;
  chwName: string;
}

class SMSService {
  private isOnline: boolean = true;

  constructor() {
    // Check online status
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => { this.isOnline = true; });
      window.addEventListener('offline', () => { this.isOnline = false; });
    }
  }

  async sendDangerSignAlert(alert: DangerSignAlert): Promise<boolean> {
    if (!this.isOnline) {
      // Store in queue for later
      this.queueAlert(alert);
      console.log('📡 Offline: SMS queued for later');
      return false;
    }

    try {
      const response = await fetch('/api/sms/danger-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });

      if (response.ok) {
        console.log('✅ SMS sent successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ SMS failed:', error);
      this.queueAlert(alert);
    }
    return false;
  }

  private queueAlert(alert: DangerSignAlert) {
    const queue = localStorage.getItem('sms_queue');
    const alerts = queue ? JSON.parse(queue) : [];
    alerts.push({ ...alert, queuedAt: new Date().toISOString() });
    localStorage.setItem('sms_queue', JSON.stringify(alerts));
  }

  async processQueue(): Promise<void> {
    if (!this.isOnline) return;

    const queue = localStorage.getItem('sms_queue');
    if (!queue) return;

    const alerts = JSON.parse(queue);
    for (const alert of alerts) {
      await this.sendDangerSignAlert(alert);
    }
    localStorage.removeItem('sms_queue');
  }
}

export const smsService = new SMSService();