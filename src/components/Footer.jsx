'use client';

import { usePathname } from 'next/navigation';

import { useState, useEffect } from 'react';

export default function Footer() {

  const pathname = usePathname();

  const compact = false;

  // Hide footer on login page

  if (pathname === '/login') return null;

  return (

    <>

      <footer className={`bg-white text-gray-900 ${compact ? 'py-2' : 'py-4'} mt-auto`}>
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2026 MPCPL. All rights reserved.</p>
        </div>

      </footer>

    </>

  );

}

