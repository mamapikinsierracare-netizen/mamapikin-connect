'use client';

import { useEffect, useState } from 'react';

export default function PWAInstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallable(true);
    });

    // Register Service Worker manually
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('✅ Service Worker registered:', reg);
        })
        .catch(err => {
          console.log('❌ Service Worker registration failed:', err);
        });
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User ${outcome}`);
    setDeferredPrompt(null);
    setInstallable(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">📲 Install MamaPikin Connect</h1>
        
        {installable && (
          <button
            onClick={handleInstall}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium mb-4"
          >
            📱 Install App
          </button>
        )}

        <div className="space-y-3 text-sm">
          <p><strong>Manual Installation:</strong></p>
          <p>1. Open Chrome</p>
          <p>2. Tap the three dots (⋮)</p>
          <p>3. Tap "Install App" or "Add to Home Screen"</p>
          <p>4. Follow prompts</p>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-sm">
            ✅ Service Worker Status: 
            {'serviceWorker' in navigator ? 'Supported' : 'Not Supported'}
          </p>
        </div>
      </div>
    </div>
  );
}