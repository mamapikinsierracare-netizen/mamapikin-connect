// src/app/pin-login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { verifyPin, hasStoredPin } from '@/lib/pinAuth';

export default function PinLoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // When page loads, we need to know which user we are. 
  // Since offline, we cannot fetch from Supabase. 
  // We can store the last logged-in user ID in localStorage or Dexie.
  useEffect(() => {
    const loadLastUser = async () => {
      // Option 1: read from localStorage (set during online login)
      const lastUserId = localStorage.getItem('lastUserId');
      if (lastUserId && await hasStoredPin(lastUserId)) {
        setUserId(lastUserId);
      } else {
        // No user found – fallback to online login
        router.push('/login');
      }
    };
    loadLastUser();
  }, []);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!userId) return;
    if (pin.length !== 4) {
      setError('Enter 4 digits');
      return;
    }
    
    const result = await verifyPin(userId, pin);
    if (result.success) {
      // Set Supabase session offline? Actually we need to create a "fake" session.
      // For offline access, we can store a flag in localStorage that user is authenticated.
      localStorage.setItem('offlineAuth', 'true');
      localStorage.setItem('offlineUserId', userId);
      router.push('/'); // Go to main app
    } else if (result.locked) {
      setLocked(true);
      setError('Too many failed attempts. Account locked for 15 minutes.');
    } else {
      setRemainingAttempts(result.remainingAttempts || 0);
      setError(`Incorrect PIN. ${result.remainingAttempts} attempts remaining.`);
      setPin('');
    }
  };

  if (locked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-600">Account Locked</h1>
          <p>Too many failed attempts. Please wait 15 minutes or log in online to reset.</p>
          <button onClick={() => router.push('/login')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
            Go to Online Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-80 text-center">
        <h1 className="text-2xl font-bold mb-2">Offline Login</h1>
        <p className="text-gray-600 mb-4">Enter your 4-digit PIN</p>
        
        <div className="mb-6">
          <div className="flex justify-center gap-4 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center text-2xl font-mono">
                {pin[i] || '•'}
              </div>
            ))}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {remainingAttempts !== null && remainingAttempts > 0 && (
            <p className="text-orange-500 text-sm">Attempts left: {remainingAttempts}</p>
          )}
        </div>
        
        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => handleDigit(d.toString())} className="bg-gray-200 p-4 rounded-lg text-xl font-bold">
              {d}
            </button>
          ))}
          <div></div>
          <button onClick={() => handleDigit('0')} className="bg-gray-200 p-4 rounded-lg text-xl font-bold">0</button>
          <button onClick={handleDelete} className="bg-gray-300 p-4 rounded-lg text-xl">⌫</button>
        </div>
        
        <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">
          Login
        </button>
        
        <button onClick={() => router.push('/login')} className="mt-4 text-blue-600 underline">
          Login online with email instead
        </button>
      </div>
    </div>
  );
}