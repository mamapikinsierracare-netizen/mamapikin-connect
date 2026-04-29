// src/lib/messagingService.ts
import { commDB, FacilityMessage } from './communicationDB';
import { queueEmail } from './emailService';
import { sendSMS } from './smsService'; // adjust path to your actual SMS service

// Send a message from facility A to facility B (offline-first)
export async function sendFacilityMessage(
  fromFacilityId: string,
  toFacilityId: string,
  subject: string,
  content: string,
  isUrgent: boolean = false,
  isOperational: boolean = true,
  patientId?: string
): Promise<string> {
  const message: FacilityMessage = {
    fromFacilityId,
    toFacilityId,
    subject,
    content,
    isUrgent,
    isOperational,
    patientId,
    status: 'pending',
    createdAt: new Date(),
    attempts: 0,           // initialize retry counter
  };
  const id = await commDB.messages.add(message);
  // If online, try to send immediately
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processMessageQueue();
  }
  // If urgent, also trigger email + SMS (if configured)
  if (isUrgent) {
    const toFacility = await commDB.facilities.get(toFacilityId);
    if (toFacility) {
      await queueEmail(toFacility.email, `URGENT: ${subject}`, `<p>${content}</p>`, fromFacilityId);
      if (toFacility.phone) {
        await sendSMS(toFacility.phone, `URGENT from ${fromFacilityId}: ${subject} - ${content.substring(0, 100)}`);
      }
    }
  }
  return String(id);   // convert number to string
}

// Process outgoing messages (sync to server)
export async function processMessageQueue() {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  const pending = await commDB.messages.where('status').equals('pending').toArray();
  for (const msg of pending) {
    try {
      // Send to your backend API (which will store in Supabase and notify recipient)
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
      if (response.ok) {
        await commDB.messages.update(msg.id!, { status: 'sent', sentAt: new Date() });
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error: any) {
      const attempts = (msg.attempts || 0) + 1;
      const update: Partial<FacilityMessage> = {
        attempts,
        lastAttemptAt: new Date(),
        errorMessage: error.message,
      };
      if (attempts >= 3) {
        update.status = 'failed';
      } else {
        update.status = 'pending'; // will retry
      }
      await commDB.messages.update(msg.id!, update);
    }
  }
}

// Get inbox for a facility (offline cached)
export async function getInbox(facilityId: string): Promise<FacilityMessage[]> {
  return commDB.messages.where('toFacilityId').equals(facilityId).toArray();
}

// Get sent messages from a facility
export async function getSentMessages(facilityId: string): Promise<FacilityMessage[]> {
  return commDB.messages.where('fromFacilityId').equals(facilityId).toArray();
}

// Mark message as read
export async function markMessageAsRead(messageId: string): Promise<void> {
  await commDB.messages.update(Number(messageId), { status: 'read', readAt: new Date() });
}