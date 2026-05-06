// src/context/SessionContext.js
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false); // Prevent redirect loops
  const lastPathnameRef = useRef(pathname); // Track pathname changes
  const redirectTimeoutRef = useRef(null); // Track redirect timeout

  // ✅ Check for deactivated user
  const checkUserStatus = useCallback(async () => {
    if (!user || !user.id || loading) return;

    try {
      // Skip check on login page, deactivated page, or public pages
      const publicPages = ['/login', '/deactivated', '/', '/register'];
      const isPublicPage = publicPages.includes(pathname) ||
        pathname.startsWith('/cst/') ||
        pathname.startsWith('/agent/') ||
        pathname.startsWith('/supplier/');

      if (isPublicPage) return;

      const response = await fetch('/api/check-status', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();

        // If user is deactivated, log them out immediately WITHOUT any permission check
        if (data.isDeactivated || !data.success) {
          console.log(`🚫 User ${data.user.name} (ID: ${data.user.id}) is DEACTIVATED - Automatic logout triggered!`);

          // Clear all storage and redirect to deactivated page
          if (typeof window !== 'undefined') {
            // NO POPUP/ALERT - Direct logout
            console.error('USER DEACTIVATED - ID:', data.user.id, 'Status: Deactivated');

            // Clear all storage immediately
            localStorage.clear();
            sessionStorage.clear();

            // Force redirect to deactivated page without any popup
            window.location.href = '/deactivated';
          }
        }
      } else if (response.status === 403) {
        // Handle 403 status (deactivated user)
        const data = await response.json();
        console.log(`🚫 403 Response - User ${data.user?.id} is deactivated`);

        if (typeof window !== 'undefined') {
          // NO POPUP/ALERT - Direct logout
          console.error('USER DEACTIVATED - ID:', data.user?.id, 'Status: Deactivated');
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/deactivated';
        }
      }
    } catch (error) {
      console.error('Status check failed:', error);
      // Optional: Retry after 3 seconds if it's a fetch error
      if (error.message === 'Failed to fetch') {
        setTimeout(checkUserStatus, 3000);
      }
    }
  }, [user, loading, pathname]);

  // ✅ Simplified auth check - only check cache, no background verification
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ Skip auth check if logout is in progress
      if (typeof window !== 'undefined') {
        const isLoggingOut = sessionStorage.getItem('isLoggingOut');
        if (isLoggingOut === 'true') {
          setLoading(false);
          return;
        }
      }

      // ✅ For login pages, check if user is already logged in
      if (pathname === '/login' || pathname === '/cst/login' || pathname === '/agent/login' || pathname === '/supplier/login') {
        // Check cache first for quick loading
        if (pathname === '/cst/login') {
          const savedCustomer = localStorage.getItem("customer") || sessionStorage.getItem("customer");
          if (savedCustomer) {
            try {
              const customerData = JSON.parse(savedCustomer);
              if (Number(customerData.roleid) === 1 || Number(customerData.roleid) === 2) {
                setUser(customerData);
              }
            } catch (e) {
              // Invalid data
            }
          }
        } else if (pathname === '/agent/login') {
          const savedAgent = localStorage.getItem("agent") || sessionStorage.getItem("agent");
          if (savedAgent) {
            try {
              const agentData = JSON.parse(savedAgent);
              setUser(agentData);
            } catch (e) {
              // Invalid data
            }
          }
        } else if (pathname === '/supplier/login') {
          const savedSupplier = localStorage.getItem("supplier") || sessionStorage.getItem("supplier");
          if (savedSupplier) {
            try {
              const supplierData = JSON.parse(savedSupplier);
              setUser(supplierData);
            } catch (e) {
              // Invalid data
            }
          }
        } else {
          // Employee login - check cache
          const sessionUser = sessionStorage.getItem('user');
          const localUser = localStorage.getItem('user');
          const cachedUser = sessionUser || localUser;
          if (cachedUser) {
            try {
              const userData = JSON.parse(cachedUser);
              const token = localStorage.getItem('token');
              if (token) {
                setUser(userData);
              }
            } catch (e) {
              // Invalid data
            }
          }
        }
        setLoading(false);
        return;
      }

      // ✅ Agent routes के लिए अलग handling
      if (pathname.startsWith('/agent/')) {
        const savedAgent = localStorage.getItem("agent") || sessionStorage.getItem("agent");
        if (savedAgent) {
          try {
            const agentData = JSON.parse(savedAgent);
            setUser(agentData);
            localStorage.setItem("agent", savedAgent);
            sessionStorage.setItem("agent", savedAgent);
          } catch (e) {
            console.error('Error parsing agent data:', e);
            localStorage.removeItem("agent");
            sessionStorage.removeItem("agent");
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // ✅ CST routes के लिए अलग handling
      if (pathname.startsWith('/cst/')) {
        const savedCustomer = localStorage.getItem("customer") || sessionStorage.getItem("customer");
        if (savedCustomer) {
          try {
            const customerData = JSON.parse(savedCustomer);
            if (Number(customerData.roleid) === 1 || Number(customerData.roleid) === 2) {
              setUser(customerData);
              localStorage.setItem("customer", savedCustomer);
              sessionStorage.setItem("customer", savedCustomer);
            } else {
              setUser(null);
            }
          } catch (e) {
            console.error('Error parsing customer data:', e);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // ✅ Supplier routes के लिए अलग handling
      if (pathname.startsWith('/supplier/')) {
        const savedSupplier = localStorage.getItem("supplier") || sessionStorage.getItem("supplier");
        if (savedSupplier) {
          try {
            const supplierData = JSON.parse(savedSupplier);
            setUser(supplierData);
            localStorage.setItem("supplier", savedSupplier);
            sessionStorage.setItem("supplier", savedSupplier);
          } catch (e) {
            console.error('Error parsing supplier data:', e);
            localStorage.removeItem("supplier");
            sessionStorage.removeItem("supplier");
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // ✅ Employee routes - fall back to API if cache is empty
      const sessionUser = sessionStorage.getItem('user');
      const localUser = localStorage.getItem('user');
      const cachedUser = sessionUser || localUser;
      
      let isUserFound = false;

      if (cachedUser) {
        try {
          const userData = JSON.parse(cachedUser);
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (token) {
            setUser(userData);
            isUserFound = true;
            if (!sessionUser) sessionStorage.setItem('user', localUser);
            if (!localUser) localStorage.setItem('user', sessionUser);
          } else {
            // Need token check via API if local token is missing
            const statusResponse = await fetch('/api/check-status', { credentials: 'include' });
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.success && statusData.user) {
                setUser(statusData.user);
                isUserFound = true;
                localStorage.setItem('user', JSON.stringify(statusData.user));
              }
            }
          }
        } catch (e) {
          console.error('Error parsing cached user:', e);
        }
      } 
      
      if (!isUserFound) {
        // Cache is empty or invalid - Try to restore from Cookie via API
        try {
          const statusResponse = await fetch('/api/check-status', { credentials: 'include' });
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.success && statusData.user) {
              setUser(statusData.user);
              isUserFound = true;
              localStorage.setItem('user', JSON.stringify(statusData.user));
            }
          }
        } catch (apiError) {
          console.error('Failed to restore session from cookie:', apiError);
        }
      }

      if (!isUserFound) {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  // ✅ Simplified useEffect - only run on mount and when user changes
  useEffect(() => {
    // Only check auth on initial load
    if (!user && loading) {
      checkAuth();
    }
  }, []); // Empty dependency array - only run once on mount

  // Check user status when authenticated (only once, not periodically)
  useEffect(() => {
    if (user && !loading) {
      // Check status only once when user is loaded
      checkUserStatus();
    }
  }, [user, loading, checkUserStatus]);

  // ✅ Simplified redirection logic
  useEffect(() => {
    if (loading) return;

    // ✅ Check for bypassAuth flag
    if (typeof window !== 'undefined') {
      const bypassAuth = sessionStorage.getItem('bypassAuth');
      if (bypassAuth === 'true') {
        return;
      }
    }

    // ✅ Agent routes
    if (pathname.startsWith('/agent/')) {
      if (!user && pathname !== '/agent/login') {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.push('/agent/login');
        }
      }
      if (user && pathname === '/agent/login') {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.push('/agent/dashboard');
        }
      }
      return;
    }

    // ✅ CST routes
    if (pathname.startsWith('/cst/')) {
      if (!user && pathname !== '/cst/login') {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.push('/cst/login');
        }
      }
      if (user && pathname === '/cst/login') {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.push('/cst/cstdashboard');
        }
      }
      return;
    }

    // ✅ Supplier routes
    if (pathname.startsWith('/supplier/')) {
      if (!user && pathname !== '/supplier/login') {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.push('/supplier/login');
        }
      }
      if (user && pathname === '/supplier/login') {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.push('/supplier/dashboard');
        }
      }
      return;
    }

    // ✅ Employee routes
    if (user) {
      if (pathname === '/login') {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.push('/dashboard');
        }
      }
    } else {
      const publicPages = ['/login', '/', '/register'];
      const isPublicPage = publicPages.includes(pathname) ||
        pathname.startsWith('/cst/') ||
        pathname.startsWith('/agent/') ||
        pathname.startsWith('/supplier/');

      if (!isPublicPage) {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.push('/login');
        }
      }
    }
  }, [user, loading, pathname, router]);

  // ✅ Optimized login function
  const login = useCallback((userData, token) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      // Store full user data in both storages for consistency
      const userDataString = JSON.stringify(userData);
      sessionStorage.setItem('user', userDataString);
      localStorage.setItem('user', userDataString);
      localStorage.setItem('token', token);
      // Also store token in sessionStorage for mobile compatibility
      if (token) {
        sessionStorage.setItem('token', token);
      }
    }
  }, []);

  // ✅ Optimized logout function
  const logout = useCallback(async () => {
    try {
      // ✅ Set loading to prevent race conditions
      setLoading(true);

      // ✅ Set logout flag to prevent checkAuth from running
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('isLoggingOut', 'true');
      }

      // ✅ Current route के based पर अलग logout
      if (pathname.startsWith('/agent/')) {
        // Agent logout
        localStorage.removeItem("agent");
        localStorage.removeItem("agent_token");
        sessionStorage.removeItem("agent");
        sessionStorage.removeItem("agent_token");
      } else if (pathname.startsWith('/cst/')) {
        // Customer logout
        localStorage.removeItem("customer");
        localStorage.removeItem("cst_token");
        sessionStorage.removeItem("customer");
        sessionStorage.removeItem("cst_token");
      } else if (pathname.startsWith('/supplier/')) {
        // Supplier logout
        localStorage.removeItem("supplier");
        localStorage.removeItem("supplier_token");
        sessionStorage.removeItem("supplier");
        sessionStorage.removeItem("supplier_token");
      } else {
        // Employee logout - only call API if actually logged in
        if (user) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include'
            });
          } catch (error) {
            console.error('Logout API error:', error);
            // Continue with logout even if API fails
          }
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // ✅ Clear user state first
      setUser(null);

      // ✅ Clear ALL storage items completely
      if (typeof window !== 'undefined') {
        // Clear session storage
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('customer');
        sessionStorage.removeItem('cst_token');
        sessionStorage.removeItem('agent');
        sessionStorage.removeItem('agent_token');
        sessionStorage.removeItem('supplier');
        sessionStorage.removeItem('supplier_token');
        // Clear local storage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('cst_token');
        localStorage.removeItem('agent');
        localStorage.removeItem('agent_token');
        localStorage.removeItem('supplier');
        localStorage.removeItem('supplier_token');
      }

      // ✅ Set loading to false after clearing
      setLoading(false);

      // ✅ Immediate redirect to login using window.location for reliable mobile redirect
      if (typeof window !== 'undefined') {
        // Clear logout flag
        sessionStorage.removeItem('isLoggingOut');

        // Use window.location.href for hard redirect (clears history and prevents back button)
        if (pathname.startsWith('/agent/')) {
          window.location.replace('/agent/login');
        } else if (pathname.startsWith('/cst/')) {
          window.location.replace('/cst/login');
        } else if (pathname.startsWith('/supplier/')) {
          window.location.replace('/supplier/login');
        } else {
          window.location.replace('/login');
        }
      } else {
        // Fallback for SSR
        if (pathname.startsWith('/agent/')) {
          router.replace('/agent/login');
        } else if (pathname.startsWith('/cst/')) {
          router.replace('/cst/login');
        } else if (pathname.startsWith('/supplier/')) {
          router.replace('/supplier/login');
        } else {
          router.replace('/login');
        }
      }
    }
  }, [pathname, user, router]);

  // ✅ Memoized context value
  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};
