'use client';

import { useState, useEffect } from 'react';
import { isPWAStandalone, initializePWANotifications, showChatNotificationPWA } from '@/utils/pwa-notifications';

export default function PWATestButton() {
  const [pwaStatus, setPwaStatus] = useState('checking');
  const [notificationStatus, setNotificationStatus] = useState('unknown');

  useEffect(() => {
    // Check PWA status
    const checkPWA = () => {
      if (typeof window === 'undefined') return;
      
      const standalone = isPWAStandalone();
      const installed = window.matchMedia('(display-mode: standalone)').matches;
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (installed) {
        setPwaStatus('installed');
      } else if (ios && window.navigator.standalone) {
        setPwaStatus('ios-standalone');
      } else {
        setPwaStatus('browser');
      }
    };

    checkPWA();
    window.addEventListener('resize', checkPWA);
    
    return () => window.removeEventListener('resize', checkPWA);
  }, []);

  const testNotification = async () => {
    setNotificationStatus('testing');
    
    try {
      const success = showChatNotificationPWA('Test User', 'This is a test notification from PWA!', {
        tag: 'pwa-test',
        renotify: true
      });
      
      setNotificationStatus(success ? 'success' : 'failed');
    } catch (error) {
      console.error('PWA Notification test failed:', error);
      setNotificationStatus('error');
    }
  };

  const initializePWA = async () => {
    setNotificationStatus('initializing');
    
    try {
      const success = await initializePWANotifications();
      setNotificationStatus(success ? 'ready' : 'failed');
    } catch (error) {
      console.error('PWA initialization failed:', error);
      setNotificationStatus('error');
    }
  };

  const getStatusColor = () => {
    switch (pwaStatus) {
      case 'installed': return 'bg-green-500';
      case 'ios-standalone': return 'bg-blue-500';
      case 'browser': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getNotificationColor = () => {
    switch (notificationStatus) {
      case 'success': return 'bg-green-500';
      case 'ready': return 'bg-blue-500';
      case 'testing': return 'bg-yellow-500';
      case 'failed': case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (pwaStatus) {
      case 'installed': return 'PWA Installed';
      case 'ios-standalone': return 'iOS Standalone';
      case 'browser': return 'Browser Mode';
      default: return 'Checking...';
    }
  };

  const getNotificationText = () => {
    switch (notificationStatus) {
      case 'success': return 'Notification Sent';
      case 'ready': return 'Notifications Ready';
      case 'testing': return 'Testing...';
      case 'failed': return 'Failed';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  // Only show in development or if specifically enabled
  if (process.env.NODE_ENV === 'production' && !localStorage.getItem('show-pwa-test')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-lg p-3 border border-gray-200 max-w-xs">
      <div className="text-xs font-semibold mb-2">PWA Status</div>
      
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-xs">{getStatusText()}</span>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${getNotificationColor()}`}></div>
        <span className="text-xs">{getNotificationText()}</span>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={initializePWA}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
        >
          Init PWA
        </button>
        
        <button
          onClick={testNotification}
          className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
        >
          Test Notif
        </button>
      </div>
      
      {isPWAStandalone() && (
        <div className="mt-2 text-xs text-green-600 font-medium">
          PWA Mode Active
        </div>
      )}
    </div>
  );
}
