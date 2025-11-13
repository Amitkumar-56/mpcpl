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
      
      // ✅ CST routes के लिए अलग handling
      if (pathname.startsWith('/cst/')) {
        const savedCustomer = localStorage.getItem("customer");
        if (savedCustomer) {
          setUser(JSON.parse(savedCustomer));
        } else {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // ✅ Employee routes के लिए conditional check
      // Skip auth check if already have user data in sessionStorage
      const sessionUser = sessionStorage.getItem('user');
      if (sessionUser) {
        const userData = JSON.parse(sessionUser);
        setUser(userData);
        setLoading(false);
        return;
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

    // ✅ CST routes के लिए अलग logic
    if (pathname.startsWith('/cst/')) {
      if (!user && pathname !== '/cst/login') {
        router.push('/cst/login');
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
      // ✅ Current route के based पर अलग logout
      if (pathname.startsWith('/cst/')) {
        // Customer logout
        localStorage.removeItem("customer");
        localStorage.removeItem("cst_token");
      } else {
        // Employee logout - only call API if actually logged in
        if (user) {
          await fetch('/api/auth/logout', { 
            method: 'POST',
            credentials: 'include'
          });
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('cst_token');
      }
      
      // ✅ Use setTimeout to avoid race conditions
      setTimeout(() => {
        if (pathname.startsWith('/cst/')) {
          router.push('/cst/login');
        } else {
          router.push('/login');
        }
      }, 100);
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