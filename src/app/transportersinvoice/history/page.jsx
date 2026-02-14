'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function TransportersInvoiceHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transporterId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [transporter, setTransporter] = useState(null);

  useEffect(() => {
    if (transporterId) {
      fetchTransporterHistory();
    } else {
      setLoading(false);
    }
  }, [transporterId]);

  const fetchTransporterHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/suppliersinvoice-history?transporter_id=${transporterId}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setHistory(result.data || []);
        setTransporter(result.transporter || null);
      } else {
        alert('Failed to load transporter history: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error loading transporter history:', err);
      alert('Error loading transporter history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    if (status == 1) return 'Dispatched';
    if (status == 2) return 'Processing';
    if (status == 3) return 'Completed';
    if (status == 4) return 'Cancelled';
    return 'Unknown Status';
  };

  const getStatusColor = (status) => {
    if (status == 1) return 'bg-blue-100 text-blue-800';
    if (status == 2) return 'bg-yellow-100 text-yellow-800';
    if (status == 3) return 'bg-green-100 text-green-800';
    if (status == 4) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading transporter history...</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if (!transporterId) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Header />
          </div>
          <main className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div className="text-center bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-md w-full">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Invalid Transporter ID</h2>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">Please provide a valid transporter ID.</p>
              <button
                onClick={() => router.push('/transporters')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors text-sm sm:text-base"
              >
                Go to Transporters
              </button>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()} 
                className="mr-3 sm:mr-4 text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transporter Invoice History</h1>
                <nav className="text-xs sm:text-sm text-gray-600 mt-1">
                  <ol className="flex flex-wrap items-center space-x-2">
                    <li><a href="/" className="hover:text-blue-600">Home</a></li>
                    <li>/</li>
                    <li className="text-gray-900">Transporter Invoice History</li>
                  </ol>
                </nav>
              </div>
            </div>
            
            {transporter && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Transporter:</span> {transporter.transporter_name}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
                Invoice History ({history.length} records)
              </h2>
              
              {history.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Station</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tanker No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Weight Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice Value</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">DNCN</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Payable</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {history.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {record.date ? new Date(record.date).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'Asia/Kolkata'
                              }) : record.id ? `#${record.id}` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {record.product_name || 'Product not found'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {record.station_name || 'Station not found'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.tanker_no || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.weight_type || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.ltr || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                              ₹{parseFloat(record.t_invoice_value || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              ₹{parseFloat(record.dncn || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-semibold">
                              ₹{parseFloat(record.payable || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                {getStatusLabel(record.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-4">
                    {history.map((record) => (
                      <div key={record.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">#{record.id}</h3>
                            <p className="text-sm text-gray-600">{record.product_name || 'Product not found'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {getStatusLabel(record.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <p className="text-gray-900 font-medium">
                              {record.date ? new Date(record.date).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'Asia/Kolkata'
                              }) : record.id ? `#${record.id}` : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Station:</span>
                            <p className="text-gray-900 font-medium">{record.station_name || 'Station not found'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Tanker No:</span>
                            <p className="text-gray-900">{record.tanker_no || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Weight Type:</span>
                            <p className="text-gray-900">{record.weight_type || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <p className="text-gray-900">{record.ltr || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Invoice Value:</span>
                            <p className="text-gray-900 font-semibold">₹{parseFloat(record.t_invoice_value || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">DNCN:</span>
                            <p className="text-gray-900">₹{parseFloat(record.dncn || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payable:</span>
                            <p className="text-green-600 font-semibold">₹{parseFloat(record.payable || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-500 text-base sm:text-lg">No invoice history found for this transporter</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function TransportersInvoiceHistoryPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TransportersInvoiceHistoryContent />
    </Suspense>
  );
}
