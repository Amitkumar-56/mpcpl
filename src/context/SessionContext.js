// src/context/SessionContext.js
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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
      
      // ✅ CST routes के लिए अलग handling
      if (pathname.startsWith('/cst/')) {
        // Check both localStorage and sessionStorage for customer data
        const savedCustomer = localStorage.getItem("customer") || sessionStorage.getItem("customer");
        if (savedCustomer) {
          try {
            const customerData = JSON.parse(savedCustomer);
            // Verify customer has valid roleid
            if (Number(customerData.roleid) === 1) {
              setUser(customerData);
              // Sync to both storages for consistency
              localStorage.setItem("customer", savedCustomer);
              sessionStorage.setItem("customer", savedCustomer);
            } else {
              // Invalid role, clear and set user to null
              localStorage.removeItem("customer");
              sessionStorage.removeItem("customer");
              setUser(null);
            }
          } catch (e) {
            console.error('Error parsing customer data:', e);
            localStorage.removeItem("customer");
            sessionStorage.removeItem("customer");
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // ✅ Employee routes के लिए conditional check
      // Check both sessionStorage and localStorage for mobile compatibility
      const sessionUser = sessionStorage.getItem('user');
      const localUser = localStorage.getItem('user');
      
      // Prefer sessionStorage, fallback to localStorage
      const cachedUser = sessionUser || localUser;
      if (cachedUser) {
        try {
          const userData = JSON.parse(cachedUser);
          // ✅ Verify token exists before using cached user
          const token = localStorage.getItem('token');
          if (!token) {
            // No token means logged out, clear cache
            sessionStorage.removeItem('user');
            localStorage.removeItem('user');
            setLoading(false);
            return;
          }
          
          setUser(userData);
          // Sync to both storages for consistency
          if (!sessionUser && localUser) {
            sessionStorage.setItem('user', localUser);
          }
          if (!localUser && sessionUser) {
            localStorage.setItem('user', sessionUser);
          }
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error parsing cached user:', e);
          // Clear invalid data
          sessionStorage.removeItem('user');
          localStorage.removeItem('user');
        }
      }

      const res = await fetch('/api/auth/verify', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.id) {
          setUser(data);
          // ✅ Cache user data to avoid repeated API calls
          sessionStorage.setItem('user', JSON.stringify({
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            permissions: data.permissions || {}
          }));
        } else {
          setUser(null);
          sessionStorage.removeItem('user');
        }
      } else {
        setUser(null);
        sessionStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      sessionStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  // ✅ Optimized useEffect with proper dependencies
  useEffect(() => {
    checkAuth();
  }, [checkAuth]); // ✅ Only depend on checkAuth function

  // ✅ Separate useEffect for redirection logic
  useEffect(() => {
    if (loading) return;

    // ✅ Check for bypassAuth flag (for public pages like transport-receipt)
    if (typeof window !== 'undefined') {
      const bypassAuth = sessionStorage.getItem('bypassAuth');
      if (bypassAuth === 'true') {
        // Skip auth redirect for pages with bypassAuth
        return;
      }
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
            if (Number(customerData.roleid) === 1) {
              // Customer exists and is valid, set user and don't redirect
              setUser(customerData);
              return;
            }
          } catch (e) {
            // Invalid data, continue to redirect
          }
        }
        // No valid customer found, redirect to login
        router.push('/cst/login');
      }
      // If user is logged in and on login page, redirect to dashboard
      if (user && pathname === '/cst/login') {
        router.push('/cst/cstdashboard');
      }
      return;
    }

    // ✅ Employee routes के लिए normal logic
    if (user) {
      if (pathname === '/login') {
        router.push('/dashboard');
      }
    } else {
      if (pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [user, loading, pathname, router]);

  // ✅ Optimized login function
  const login = useCallback((userData, token) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      const sessionUserData = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        permissions: userData.permissions || {}
      };
      
      sessionStorage.setItem('user', JSON.stringify(sessionUserData));
      localStorage.setItem('token', token);
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
      if (pathname.startsWith('/cst/')) {
        // Customer logout
        localStorage.removeItem("customer");
        localStorage.removeItem("cst_token");
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
        // Clear local storage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('cst_token');
      }
      
      // ✅ Set loading to false after clearing
      setLoading(false);
      
      // ✅ Immediate redirect to login using window.location for reliable mobile redirect
      if (typeof window !== 'undefined') {
        // Clear logout flag
        sessionStorage.removeItem('isLoggingOut');
        
        // Use window.location.href for hard redirect (clears history and prevents back button)
        if (pathname.startsWith('/cst/')) {
          window.location.replace('/cst/login');
        } else {
          window.location.replace('/login');
        }
      } else {
        // Fallback for SSR
        if (pathname.startsWith('/cst/')) {
          router.replace('/cst/login');
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