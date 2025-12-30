'use client';

import { useSidebar } from '@/context/SidebarContext';
import Sidebar from './sidebar';
import { useEffect, useRef } from 'react';

export default function SidebarWrapper() {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const sidebarRef = useRef(null);

  // Apply classes to sidebar based on context state
  useEffect(() => {
    const checkAndUpdateSidebar = () => {
      // Find the sidebar aside element - look for the fixed sidebar
      const sidebar = document.querySelector('aside.fixed.z-40, aside.md\\:relative.z-40');
      if (sidebar && !sidebar.classList.contains('main-sidebar-processed')) {
        sidebar.classList.add('main-sidebar', 'main-sidebar-processed');
      }
      
      const processedSidebar = document.querySelector('.main-sidebar');
      if (processedSidebar) {
        // Only apply mobile toggle behavior on mobile screens
        if (window.innerWidth < 768) {
          if (isSidebarOpen) {
            processedSidebar.classList.remove('sidebar-hidden');
            processedSidebar.classList.add('sidebar-visible');
            processedSidebar.style.transform = 'translateX(0)';
            processedSidebar.style.zIndex = '40';
          } else {
            processedSidebar.classList.remove('sidebar-visible');
            processedSidebar.classList.add('sidebar-hidden');
            processedSidebar.style.transform = 'translateX(-100%)';
          }
        } else {
          // On desktop, remove mobile classes and show sidebar
          processedSidebar.classList.remove('sidebar-hidden', 'sidebar-visible');
          processedSidebar.style.transform = '';
        }
      }
    };

    // Check immediately and after a delay to ensure sidebar is rendered
    checkAndUpdateSidebar();
    const timeoutId = setTimeout(checkAndUpdateSidebar, 50);
    const timeoutId2 = setTimeout(checkAndUpdateSidebar, 200);
    
    // Use MutationObserver to detect when sidebar is added to DOM
    const observer = new MutationObserver(checkAndUpdateSidebar);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Listen for window resize
    window.addEventListener('resize', checkAndUpdateSidebar);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      observer.disconnect();
      window.removeEventListener('resize', checkAndUpdateSidebar);
    };
  }, [isSidebarOpen]);

  // Handle overlay click
  const handleOverlayClick = () => {
    closeSidebar();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay md:hidden"
          onClick={handleOverlayClick}
        />
      )}
      <div ref={sidebarRef}>
        <Sidebar />
      </div>
    </>
  );
}
