'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Create a component that uses useSearchParams
function DncnPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [dncnData, setDncnData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDncnData = async () => {
      if (!id) {
        setError('ID is required');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/stock/dncn?id=${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch DNCN data');
        }
        
        const data = await response.json();
        setDncnData(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDncnData();
  }, [id]);

  const getTypeLabel = (type) => {
    switch (type) {
      case 1: return "Debit";
      case 2: return "Credit";
      default: return "Unknown";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 1: return "Approved";
      case 2: return "Rejected";
      default: return "Unknown";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 1: return "bg-green-100 text-green-800";
      case 2: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Format number with Indian Rupee symbol and comma separation
  const formatRupee = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Simple */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex mb-6">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                Home
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/stock/requests" className="text-blue-600 hover:text-blue-800">
                Stock Supply
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-600">DNCN</li>
          </ol>
        </nav>

        {/* Page Title with Back Button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Stock Requests</h2>
            <p className="text-gray-600">DNCN Management</p>
          </div>
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <Link
            href={`/stock/add-dncn?id=${id}`}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Debit/Credit
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">DNCN Records</h3>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supply ID</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dncnData.length > 0 ? (
                  dncnData.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.sup_id || 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getTypeLabel(row.type)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatRupee(row.amount)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(row.status)}`}>
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.dncn_date ? new Date(row.dncn_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={row.remarks || ''}>
                          {row.remarks || '-'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            // Simple action - no popup
                            console.log('View DNCN:', row.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-4 sm:px-6 py-8 text-center text-gray-500">
                      No DNCN records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {dncnData.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {dncnData.map((row, index) => (
                  <div key={row.id || index} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">#{index + 1}</span>
                        <span className="font-medium text-gray-900">{row.sup_id || 'N/A'}</span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Type</span>
                        <span className="text-sm font-medium">{getTypeLabel(row.type)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Amount</span>
                        <span className="text-sm font-medium">{formatRupee(row.amount)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Date</span>
                        <span className="text-sm">
                          {row.dncn_date ? new Date(row.dncn_date).toLocaleDateString('en-IN') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            console.log('View DNCN:', row.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View →
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Remarks</span>
                      <p className="text-sm text-gray-800 break-words">{row.remarks || 'No remarks'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No DNCN records found
              </div>
            )}
          </div>
        </div>

        {/* Floating Add Button for Mobile */}
        <Link
          href={`/stock/add-dncn?id=${id}`}
          className="md:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} Stock Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

// Main component with Suspense
export default function DncnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <DncnPageContent />
    </Suspense>
  );
}