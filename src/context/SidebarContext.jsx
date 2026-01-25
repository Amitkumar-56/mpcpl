// src/context/SidebarContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const SidebarContext = createContext(undefined);

export function SidebarProvider({ children }) {
  // ✅ Initialize with deterministic value (false) to match server
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ✅ Hydrate state on method only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-open');
      if (saved) {
        setIsSidebarOpen(JSON.parse(saved));
      } else {
        setIsSidebarOpen(window.innerWidth >= 768);
      }
    }
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        // Mobile पर sidebar closed रखें
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-open', JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        isMobile,
        toggleSidebar,
        openSidebar,
        closeSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};