"use client";

import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

const CustomerSessionContext = createContext();

export function CustomerSessionProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkCustomerAuth();
  }, []);

  const checkCustomerAuth = async () => {
    try {
      const customerData = localStorage.getItem('customer');
      const token = localStorage.getItem('customerToken');
      
      if (!customerData || !token) {
        setCustomer(null);
        setLoading(false);
        return;
      }

      // Verify token with backend
      const res = await fetch('/api/cst/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const verification = await res.json();

      if (verification.valid) {
        setCustomer(JSON.parse(customerData));
      } else {
        setCustomer(null);
        localStorage.removeItem('customer');
        localStorage.removeItem('customerToken');
      }
    } catch (error) {
      console.error('Customer auth check failed:', error);
      setCustomer(null);
      localStorage.removeItem('customer');
      localStorage.removeItem('customerToken');
    } finally {
      setLoading(false);
    }
  };

  const login = (customerData, token) => {
    setCustomer(customerData);
    localStorage.setItem('customer', JSON.stringify(customerData));
    localStorage.setItem('customerToken', token);
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/cst/login');
  };

  const value = {
    customer,
    loading,
    login,
    logout,
    checkCustomerAuth,
    isAuthenticated: !!customer,
  };

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export const useCustomerSession = () => {
  const context = useContext(CustomerSessionContext);
  if (!context) {
    throw new Error('useCustomerSession must be used within CustomerSessionProvider');
  }
  return context;
};