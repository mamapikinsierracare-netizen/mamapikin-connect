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
  
  // NEW: We add a memory to remember if they need to set up their account
  const [setupNeeded, setSetupNeeded] = useState(false); 
  
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadLastUser = async () => {
      try {
        const lastUserId = localStorage.getItem('lastUserId');
        
        if (lastUserId && await hasStoredPin(lastUserId)) {
          setUserId(lastUserId);
        } else {
          // THE FIX: Instead of router.push('/login') which causes a crash offline,
          // we just tell the screen to show the "Setup Required" message.
          setSetupNeeded(true); 
        }
      } catch (err) {
        console.error("Database error while checking PIN:", err);
        setSetupNeeded(true); // If the database fails, also ask them to setup
      }
    };
    
    loadLastUser();
  }, [router]);

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

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
    if (pin.length !== 4) return;
    
    try {
      const result = await verifyPin(userId, pin);
      
      if (result.success) {
        localStorage.setItem('offlineAuth', 'true');
        localStorage.setItem('offlineUserId', userId);
        router.push('/'); 
      } else if (result.locked) {
        setLocked(true);
        setError('Too many failed attempts. Account locked for 15 minutes.');
      } else {
        setRemainingAttempts(result.remainingAttempts || 0);
        setError(`Incorrect PIN. ${result.remainingAttempts} attempts remaining.`);
        setPin(''); 
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setPin('');
    }
  };

  // THE NEW SCREEN: If they don't have a Sticky Note, show this friendly screen!
  if (setupNeeded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg text-center shadow-md">
          <h1 className="text-xl font-bold text-orange-600 mb-2">Setup Required</h1>
          <p className="text-gray-700 mb-4">No offline PIN was found on this device.</p>
          <p className="text-gray-700 mb-4">Please connect to the internet and log in normally first.</p>
          {/* We give them a button to click WHEN they have internet */}
          <button onClick={() => router.push('/login')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
            Go to Online Login
          </button>
        </div>
      </div>
    );
  }

  // The Locked Screen
  if (locked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg text-center shadow-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">Account Locked</h1>
          <p className="text-gray-700">Too many failed attempts.</p>
          <p className="text-gray-700 mb-4">Please wait 15 minutes or log in online to reset.</p>
          <button onClick={() => router.push('/login')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
            Go to Online Login
          </button>
        </div>
      </div>
    );
  }

  // The Normal PIN Screen
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-80 text-center">
        <h1 className="text-2xl font-bold mb-2">Offline Login</h1>
        <p className="text-gray-600 mb-4">Enter your 4-digit PIN</p>
        
        <div className="mb-6">
          <div className="flex justify-center gap-4 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center text-2xl font-mono bg-gray-50">
                {pin[i] ? '•' : ''} 
              </div>
            ))}
          </div>
          {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
          {remainingAttempts !== null && remainingAttempts > 0 && !error.includes('Too many') && (
            <p className="text-orange-500 text-sm mt-1">Attempts left: {remainingAttempts}</p>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => handleDigit(d.toString())} className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 p-4 rounded-lg text-xl font-bold transition-colors">
              {d}
            </button>
          ))}
          <div></div>
          <button onClick={() => handleDigit('0')} className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 p-4 rounded-lg text-xl font-bold transition-colors">0</button>
          <button onClick={handleDelete} className="bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-600 p-4 rounded-lg text-xl transition-colors">⌫</button>
        </div>
        
        <button onClick={() => router.push('/login')} className="mt-4 text-blue-600 underline text-sm">
          Login online with email instead
        </button>
      </div>
    </div>
  );
}