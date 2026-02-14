'use client';

import ActivityLogs from '@/components/ActivityLogs';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StockActivityLogsPage() {
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
      const uniqueCode = `PAGEVIEW-STOCK-${Date.now()}`;
      
      // Only create audit log if we have valid user data
      if (userId && userName) {
        fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 'Stock Management',
            section: 'Activity Logs',
            action: 'view',
            uniqueCode,
            userId,
            userName,
            recordType: 'page_view',
            remarks: 'Visited Stock Activity Logs page'
          })
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0 py-6 px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Stock Activity Logs</h1>
            </div>
            <nav className="flex space-x-2 text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-gray-900">Home</Link>
              <span>/</span>
              <Link href="/stock" className="hover:text-gray-900">Stock</Link>
              <span>/</span>
              <span className="text-gray-900">Activity Logs</span>
            </nav>
          </div>

          {/* Activity Logs Component */}
          <ActivityLogs
            pageName="Stock Management"
            recordType="stock"
            showFilters={true}
            limit={50}
          />
        </main>
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

