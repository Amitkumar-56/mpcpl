'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function DNCNPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [stockData, setStockData] = useState(null);
  const [dncnEntries, setDncnEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchDNCNData();
    } else {
      setError('Stock ID is required');
      setLoading(false);
    }
  }, [id]);

  const fetchDNCNData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/stock/dncn?id=${id}`);
      const data = await response.json();
      
      if (data.success) {
        setStockData(data.stock);
        // Convert logs to DNCN entries format
        const entries = (data.logs || []).map((log, index) => ({
          id: index + 1,
          supply_id: data.stock?.id || id,
          dncn_type: log.dncn_change ? (parseFloat(log.dncn_change.to) > parseFloat(log.dncn_change.from) ? 'Debit' : 'Credit') : 'N/A',
          amount: log.dncn_change ? Math.abs(parseFloat(log.dncn_change.to) - parseFloat(log.dncn_change.from)) : (log.dncn || 0),
          status: log.status || data.stock?.status || 'N/A',
          date: log.created_at || log.updated_at || data.stock?.created_at,
          remarks: log.remarks || 'N/A'
        }));
        
        // If no logs, show stock DNCN as entry
        if (entries.length === 0 && data.stock?.dncn) {
          entries.push({
            id: 1,
            supply_id: data.stock.id,
            dncn_type: parseFloat(data.stock.dncn) > 0 ? 'Debit' : parseFloat(data.stock.dncn) < 0 ? 'Credit' : 'N/A',
            amount: Math.abs(parseFloat(data.stock.dncn) || 0),
            status: data.stock.status,
            date: data.stock.created_at,
            remarks: 'Initial DNCN entry'
          });
        }
        
        setDncnEntries(entries);
      } else {
        setError(data.error || 'Failed to fetch DNCN data');
      }
    } catch (err) {
      console.error('Error fetching DNCN data:', err);
      setError('Failed to load DNCN data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return amount ? `₹${parseFloat(amount).toLocaleString('en-IN')}` : '₹0';
  };

  const getStatusBadge = (status) => {
    const statusValue = status?.toString().toLowerCase();
    const numericMap = {
      '1': { text: 'Dispatched', className: 'bg-blue-100 text-blue-800' },
      '2': { text: 'Processing', className: 'bg-yellow-100 text-yellow-800' },
      '3': { text: 'Completed', className: 'bg-green-100 text-green-800' },
      '4': { text: 'Cancelled', className: 'bg-red-100 text-red-800' }
    };
    const stringMap = {
      'on_the_way': { text: 'On The Way', className: 'bg-purple-100 text-purple-800' },
      'pending': { text: 'Pending', className: 'bg-gray-100 text-gray-800' },
      'completed': { text: 'Completed', className: 'bg-green-100 text-green-800' }
    };
    const statusInfo = numericMap[statusValue] || stringMap[statusValue] || { 
      text: status || 'N/A', 
      className: 'bg-gray-100 text-gray-800' 
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getDNCNTypeBadge = (type) => {
    if (type === 'Debit') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Debit</span>;
    } else if (type === 'Credit') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Credit</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">N/A</span>;
  };

  if (loading) {
    return null;
  }

  if (error && !id) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
              <nav className="flex space-x-2 text-sm text-gray-600 mb-4">
                <button
                  onClick={() => router.back()}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Home
                </button>
                <span>/</span>
                <span>Stock Supply</span>
                <span>/</span>
                <span className="text-gray-900">DNCN</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clipRule="evenodd" />
                </svg>
                DNCN
              </h1>
            </div>

            {/* DNCN Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                {error ? (
                  <div className="p-6 text-center text-red-600">
                    {error}
                  </div>
                ) : dncnEntries.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p className="text-lg">No DNCN found</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supply id</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNCN Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dncnEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.id}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.supply_id}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">{getDNCNTypeBadge(entry.dncn_type)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(entry.amount)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">{getStatusBadge(entry.status)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(entry.date)}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{entry.remarks}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-600 hover:text-blue-900">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Floating Action Button */}
            {id && (
              <Link
                href={`/stock/dncn/add?id=${id}`}
                className="fixed bottom-8 right-8 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Add Debit/Credit</span>
              </Link>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function DNCNPage() {
  return (
    <Suspense fallback={null}>
      <DNCNPageContent />
    </Suspense>
  );
}

