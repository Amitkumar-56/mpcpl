'use client';

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Create a separate component that uses useSearchParams
function NBStockHistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const station_id = searchParams.get('station_id');
  const product_id = searchParams.get('product_id');
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stationName, setStationName] = useState('');
  const [productName, setProductName] = useState('');

  useEffect(() => {
    if (station_id && product_id) {
      fetchHistory();
    } else {
      setError('Station ID and Product ID are required');
      setLoading(false);
    }
  }, [station_id, product_id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/nb-stock/history?station_id=${station_id}&product_id=${product_id}`
      );
      
      const result = await response.json();
      
      if (result.success) {
        setHistory(result.data);
        if (result.data.length > 0) {
          setStationName(result.data[0].station_name || '');
          setProductName(result.data[0].product_name || '');
        }
      } else {
        setError(result.error || 'Failed to fetch history');
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <Header />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <button
                  onClick={() => router.back()}
                  className="mb-4 p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Non-Billing Stock History
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  {stationName && productName && (
                    <>Outward transactions for <strong>{stationName}</strong> - <strong>{productName}</strong></>
                  )}
                </p>
              </div>
            </div>

            {/* History Table */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <svg
                    className="w-12 h-12 mb-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-lg font-medium mb-1">No history found</p>
                  <p className="text-sm">No outward transactions recorded for this station and product</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                          #
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                          Request ID
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                          Outward Qty
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                          Amount
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                          Customer Name
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                          Vehicle Number
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                          Employee Name
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                          Date & Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {history.map((record, index) => (
                        <tr
                          key={record.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                            {index + 1}
                          </td>
                          <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                            {record.rid}
                          </td>
                          <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {record.outward_qty}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                            ₹{parseFloat(record.amount || 0).toFixed(2)}
                          </td>
                          <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                            {record.customer_name || '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                            {record.vehicle_number || '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                            {record.employee_name || '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-900 whitespace-nowrap">
                            {formatDateTime(record.filling_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function NBStockHistoryPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-0">
            <Header />
            <main className="flex-1 overflow-auto flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </main>
            <Footer />
          </div>
        </div>
      }
    >
      <NBStockHistoryContent />
    </Suspense>
  );
}