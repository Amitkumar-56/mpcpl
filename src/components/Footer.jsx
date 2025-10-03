'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // Hide footer on login page
  if (pathname === '/login') return null;

  return (
    <footer className="bg-white text-gray-900 py-4 mt-auto shadow-t">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; 2024 MPCL. All rights reserved.</p>
      </div>
    </footer>
  );
}
