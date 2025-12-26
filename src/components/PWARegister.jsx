'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker immediately
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            console.log('🔄 Service Worker update found');
          });
        })
        .catch((error) => {
          console.log('❌ Service Worker registration failed:', error);
        });

      // Handle install prompt
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
        console.log('✅ Install prompt available');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Handle app installed
      window.addEventListener('appinstalled', () => {
        console.log('✅ PWA installed successfully');
        setDeferredPrompt(null);
        setIsInstallable(false);
      });

      // Check if already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ App is already installed');
        setIsInstallable(false);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('❌ Install prompt not available');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted install prompt');
    } else {
      console.log('❌ User dismissed install prompt');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Show install button when app is installable (browser will also show native prompt)
  // The native browser install prompt appears in the address bar automatically
  // This custom button is a backup option
  if (!isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleInstallClick}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse"
        id="pwa-install-button"
        title="Install MPCL App on your device"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>Install App</span>
      </button>
    </div>
  );
}

