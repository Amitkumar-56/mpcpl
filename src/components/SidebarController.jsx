'use client';

import { useSidebar } from '@/context/SidebarContext';
import { useEffect, useState } from 'react';

/**
 * SidebarController - Automatically controls sidebar visibility via CSS
 * Adds close button and handles menu item clicks
 */
export default function SidebarController() {
  const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);

  // ✅ Only run after client-side hydration is complete
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // ✅ Don't run until after hydration
    if (!mounted) return;

    const updateSidebar = () => {
      // Find the sidebar aside element
      const sidebar = document.querySelector('aside.fixed.z-40, aside.md\\:relative.z-40');
      if (!sidebar) return;

      // Mark as processed and add main-sidebar class
      if (!sidebar.classList.contains('main-sidebar-processed')) {
        sidebar.classList.add('main-sidebar', 'main-sidebar-processed');
        
        // ✅ Modify existing blue toggle button to use sidebar context toggle
        // ✅ Find button by its style or class to ensure we get the right one
        const existingToggleBtn = document.querySelector('button[title*="Expand"], button[title*="Collapse"]');
        if (existingToggleBtn && !existingToggleBtn.hasAttribute('data-toggle-modified')) {
          existingToggleBtn.setAttribute('data-toggle-modified', 'true');
          
          // ✅ Ensure button has fixed positioning on mobile to prevent position issues on refresh
          if (window.innerWidth < 768) {
            existingToggleBtn.style.position = 'fixed';
            existingToggleBtn.style.zIndex = '50';
            existingToggleBtn.style.top = '16px';
            // Don't set left here, let sidebar component handle it
          }
          
          // Store original onclick
          const originalOnClick = existingToggleBtn.onclick;
          
          // Replace with context toggle on mobile
          existingToggleBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (window.innerWidth < 768) {
              // On mobile, toggle sidebar open/close
              toggleSidebar();
            } else {
              // On desktop, use original collapse functionality if exists
              if (originalOnClick) {
                originalOnClick(e);
              }
            }
          };
        }
        
        // Add close button to sidebar header (mobile only)
        const sidebarHeader = sidebar.querySelector('.p-4.border-b, .p-4[class*="border"]');
        if (sidebarHeader && !sidebarHeader.querySelector('.sidebar-close-btn-mobile')) {
          const closeBtn = document.createElement('button');
          closeBtn.className = 'sidebar-close-btn-mobile md:hidden absolute top-3 right-3 p-2 text-gray-600 hover:text-red-600 hover:bg-gray-200 rounded-lg transition-colors z-50';
          closeBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
          closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
          };
          closeBtn.setAttribute('aria-label', 'Close Sidebar');
          
          // Make header relative for absolute positioning
          if (sidebarHeader) {
            const headerStyle = window.getComputedStyle(sidebarHeader);
            if (headerStyle.position === 'static') {
              sidebarHeader.style.position = 'relative';
            }
            sidebarHeader.appendChild(closeBtn);
          }
        }
        
        // Add click handlers to menu items to close sidebar on mobile
        const menuItems = sidebar.querySelectorAll('nav button, nav a');
        menuItems.forEach((item) => {
          if (!item.hasAttribute('data-sidebar-close-handler')) {
            item.setAttribute('data-sidebar-close-handler', 'true');
            const originalClick = item.onclick;
            item.onclick = (e) => {
              if (originalClick) originalClick(e);
              // Close sidebar on mobile when menu item is clicked
              if (window.innerWidth < 768) {
                setTimeout(() => closeSidebar(), 100);
              }
            };
          }
        });
      }

      // ✅ Handle mobile overlay - only on mobile
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
        let overlay = document.querySelector('.sidebar-overlay-mobile');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'sidebar-overlay sidebar-overlay-mobile';
          overlay.style.cssText = 'position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 35; transition: opacity 0.3s ease-in-out; pointer-events: none; opacity: 0;';
          overlay.onclick = closeSidebar;
          document.body.appendChild(overlay);
        }

        // ✅ Ensure toggle button position is correct on mobile
        const toggleBtn = document.querySelector('button[title*="Expand"], button[title*="Collapse"]');
        if (toggleBtn) {
          toggleBtn.style.position = 'fixed';
          toggleBtn.style.zIndex = '50';
          toggleBtn.style.top = '16px';
          // Position based on sidebar state
          if (isSidebarOpen) {
            toggleBtn.style.left = '260px';
          } else {
            toggleBtn.style.left = '4px';
          }
        }
        if (isSidebarOpen) {
          sidebar.classList.remove('sidebar-hidden');
          sidebar.classList.add('sidebar-visible');
          sidebar.style.transform = 'translateX(0)';
          sidebar.style.zIndex = '40';
          if (overlay) {
            overlay.style.pointerEvents = 'auto';
            overlay.style.opacity = '1';
          }
          // Show close button
          const closeBtn = sidebar.querySelector('.sidebar-close-btn-mobile');
          if (closeBtn) {
            closeBtn.style.display = 'block';
          }
          // ✅ Update toggle button position when sidebar opens
          const toggleBtn = document.querySelector('button[title*="Expand"], button[title*="Collapse"]');
          if (toggleBtn) {
            toggleBtn.style.left = '260px';
          }
        } else {
          sidebar.classList.remove('sidebar-visible');
          sidebar.classList.add('sidebar-hidden');
          sidebar.style.transform = 'translateX(-100%)';
          if (overlay) {
            overlay.style.pointerEvents = 'none';
            overlay.style.opacity = '0';
          }
          // Hide close button
          const closeBtn = sidebar.querySelector('.sidebar-close-btn-mobile');
          if (closeBtn) {
            closeBtn.style.display = 'none';
          }
          // ✅ Update toggle button position when sidebar closes
          const toggleBtn = document.querySelector('button[title*="Expand"], button[title*="Collapse"]');
          if (toggleBtn) {
            toggleBtn.style.left = '4px';
          }
        }
      } else {
        // Desktop: always show sidebar, hide overlay completely
        sidebar.classList.remove('sidebar-hidden', 'sidebar-visible');
        sidebar.style.transform = '';
        if (overlay) {
          overlay.style.display = 'none';
          overlay.style.pointerEvents = 'none';
          overlay.style.opacity = '0';
        }
        // Hide close button on desktop
        const closeBtn = sidebar.querySelector('.sidebar-close-btn-mobile');
        if (closeBtn) {
          closeBtn.style.display = 'none';
        }
      }
    };

    updateSidebar();
    
    // Use MutationObserver to detect sidebar and menu items when they're added
    const observer = new MutationObserver(() => {
      updateSidebar();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Handle resize
    const handleResize = () => {
      updateSidebar();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      // Clean up overlay on unmount
      const overlay = document.querySelector('.sidebar-overlay-mobile');
      if (overlay) {
        overlay.remove();
      }
      // Clean up close button handlers
      const menuItems = document.querySelectorAll('[data-sidebar-close-handler]');
      menuItems.forEach((item) => {
        item.removeAttribute('data-sidebar-close-handler');
      });
    };
  }, [isSidebarOpen, toggleSidebar, closeSidebar, mounted]);

  // ✅ Don't render anything until after hydration to prevent mismatch
  if (!mounted) return null;

  return null; // This component doesn't render anything
}
