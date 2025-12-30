'use client';

import ActivityLogs from '@/components/ActivityLogs';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CustomerActivityLogsPage() {
  const router = useRouter();
  
  useEffect(() => {
    try {
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      let userId = null;
      let userName = null;
      if (userData) {
        const parsed = JSON.parse(userData);
        userId = parsed?.id || parsed?.userId || null;
        userName = parsed?.name || null;
      }
      const uniqueCode = `PAGEVIEW-CUSTOMER-${Date.now()}`;
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 'Customer Management',
          section: 'Activity Logs',
          action: 'view',
          uniqueCode,
          userId,
          userName,
          recordType: 'page_view',
          remarks: 'Visited Customer Activity Logs page'
        })
      }).catch(() => {});
    } catch {}
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Customer Activity Logs</h1>
            </div>
            <nav className="flex space-x-2 text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-gray-900">Home</Link>
              <span>/</span>
              <Link href="/customers" className="hover:text-gray-900">Customers</Link>
              <span>/</span>
              <span className="text-gray-900">Activity Logs</span>
            </nav>
          </div>

          {/* Activity Logs Component */}
          <ActivityLogs
            pageName="Customer Management"
            recordType="customer"
            showFilters={true}
            limit={50}
          />
        </main>
        <Footer />
      </div>
    </div>
  );
}

