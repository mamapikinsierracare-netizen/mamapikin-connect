// src/lib/pinAuth.ts
import { commDB } from './communicationDB';

// Hash a PIN using SHA-256 (built into browser, no extra libraries)
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Store a hashed PIN for a user (called after online login)
export async function storePinForUser(userId: string, pin: string): Promise<boolean> {
  try {
    const hashedPin = await hashPin(pin);
    await commDB.table('user_pins').put({
      userId,
      pin_hash: hashedPin,
      attempts: 0,
      locked_until: null,
      updated_at: new Date()
    });
    return true;
  } catch (err) {
    console.error('Failed to store PIN:', err);
    return false;
  }
}

// Verify a PIN for a user (called during offline login)
export async function verifyPin(userId: string, enteredPin: string): Promise<{ success: boolean; locked: boolean; remainingAttempts?: number }> {
  try {
    const record = await commDB.table('user_pins').get({ userId });
    if (!record) {
      return { success: false, locked: false, remainingAttempts: 0 };
    }
    
    // Check if account is locked
    if (record.locked_until && new Date(record.locked_until) > new Date()) {
      return { success: false, locked: true };
    }
    
    const enteredHash = await hashPin(enteredPin);
    if (enteredHash === record.pin_hash) {
      // Success – reset attempts
      await commDB.table('user_pins').update(userId, {
        attempts: 0,
        locked_until: null,
        updated_at: new Date()
      });
      return { success: true, locked: false };
    } else {
      const newAttempts = (record.attempts || 0) + 1;
      const MAX_ATTEMPTS = 5;
      let lockedUntil = null;
      
      if (newAttempts >= MAX_ATTEMPTS) {
        // Lock for 15 minutes
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      
      await commDB.table('user_pins').update(userId, {
        attempts: newAttempts,
        locked_until: lockedUntil,
        updated_at: new Date()
      });
      
      return {
        success: false,
        locked: lockedUntil !== null,
        remainingAttempts: MAX_ATTEMPTS - newAttempts
      };
    }
  } catch (err) {
    console.error('PIN verification error:', err);
    return { success: false, locked: false, remainingAttempts: 0 };
  }
}

// Check if a user has stored PIN (for showing PIN login screen)
export async function hasStoredPin(userId: string): Promise<boolean> {
  const record = await commDB.table('user_pins').get({ userId });
  return !!record;
}

// Clear PIN for a user (e.g., when user logs out online, or admin resets)
export async function clearPinForUser(userId: string): Promise<void> {
  await commDB.table('user_pins').delete(userId);
}