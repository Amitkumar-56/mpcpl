'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PWAInstallBanner() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [appName, setAppName] = useState('MPCL App');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Determine app name based on pathname
    if (pathname?.startsWith('/cst/')) {
      setAppName('MPCL Customer App');
    } else if (pathname?.startsWith('/agent/')) {
      setAppName('MPCL Agent App');
    } else if (pathname?.startsWith('/supplier/')) {
      setAppName('MPCL Supplier App');
    } else if (pathname === '/dashboard' || pathname?.startsWith('/dashboard') || pathname === '/login') {
      setAppName('MPCL Employee App');
    } else {
      setAppName('MPCL App');
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        setIsInstalled(true);
        return;
      }
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          setIsDismissed(true);
          return;
        }
      }
      const ua = window.navigator.userAgent.toLowerCase();
      const iOS = /iphone|ipad|ipod/.test(ua);
      setIsIOS(iOS);
      if (iOS) {
        setShowBanner(true);
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration);
          })
          .catch((error) => {
            console.log('❌ Service Worker registration failed:', error);
          });
      }
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        if (!iOS) setShowBanner(true);
        console.log('✅ Install prompt available');
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      const handleAppInstalled = () => {
        console.log('✅ PWA installed successfully');
        setDeferredPrompt(null);
        setShowBanner(false);
        setIsInstalled(true);
        localStorage.removeItem('pwa-banner-dismissed');
      };
      window.addEventListener('appinstalled', handleAppInstalled);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('❌ Install prompt not available');
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted install prompt');
        setShowBanner(false);
      } else {
        console.log('❌ User dismissed install prompt');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xl animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-white/20 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Install {appName}</h3>
              {!isIOS ? (
                <p className="text-sm text-white/90">Get the app on your device for faster access and offline support</p>
              ) : (
                <p className="text-sm text-white/90">iPhone पर इंस्टॉल करने के लिए Share से Add to Home Screen चुनें</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Install Now
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

