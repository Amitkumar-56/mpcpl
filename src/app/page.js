'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Get user from localStorage
    const userString = localStorage.getItem('user');
    let user = null;
    try {
      user = userString ? JSON.parse(userString) : null;
    } catch (err) {
      console.error('Failed to parse user from localStorage', err);
    }

    console.log('User:', user); // Debug: check user data

    // Animate dots
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 200);

    // Redirect after delay
    const redirectTimer = setTimeout(() => {
      if (user && Number(user.role) === 5) {
        router.push('/dashboard'); // Admin dashboard
      } else {
        router.push('/login'); // Others go to login
      }
    }, 1000); // 1 second delay for animation

    return () => {
      clearInterval(dotInterval);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-tr from-indigo-400 via-purple-400 to-pink-400 animate-gradient">
      {/* Header */}
      <header className="w-full py-4 bg-white/80 backdrop-blur-md shadow-md text-center font-bold text-gray-800">
        🚀 MPCL Portal
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-[85%] max-w-sm animate-scaleIn">
          {/* Logo */}
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-lg font-bold text-white tracking-wide">MPCL</span>
          </div>

          {/* Loading Text */}
          <h1 className="text-xl font-bold text-gray-800 mb-1">
            Loading{dots}
          </h1>
          <p className="text-gray-500 text-xs">Redirecting...</p>

          {/* Slim Progress Bar */}
          <div className="mt-4 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500 animate-progress"></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3 bg-white/80 backdrop-blur-md shadow-inner text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} MPCL. All rights reserved.
      </footer>
    </div>
  );
}
