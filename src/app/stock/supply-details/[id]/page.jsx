'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SupplyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const [stockData, setStockData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchSupplyDetails();
    }
  }, [id]);

  const fetchSupplyDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch stock details
      const stockResponse = await fetch(`/api/stock`);
      const stockResult = await stockResponse.json();
      
      if (stockResult.success && stockResult.data) {
        const stockItem = stockResult.data.find(item => item.id === parseInt(id));
        if (stockItem) {
          setStockData(stockItem);
          
          // Fetch history from multiple sources
          const historyData = [];
          
          // 1. Stock logs if available
          try {
            const logsResponse = await fetch(`/api/stock/dncn?id=${id}`);
            const logsResult = await logsResponse.json();
            if (logsResult.success && logsResult.logs) {
              logsResult.logs.forEach(log => {
                historyData.push({
                  type: 'log',
                  action: log.action || 'Status Change',
                  changed_by: log.changed_by_name || 'System',
                  date: log.created_at || log.updated_at,
                  status: log.status,
                  remarks: log.remarks
                });
              });
            }
          } catch (err) {
            console.log('No stock logs available');
          }
          
          // 2. Stock transfer history
          try {
            const transferResponse = await fetch(`/api/stock-transfers?stock_id=${id}`);
            const transferResult = await transferResponse.json();
            if (transferResult.success && transferResult.data) {
              transferResult.data.forEach(transfer => {
                historyData.push({
                  type: 'transfer',
                  action: `Stock Transfer: ${transfer.station_from} → ${transfer.station_to}`,
                  changed_by: transfer.created_by_name || 'System',
                  date: transfer.created_at,
                  quantity: transfer.transfer_quantity,
                  status: transfer.status
                });
              });
            }
          } catch (err) {
            console.log('No transfer history available');
          }
          
          // 3. Filling history if linked
          try {
            const fillingResponse = await fetch(`/api/filling-requests?stock_id=${id}`);
            const fillingResult = await fillingResponse.json();
            if (fillingResult.success && fillingResult.requests) {
              fillingResult.requests.forEach(filling => {
                historyData.push({
                  type: 'filling',
                  action: `Filling Request: ${filling.rid}`,
                  changed_by: filling.created_by_name || 'System',
                  date: filling.created,
                  status: filling.status,
                  quantity: filling.qty
                });
              });
            }
          } catch (err) {
            console.log('No filling history available');
          }
          
          // Sort by date (newest first)
          historyData.sort((a, b) => new Date(b.date) - new Date(a.date));
          setHistory(historyData);
        } else {
          setError('Stock record not found');
        }
      } else {
        setError('Failed to fetch stock data');
      }
    } catch (err) {
      console.error('Error fetching supply details:', err);
      setError('Failed to load supply details');
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

  const getStatusBadge = (status) => {
    const statusMap = {
      1: { text: 'Dispatched', class: 'bg-blue-100 text-blue-800' },
      2: { text: 'Processing', class: 'bg-yellow-100 text-yellow-800' },
      3: { text: 'Completed', class: 'bg-green-100 text-green-800' },
      4: { text: 'Cancelled', class: 'bg-red-100 text-red-800' },
      'on_the_way': { text: 'On The Way', class: 'bg-blue-100 text-blue-800' },
      'dispatched': { text: 'Dispatched', class: 'bg-blue-100 text-blue-800' },
      'processing': { text: 'Processing', class: 'bg-yellow-100 text-yellow-800' },
      'completed': { text: 'Completed', class: 'bg-green-100 text-green-800' },
      'cancelled': { text: 'Cancelled', class: 'bg-red-100 text-red-800' }
    };
    
    const statusInfo = statusMap[status] || { text: 'Unknown', class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
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
              <p className="mt-4 text-gray-600">Loading supply details...</p>
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
                  Supply Details & Complete History
                </h1>
              </div>

              {/* Stock Information */}
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
                        <label className="text-sm font-medium text-gray-500">Quantity (Ltr)</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.ltr || '0'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Quantity (Kg)</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.kg || '0'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tanker Number</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.tanker_no || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Driver Number</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.driver_no || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">LR Number</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.lr_no || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payable</label>
                        <p className="text-sm text-gray-900 font-medium">{formatCurrency(stockData.payable)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">DN/CN</label>
                        <p className="text-sm text-gray-900 font-medium">{stockData.dncn || '0'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="mt-1">
                          {getStatusBadge(stockData.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Complete History
                  </h2>
                </div>
                <div className="p-6">
                  {history.length > 0 ? (
                    <div className="space-y-4">
                      {history.map((item, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium mr-2 ${
                                item.type === 'log' ? 'bg-blue-100 text-blue-800' :
                                item.type === 'transfer' ? 'bg-purple-100 text-purple-800' :
                                item.type === 'filling' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.type === 'log' ? 'Log' : item.type === 'transfer' ? 'Transfer' : 'Filling'}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {item.action}
                              </span>
                              {item.status && (
                                <div className="ml-3">
                                  {getStatusBadge(item.status)}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(item.date)}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            {item.changed_by && (
                              <p className="text-xs text-gray-600">
                                Changed by: <span className="font-medium">{item.changed_by}</span>
                              </p>
                            )}
                            {item.quantity && (
                              <p className="text-xs text-gray-600">
                                Quantity: <span className="font-medium">{item.quantity}</span>
                              </p>
                            )}
                            {item.remarks && (
                              <p className="text-xs text-gray-600">
                                Remarks: {item.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No history available for this stock entry.</p>
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

