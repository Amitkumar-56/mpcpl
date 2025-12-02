'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DNCNPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const [stockData, setStockData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchDNCNData();
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
        setLogs(data.logs || []);
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
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return amount ? `₹${parseFloat(amount).toLocaleString('en-IN')}` : '₹0';
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading DNCN data...</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (error) {
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
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to Stock
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                  DN/CN History & Logs
                </h1>
              </div>

              {stockData && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Stock Information</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Invoice Number</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.invoice_number || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Supplier</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.supplier_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Product</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.product_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Station</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.station_name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">DN/CN</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.dncn || '0'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total DN/CN</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.t_dncn || '0'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payable</label>
                        <p className="text-sm text-gray-900 font-medium">{formatCurrency(stockData.payable)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          stockData.status === 1 ? 'bg-blue-100 text-blue-800' :
                          stockData.status === 2 ? 'bg-yellow-100 text-yellow-800' :
                          stockData.status === 3 ? 'bg-green-100 text-green-800' :
                          stockData.status === 4 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {stockData.status === 1 ? 'Dispatched' :
                           stockData.status === 2 ? 'Processing' :
                           stockData.status === 3 ? 'Completed' :
                           stockData.status === 4 ? 'Cancelled' : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    DN/CN History & Status Logs
                  </h2>
                </div>
                <div className="p-6">
                  {logs.length > 0 ? (
                    <div className="space-y-4">
                      {logs.map((log, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-700">
                                {log.action || 'Status Change'}
                              </span>
                              {log.status && (
                                <span className={`ml-3 inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  log.status === 1 ? 'bg-blue-100 text-blue-800' :
                                  log.status === 2 ? 'bg-yellow-100 text-yellow-800' :
                                  log.status === 3 ? 'bg-green-100 text-green-800' :
                                  log.status === 4 ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.status === 1 ? 'Dispatched' :
                                   log.status === 2 ? 'Processing' :
                                   log.status === 3 ? 'Completed' :
                                   log.status === 4 ? 'Cancelled' : 'Unknown'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(log.created_at || log.updated_at)}
                            </span>
                          </div>
                          {log.changed_by_name && (
                            <p className="text-xs text-gray-600">
                              Changed by: <span className="font-medium">{log.changed_by_name}</span>
                            </p>
                          )}
                          {log.remarks && (
                            <p className="text-xs text-gray-600 mt-1">
                              Remarks: {log.remarks}
                            </p>
                          )}
                          {log.dncn_change && (
                            <p className="text-xs text-gray-600 mt-1">
                              DN/CN: <span className="font-medium">{log.dncn_change.from}</span> → <span className="font-medium">{log.dncn_change.to}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No history logs available for this stock entry.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

