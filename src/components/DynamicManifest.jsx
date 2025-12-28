'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function DynamicManifest() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Determine manifest based on pathname
    let manifestFile = '/manifest.json'; // default
    let themeColor = '#7c3aed'; // default purple

    if (pathname?.startsWith('/cst/')) {
      manifestFile = '/manifest-cst.json';
      themeColor = '#2563eb'; // blue
    } else if (pathname?.startsWith('/agent/')) {
      manifestFile = '/manifest-agent.json';
      themeColor = '#10b981'; // green
    } else if (pathname?.startsWith('/supplier/')) {
      manifestFile = '/manifest-supplier.json';
      themeColor = '#f59e0b'; // orange
    } else if (pathname === '/dashboard' || pathname?.startsWith('/dashboard') || pathname === '/login') {
      manifestFile = '/manifest-employee.json';
      themeColor = '#7c3aed'; // purple
    }

    // Update manifest link
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      document.head.appendChild(manifestLink);
    }
    manifestLink.setAttribute('href', manifestFile);

    // Update theme color
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', themeColor);

    // Update apple mobile web app title
    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    let title = 'MPCL System';
    if (pathname?.startsWith('/cst/')) {
      title = 'MPCL CST';
    } else if (pathname?.startsWith('/agent/')) {
      title = 'MPCL Agent';
    } else if (pathname?.startsWith('/supplier/')) {
      title = 'MPCL Supplier';
    } else if (pathname === '/dashboard' || pathname?.startsWith('/dashboard')) {
      title = 'MPCL Employee';
    }

    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
      document.head.appendChild(appleTitle);
    }
    appleTitle.setAttribute('content', title);

  }, [pathname]);

  return null; // This component doesn't render anything
}

