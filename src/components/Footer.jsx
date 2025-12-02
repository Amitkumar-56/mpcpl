'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BiMessageRounded } from 'react-icons/bi';
import ChatWidget from './ChatWidget';

export default function Footer() {
  const pathname = usePathname();
  const [showChat, setShowChat] = useState(false);
  
  // Hide footer on login page
  if (pathname === '/login') return null;

  // Hide chat icon on CST dashboard (it has its own chat)
  const hideChatIcon = pathname?.startsWith('/cst/') || pathname === '/dashboard';

  return (
    <>
      {/* Chat Button - Above Footer */}
      {!hideChatIcon && (
        <div className="relative w-full bg-transparent">
          <div className="flex justify-end pr-6 pb-4">
            <button 
              onClick={() => setShowChat(!showChat)}
              className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-40 flex items-center justify-center"
              title="Open Chat"
            >
              <BiMessageRounded className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
      
      {/* Chat Widget */}
      {!hideChatIcon && (
        <ChatWidget showChat={showChat} setShowChat={setShowChat} />
      )}
      
      <footer className="bg-white text-gray-900 py-4 mt-auto shadow-t">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 MPCL. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
