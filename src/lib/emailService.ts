// src/lib/emailService.ts
// Offline-first email sender (queues emails when offline)

import { commDB, EmailOutbox } from './communicationDB';
import { supabase } from './supabase';

// You'll need to set these environment variables:
// SENDGRID_API_KEY or SMTP settings
// DEFAULT_FROM_EMAIL

async function sendViaSendGrid(to: string, subject: string, html: string): Promise<boolean> {
  // Implementation using SendGrid SDK or fetch
  // For brevity, example using fetch:
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.DEFAULT_FROM_EMAIL! },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  return response.ok;
}

// Add email to outbox (always stored locally first)
export async function queueEmail(to: string, subject: string, html: string, facilityId?: string) {
  const email: EmailOutbox = {
    to,
    subject,
    html,
    status: 'pending',
    attempts: 0,
    createdAt: new Date(),
    facilityId,
  };
  const id = await commDB.emails.add(email);
  // If online, try to send immediately
  if (navigator.onLine) {
    processEmailQueue();
  }
  return id;
}

// Process pending emails (called periodically or after coming online)
export async function processEmailQueue() {
  if (!navigator.onLine) return;
  const pending = await commDB.emails.where('status').equals('pending').toArray();
  for (const email of pending) {
    try {
      const success = await sendViaSendGrid(email.to, email.subject, email.html);
      if (success) {
        await commDB.emails.update(email.id!, { status: 'sent', lastAttemptAt: new Date() });
      } else {
        throw new Error('SendGrid returned non-OK');
      }
    } catch (error: any) {
      const attempts = (email.attempts || 0) + 1;
      const update: any = { attempts, lastAttemptAt: new Date(), errorMessage: error.message };
      if (attempts >= 3) {
        update.status = 'failed';
      }
      await commDB.emails.update(email.id!, update);
    }
  }
}

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => processEmailQueue());
}