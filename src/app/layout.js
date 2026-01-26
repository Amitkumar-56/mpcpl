// src/app/layout.js
import { SessionProvider } from '@/context/SessionContext';
import { SidebarProvider } from '@/context/SidebarContext';
import SidebarController from '@/components/SidebarController';
import PWARegister from '@/components/PWARegister';
import DynamicManifest from '@/components/DynamicManifest';
import './globals.css';

export const metadata = {
  title: 'MPCL System',
  description: 'MPCL Management System',
  manifest: '/manifest-employee.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MPCL System',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/LOGO_NEW.jpg', sizes: '192x192', type: 'image/jpeg' },
      { url: '/LOGO_NEW.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/LOGO_NEW.jpg', sizes: '180x180', type: 'image/jpeg' },
    ],
    shortcut: [
      { url: '/favicon.png', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#7c3aed',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest-employee.json" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MPCL System" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/LOGO_NEW.jpg" />
        <link rel="icon" type="image/jpeg" sizes="192x192" href="/LOGO_NEW.jpg" />
        <link rel="icon" type="image/jpeg" sizes="512x512" href="/LOGO_NEW.jpg" />
        <meta name="msapplication-TileImage" content="/LOGO_NEW.jpg" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <DynamicManifest />
        <PWARegister />
        <SessionProvider>
          <SidebarProvider>
            <SidebarController />
            {children}
          </SidebarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
