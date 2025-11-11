
// src/app/layout.js
import { SessionProvider } from '@/context/SessionContext';
import './globals.css';

export const metadata = {
  title: 'MPCL Dashboard',
  description: 'Filling Requests Management System',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SessionProvider>
          <main className="flex-grow">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}