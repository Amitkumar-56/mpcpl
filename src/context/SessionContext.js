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

  // ✅ Optimized auth check with useCallback
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

      // ✅ For login pages, check if user is already logged in and set loading to false quickly
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
        // Check both localStorage and sessionStorage for agent data
        const savedAgent = localStorage.getItem("agent") || sessionStorage.getItem("agent");
        if (savedAgent) {
          try {
            const agentData = JSON.parse(savedAgent);
            setUser(agentData);
            // Sync to both storages for consistency
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
        // Check both localStorage and sessionStorage for customer data
        const savedCustomer = localStorage.getItem("customer") || sessionStorage.getItem("customer");
        if (savedCustomer) {
          try {
            const customerData = JSON.parse(savedCustomer);
            // Verify customer has valid roleid (allow customer=1 and sub-user=2)
            if (Number(customerData.roleid) === 1 || Number(customerData.roleid) === 2) {
              setUser(customerData);
              // Sync to both storages for consistency
              localStorage.setItem("customer", savedCustomer);
              sessionStorage.setItem("customer", savedCustomer);
            } else {
              // Invalid role, set user to null (don't clear storages aggressively)
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
        // Check both localStorage and sessionStorage for supplier data
        const savedSupplier = localStorage.getItem("supplier") || sessionStorage.getItem("supplier");
        if (savedSupplier) {
          try {
            const supplierData = JSON.parse(savedSupplier);
            setUser(supplierData);
            // Sync to both storages for consistency
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

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setUser(null);
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        return;
      }

      try {
        const res = await fetch('/api/auth/verify', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.id) {
            const userData = {
              id: data.id,
              emp_code: data.emp_code,
              name: data.name,
              email: data.email,
              role: data.role,
              fs_id: data.fs_id,
              fl_id: data.fl_id,
              station: data.station,
              client: data.client,
              permissions: data.permissions || {}
            };
            setUser(userData);
            const cacheData = JSON.stringify(userData);
            sessionStorage.setItem('user', cacheData);
            localStorage.setItem('user', cacheData);
          } else {
            setUser(null);
            sessionStorage.removeItem('user');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            localStorage.removeItem('token');
          }
        } else {
          setUser(null);
          sessionStorage.removeItem('user');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          localStorage.removeItem('token');
        }
      } catch (networkError) {
        setUser(null);
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  // ✅ Optimized useEffect - only run on mount, NOT on pathname change
  // Skip auth check if user is already set to prevent blank screen during navigation
  useEffect(() => {
    // Only check auth on initial load (when user is null)
    // Don't check on pathname change to prevent blank screen during navigation
    if (!user) {
      // User not set yet - initial load or logout
      checkAuth();
    }
    // If user is set, don't do anything - keep loading false for smooth navigation
  }, [user, checkAuth]); // Removed pathname from deps to prevent re-check on navigation

  // ✅ Separate useEffect for redirection logic with loop prevention
  useEffect(() => {
    if (loading) return;

    // ✅ Reset redirect flag when pathname actually changes
    if (lastPathnameRef.current !== pathname) {
      redirectingRef.current = false;
      lastPathnameRef.current = pathname;
      // Clear any pending redirect timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    }

    // ✅ Check for bypassAuth flag (for public pages like transport-receipt)
    if (typeof window !== 'undefined') {
      const bypassAuth = sessionStorage.getItem('bypassAuth');
      if (bypassAuth === 'true') {
        // Skip auth redirect for pages with bypassAuth
        return;
      }
    }

    // ✅ Agent routes के लिए अलग logic
    if (pathname.startsWith('/agent/')) {
      // For agent routes, check localStorage directly if user is null
      if (!user && pathname !== '/agent/login') {
        const savedAgent = localStorage.getItem("agent") || sessionStorage.getItem("agent");
        if (savedAgent) {
          try {
            const agentData = JSON.parse(savedAgent);
            // Agent exists and is valid, set user and don't redirect
            setUser(agentData);
            return;
          } catch (e) {
            // Invalid data, continue to redirect
          }
        }
        // No valid agent found, redirect to login (only once)
        if (!redirectingRef.current && lastPathnameRef.current === pathname) {
          redirectingRef.current = true;
          lastPathnameRef.current = '/agent/login';
          router.push('/agent/login');
        }
      }
      // If user is logged in and on login page, redirect to dashboard (only once)
      if (user && pathname === '/agent/login') {
        if (!redirectingRef.current && lastPathnameRef.current === pathname) {
          redirectingRef.current = true;
          lastPathnameRef.current = '/agent/dashboard';
          router.push('/agent/dashboard');
        }
      }
      return;
    }

    // ✅ CST routes के लिए अलग logic
    if (pathname.startsWith('/cst/')) {
      // For CST routes, check localStorage directly if user is null
      // This handles the case where login just happened but checkAuth hasn't run yet
      if (!user && pathname !== '/cst/login') {
        const savedCustomer = localStorage.getItem("customer") || sessionStorage.getItem("customer");
        if (savedCustomer) {
          try {
            const customerData = JSON.parse(savedCustomer);
            if (Number(customerData.roleid) === 1 || Number(customerData.roleid) === 2) {
              // Customer exists and is valid, set user and don't redirect
              setUser(customerData);
              return;
            }
          } catch (e) {
            // Invalid data, continue to redirect
          }
        }
        // No valid customer found, redirect to login (only once)
        if (!redirectingRef.current && lastPathnameRef.current === pathname) {
          redirectingRef.current = true;
          lastPathnameRef.current = '/cst/login';
          router.push('/cst/login');
        }
      }
      // If user is logged in and on login page, redirect to dashboard (only once)
      if (user && pathname === '/cst/login') {
        if (!redirectingRef.current && lastPathnameRef.current === pathname) {
          redirectingRef.current = true;
          lastPathnameRef.current = '/cst/cstdashboard';
          router.push('/cst/cstdashboard');
        }
      }
      return;
    }

    // ✅ Employee routes के लिए normal logic
    if (user) {
      // Only redirect from login page to dashboard if user is logged in
      if (pathname === '/login') {
        // If user is logged in and on login page, redirect to dashboard (only once)
        if (!redirectingRef.current && lastPathnameRef.current === pathname) {
          redirectingRef.current = true;
          lastPathnameRef.current = '/dashboard';
          router.push('/dashboard');
        }
      }
      // Don't redirect if user is logged in and on any other valid page
    } else {
      // Only redirect to login if no user AND not on public pages
      const publicPages = ['/login', '/', '/register'];
      const isPublicPage = publicPages.includes(pathname) || 
                          pathname.startsWith('/cst/') || 
                          pathname.startsWith('/agent/') || 
                          pathname.startsWith('/supplier/');
      
      if (!isPublicPage) {
        // No user and not on public page, redirect to login (only once)
        if (!redirectingRef.current && lastPathnameRef.current === pathname) {
          redirectingRef.current = true;
          lastPathnameRef.current = '/login';
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
