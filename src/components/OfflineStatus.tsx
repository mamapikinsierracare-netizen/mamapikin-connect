'use client';

import { useState, useEffect } from 'react';

export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      // Show toast notification when offline
      if (!online) {
        showOfflineNotification();
      }
    };

    const showOfflineNotification = () => {
      // Create a persistent banner
      const banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; background: #dc2626; color: white; text-align: center; padding: 12px; z-index: 9999; font-size: 14px;">
          📡 You are offline. Data will sync when connection returns.
          <button onclick="location.reload()" style="margin-left: 12px; background: white; color: #dc2626; border: none; padding: 4px 12px; border-radius: 4px;">Retry</button>
        </div>
      `;
      
      if (!document.getElementById('offline-banner')) {
        document.body.insertBefore(banner, document.body.firstChild);
      }
    };

    const removeOfflineBanner = () => {
      const banner = document.getElementById('offline-banner');
      if (banner) banner.remove();
    };

    const countPendingSync = () => {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('anc_visits_') || key === 'offline_patients')) {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            total += Array.isArray(parsed) ? parsed.length : 1;
          }
        }
      }
      setPendingSync(total);
    };

    window.addEventListener('online', () => {
      removeOfflineBanner();
      updateOnlineStatus();
      countPendingSync();
      // Trigger sync
      window.dispatchEvent(new Event('online-sync'));
    });
    
    window.addEventListener('offline', () => {
      updateOnlineStatus();
      showOfflineNotification();
    });
    
    updateOnlineStatus();
    countPendingSync();

    // Count every 30 seconds
    const interval = setInterval(countPendingSync, 30000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && pendingSync === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg ${
      isOnline ? 'bg-green-500' : 'bg-red-500'
    } text-white`}>
      <div className="flex items-center gap-2">
        <span>{isOnline ? '✅' : '📡'}</span>
        <span className="text-sm font-medium">
          {isOnline ? `${pendingSync} item(s) to sync` : 'Offline Mode - Saving Locally'}
        </span>
        {!isOnline && (
          <button
            onClick={() => window.location.reload()}
            className="ml-2 px-2 py-1 bg-white text-red-500 rounded text-xs font-bold"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}