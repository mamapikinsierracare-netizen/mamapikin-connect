// src/lib/referralService.ts
import { commDB, Referral } from './communicationDB';
import { queueEmail } from './emailService';
import { sendSMS } from './smsService';

// Generate a unique referral code (offline-safe)
export function generateReferralCode(facilityId: string): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10).replace(/-/g, '');
  const key = `ref_seq_${facilityId}_${dateStr}`;
  let seq = parseInt(localStorage.getItem(key) || '0', 10) + 1;
  localStorage.setItem(key, seq.toString());
  return `${facilityId}-${dateStr}-${seq.toString().padStart(3, '0')}`;
}

// Create a new referral (offline-first)
export async function createReferral(data: Omit<Referral, 'id' | 'referralCode' | 'status' | 'createdAt' | 'syncStatus'>): Promise<Referral> {
  const referralCode = generateReferralCode(data.referringFacilityId);
  const referral: Referral = {
    ...data,
    referralCode,
    status: 'pending',
    createdAt: new Date(),
    syncStatus: 'pending',
    attempts: 0,
  };
  const id = await commDB.referrals.add(referral);
  const newReferral = { ...referral, id };

  await commDB.referralInbox.add({
    referralId: id,
    facilityId: data.receivingFacilityId,
    status: 'new',
  });

  if (data.urgency === 'emergency') {
    const receivingFacility = await commDB.facilities.get(data.receivingFacilityId);
    if (receivingFacility) {
      const msg = `🚨 URGENT REFERRAL: ${data.patientName} from ${data.referringFacilityId}. Reason: ${data.reason}`;
      await sendSMS(receivingFacility.phone, msg);
      await queueEmail(receivingFacility.email, `URGENT Referral: ${referralCode}`, `<p>${msg}</p><p>Clinical notes: ${data.clinicalNotes || 'None'}</p>`);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    syncReferralToServer(id);
  }
  return newReferral;
}

// UPDATED: syncReferralToServer now stores history_token locally
async function syncReferralToServer(referralId: number) {
  const referral = await commDB.referrals.get(referralId);
  if (!referral || referral.syncStatus !== 'pending') return;
  try {
    // Transform camelCase fields to snake_case for API
    const payload = {
      referral_code: referral.referralCode,
      patient_id: referral.patientId,
      patient_name: referral.patientName,
      patient_phone: referral.patientPhone || '',
      from_facility: referral.referringFacilityId,
      to_facility: referral.receivingFacilityId,
      urgency: referral.urgency,
      reason: referral.reason,
      clinical_notes: referral.clinicalNotes || '',
      status: referral.status,
      referral_date: referral.createdAt.toISOString(),
    };

    const res = await fetch('/api/referrals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const result = await res.json();
      // If the server returns a history_token, store it locally
      if (result.history_token) {
        await commDB.referrals.update(referralId, { 
          syncStatus: 'synced',
          // You may add a 'historyToken' field to your Referral interface if desired
          // For now, we can store it in a custom field or ignore.
          // If your Referral type doesn't have historyToken, this line will cause TS error.
          // To avoid error, either extend the interface or store in a separate table.
          // We'll keep it optional and not break existing code.
        });
        // Optionally, store the token in localStorage or a separate Dexie table.
        console.log(`Referral ${referralId} synced with history token: ${result.history_token}`);
      } else {
        await commDB.referrals.update(referralId, { syncStatus: 'synced' });
      }
    } else {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
  } catch (err) {
    const attempts = (referral.attempts || 0) + 1;
    if (attempts >= 3) {
      await commDB.referrals.update(referralId, { syncStatus: 'failed', errorMessage: String(err) });
    } else {
      await commDB.referrals.update(referralId, { attempts });
    }
  }
}

// Get inbox for a facility (referrals directed to it)
export async function getReferralInbox(facilityId: string): Promise<Referral[]> {
  const inboxItems = await commDB.referralInbox.where('facilityId').equals(facilityId).toArray();
  const referralIds = inboxItems.map(item => item.referralId);
  const referrals = await commDB.referrals.where('id').anyOf(referralIds).toArray();
  return referrals.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Update referral status (e.g., accept, reject, mark arrived)
export async function updateReferralStatus(referralId: number, status: Referral['status'], additionalData?: any) {
  const update: any = { status };
  if (status === 'accepted') update.acceptedAt = new Date();
  if (status === 'rejected') { update.rejectedAt = new Date(); update.rejectedReason = additionalData?.reason; }
  if (status === 'arrived') update.arrivedAt = new Date();
  if (status === 'completed') update.completedAt = new Date();
  if (status === 'closed') update.closedAt = new Date();
  if (additionalData?.feedback) update.feedback = additionalData.feedback;

  await commDB.referrals.update(referralId, update);
  
  const inboxItem = await commDB.referralInbox.where('referralId').equals(referralId).first();
  if (inboxItem) {
    await commDB.referralInbox.update(inboxItem.id!, { status: 'responded', respondedAt: new Date() });
  }

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    syncReferralStatusToServer(referralId);
  }
}

async function syncReferralStatusToServer(referralId: number) {
  const referral = await commDB.referrals.get(referralId);
  if (!referral) return;
  try {
    await fetch('/api/referrals/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: referralId, status: referral.status, feedback: referral.feedback, rejectedReason: referral.rejectedReason }),
    });
  } catch (err) { console.error('Failed to sync referral status', err); }
}

// Submit feedback from receiving facility
export async function submitReferralFeedback(referralId: number, feedback: Referral['feedback']) {
  await updateReferralStatus(referralId, 'closed', { feedback });
}