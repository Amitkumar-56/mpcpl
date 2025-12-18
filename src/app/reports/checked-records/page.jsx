
//src/app/reports/checked-records/page.jsx
'use client';

import ExportButton from '@/components/ExportButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function CheckedRecordsContent() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ totalQty: 0, totalAmount: 0, totalRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fetchCheckedRecords = async () => {
      try {
        setLoading(true);
        const checkedIds = searchParams.get('checked_ids');
        
        if (!checkedIds) {
          setError('No records selected.');
          setLoading(false);
          return;
        }

        // Get all search params
        const params = new URLSearchParams();
        params.append('checked_ids', checkedIds);
        
        const product = searchParams.get('product');
        const loading_station = searchParams.get('loading_station');
        const customer = searchParams.get('customer');
        const from_date = searchParams.get('from_date');
        const to_date = searchParams.get('to_date');
        
        if (product) params.append('product', product);
        if (loading_station) params.append('loading_station', loading_station);
        if (customer) params.append('customer', customer);
        if (from_date) params.append('from_date', from_date);
        if (to_date) params.append('to_date', to_date);

        const response = await fetch(`/api/reports/checked-records?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch records');
        }

        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setRecords(data.records);
          setSummary(data.summary);
        }
      } catch (err) {
        setError('Failed to load records');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckedRecords();
  }, [searchParams]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return 'text-yellow-600';
      case 'Cancelled': return 'text-red-600';
      case 'Processing': return 'text-blue-600';
      case 'Completed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <Link 
            href="/reports/filling-report"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link 
                href="/reports/filling-report"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center mr-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Report
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Checked Records ({summary.totalRecords})
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 border-l-4 border-blue-600 rounded-lg p-6 shadow-sm">
            <div className="text-sm font-medium text-gray-600 mb-2">Total Quantity</div>
            <div className="text-2xl font-bold text-blue-600">
              {summary.totalQty.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-gray-50 border-l-4 border-blue-600 rounded-lg p-6 shadow-sm">
            <div className="text-sm font-medium text-gray-600 mb-2">Total Amount</div>
            <div className="text-2xl font-bold text-blue-600">
              ₹{summary.totalAmount.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-gray-50 border-l-4 border-blue-600 rounded-lg p-6 shadow-sm">
            <div className="text-sm font-medium text-gray-600 mb-2">Total Records</div>
            <div className="text-2xl font-bold text-blue-600">
              {summary.totalRecords}
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Id</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loading Station</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created at</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.length > 0 ? (
                  records.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.rid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.product_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.station_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.vehicle_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.client_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.driver_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.aqty}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row.amount || '0.00'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(row.created)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.completed_date ? formatDate(row.completed_date) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          {['doc1', 'doc2', 'doc3'].map((doc) => (
                            <a
                              key={doc}
                              href={row[doc] || '/assets/img/4595376-200.png'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={row[doc] || '/assets/img/4595376-200.png'}
                                alt="Document"
                                className="w-12 h-12 object-cover rounded border"
                              />
                            </a>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={getStatusClass(row.status)}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="13" className="px-6 py-4 text-center text-sm text-gray-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// Loading fallback component
function CheckedRecordsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Main component with Suspense boundary
export default function CheckedRecords() {
  return (
    <Suspense fallback={<CheckedRecordsLoading />}>
      <CheckedRecordsContent />
    </Suspense>
  );
}