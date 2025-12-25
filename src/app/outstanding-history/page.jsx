'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';

function OutstandingHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOutstandingInvoices();
  }, [showPendingOnly]);

  const fetchOutstandingInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/outstanding-history');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      // Filter out invoices with payment = 0 and DNCN = 0
      let filtered = result.data || [];
      
      // Filter based on pending only toggle
      if (showPendingOnly) {
        filtered = filtered.filter(inv => {
          const payable = parseFloat(inv.payable || 0);
          const payment = parseFloat(inv.payment || 0);
          return payable > 0 && payment < payable; // Has outstanding amount
        });
      }

      // Filter out payment = 0 and DNCN = 0
      filtered = filtered.filter(inv => {
        const payment = parseFloat(inv.payment || 0);
        const dncn = parseFloat(inv.dncn || 0);
        return !(payment === 0 && dncn === 0);
      });

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.supplier_name?.toLowerCase().includes(searchLower) ||
          inv.product_name?.toLowerCase().includes(searchLower) ||
          inv.station_name?.toLowerCase().includes(searchLower) ||
          inv.invoice_number?.toLowerCase().includes(searchLower)
        );
      }

      setData(filtered);
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
      setData([]);
      // Don't show alert, just log the error
    } finally {
      setLoading(false);
    }
  };

  const calculateOverdueDays = (invoiceDate) => {
    if (!invoiceDate) return 0;
    const date = new Date(invoiceDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleDownload = () => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['#', 'Supplier', 'Product', 'Station', 'Transporter', 'Invoice Date', 'Invoice#', 'Invoice Value', 'DNCN', 'Payable', 'Status', 'Overdue'];
    const csvRows = [
      headers.join(','),
      ...data.map((row, index) => [
        index + 1,
        row.supplier_name || '',
        row.product_name || '',
        row.station_name || '',
        row.transporter_name || 'No Transporter',
        row.invoice_date || '',
        row.invoice_number || '',
        row.v_invoice_value || 0,
        row.dncn || 0,
        row.payable || 0,
        row.status || 'Pending',
        calculateOverdueDays(row.invoice_date) + ' days overdue'
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `outstanding-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0';
    return parseFloat(amount).toLocaleString('en-IN');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Outstanding Invoices History
                </h1>
                <nav className="flex space-x-2 text-sm text-gray-600 mt-1">
                  <a href="/" className="hover:text-blue-600">Home</a>
                  <span>/</span>
                  <span>Outstanding History</span>
                </nav>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownload}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPendingOnly(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showPendingOnly
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Show Pending Only
              </button>
              <button
                onClick={() => setShowPendingOnly(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !showPendingOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Show All Invoices
              </button>
            </div>
            <div className="w-full md:w-auto">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Station
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice#
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DNCN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overdue
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-6 py-8 text-center text-gray-500">
                      No outstanding invoices found
                    </td>
                  </tr>
                ) : (
                  data.map((invoice, index) => {
                    const overdueDays = calculateOverdueDays(invoice.invoice_date);
                    const payable = parseFloat(invoice.payable || 0);
                    const payment = parseFloat(invoice.payment || 0);
                    const isPending = payment < payable;
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invoice.supplier_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invoice.product_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invoice.station_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invoice.transporter_name || 'No Transporter'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                          <a href={`/supplierinvoice-history?id=${invoice.supplier_id}`} className="hover:underline">
                            {invoice.invoice_number || 'N/A'}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.v_invoice_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.dncn)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.payable)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            isPending
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isPending ? 'Pending' : 'Paid'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {overdueDays > 0 ? (
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {overdueDays} days overdue
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OutstandingHistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OutstandingHistoryContent />
    </Suspense>
  );
}


