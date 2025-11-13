// src/app/layout.js
import { SessionProvider } from '@/context/SessionContext';
import './globals.css';

export const metadata = {
  title: 'MPCL System',
  description: 'MPCL Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}