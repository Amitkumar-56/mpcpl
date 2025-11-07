// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'MPCL Dashboard',
  description: 'Filling Requests Management System',
  icons: {
    icon: '/favicon.png',       // ✅ PNG icon
    shortcut: '/favicon.png',
    apple: '/favicon.png',      // ✅ iOS ke liye bhi same
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
      
        <main className="flex-grow">{children}</main>
      
      </body>
    </html>
  );
}
