'use client';

import { useState, useEffect } from 'react';

export default function OfflineTestPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState('Checking...');

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    // Check Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerStatus('✅ Service Worker Registered');
      }).catch(() => {
        setServiceWorkerStatus('❌ Service Worker Failed');
      });
    } else {
      setServiceWorkerStatus('❌ Service Worker Not Supported');
    }

    // Listen for online/offline events
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  // Save test data to localStorage
  function saveTestData() {
    localStorage.setItem('offline_test', JSON.stringify({
      message: 'Hello from offline!',
      timestamp: new Date().toISOString()
    }));
    alert('✅ Test data saved to localStorage!');
  }

  // Load test data from localStorage
  function loadTestData() {
    const data = localStorage.getItem('offline_test');
    if (data) {
      alert(`Data found: ${JSON.parse(data).message}`);
    } else {
      alert('No data found');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">📱 Offline Mode Test</h1>
        
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-gray-100">
            <p><strong>Status:</strong> </p>
            <p className={`text-xl font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? '✅ ONLINE' : '📡 OFFLINE'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-gray-100">
            <p><strong>Service Worker:</strong></p>
            <p className="text-sm">{serviceWorkerStatus}</p>
          </div>

          <div className="p-3 rounded-lg bg-gray-100">
            <p><strong>localStorage Test:</strong></p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveTestData}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Save Data
              </button>
              <button
                onClick={loadTestData}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Load Data
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              💡 Test instructions:<br/>
              1. Save data (online)<br/>
              2. Turn on Airplane Mode<br/>
              3. Refresh page<br/>
              4. Click "Load Data" - should still work!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}