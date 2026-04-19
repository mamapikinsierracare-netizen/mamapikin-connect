// src/app/sms-queue/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

export default function SMSQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    loadQueue();
  }, []);

  function loadQueue() {
    const stored = localStorage.getItem('sms_queue');
    setQueue(stored ? JSON.parse(stored) : []);
  }

  function clearQueue() {
    localStorage.removeItem('sms_queue');
    loadQueue();
  }

  async function processQueue() {
    const stored = localStorage.getItem('sms_queue');
    if (!stored) return;
    
    const alerts = JSON.parse(stored);
    for (const alert of alerts) {
      try {
        const response = await fetch('/api/sms/danger-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
        if (response.ok) {
          console.log('Processed:', alert);
        }
      } catch (error) {
        console.error('Failed:', error);
      }
    }
    localStorage.removeItem('sms_queue');
    loadQueue();
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-4">📱 SMS Queue</h1>
            
            {queue.length === 0 ? (
              <p className="text-gray-500">No queued messages</p>
            ) : (
              <>
                <p className="text-red-600 mb-4">⚠️ {queue.length} messages pending</p>
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {queue.map((alert, i) => (
                    <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p><strong>Patient:</strong> {alert.patientName}</p>
                      <p><strong>Danger Sign:</strong> <span className="text-red-600 font-bold">{alert.dangerSign}</span></p>
                      <p><strong>Time:</strong> {new Date(alert.recordedAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={processQueue}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    📤 Process Queue
                  </button>
                  <button
                    onClick={clearQueue}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    🗑️ Clear Queue
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}