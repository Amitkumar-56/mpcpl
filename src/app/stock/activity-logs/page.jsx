'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import ActivityLogs from '@/components/ActivityLogs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StockActivityLogsPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Stock Activity Logs</h1>
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
      </div>
    </div>
  );
}

