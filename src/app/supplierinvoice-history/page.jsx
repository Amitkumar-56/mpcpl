// app/supplierinvoice-history/page.jsx
'use client';

import { ArrowLeft, Download, Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function SupplierInvoiceHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: ''
  });
  const [showFilter, setShowFilter] = useState(false);
  
  const id = searchParams.get('id');

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [searchParams]);

  useEffect(() => {
    // Set initial filter values from URL
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    
    if (from_date || to_date) {
      setFilters({
        from_date: from_date || '',
        to_date: to_date || ''
      });
    }
  }, [searchParams]);

  const fetchData = async () => {
    if (!id) {
      router.back();
      return;
    }

    try {
      // No loading state - instant display
      
      const params = new URLSearchParams({ id });
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const response = await fetch(`/api/supplierinvoice-history?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data || []);
      setSupplierName(result.supplierName || '');
    } catch (error) {
      console.error('Error:', error);
      setData([]);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ id });
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    
    router.push(`/supplierinvoice-history?${params}`);
    setShowFilter(false);
  };

  const handleResetFilters = () => {
    setFilters({ from_date: '', to_date: '' });
    router.push(`/supplierinvoice-history?id=${id}`);
  };

  const handleDownload = () => {
    const exportData = getExportData();
    if (exportData.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Invoice#', 'Remarks', 'Type', 'Debit', 'Credit', 'Balance'];
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => [
        row.date || '',
        row.invoice_number || '',
        (row.remarks || '-').replace(/,/g, ';'),
        row.type || '',
        row.debit || '',
        row.credit || '',
        row.balance || 0
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `supplier-invoice-history-${id}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getExportData = () => {
    if (!data || data.length === 0) return [];
    
    return data.flatMap(invoice => {
      const transactions = [
        {
          date: invoice.invoice_date,
          invoice_number: invoice.invoice_number,
          remarks: '-',
          type: 'Purchase',
          debit: null,
          credit: invoice.v_invoice_value,
          v_invoice_value: invoice.v_invoice_value
        },
        ...invoice.payments.map(p => ({
          date: p.date,
          invoice_number: invoice.invoice_number,
          remarks: p.remarks,
          type: 'Payment',
          debit: p.payment,
          credit: null,
          payment: p.payment
        })),
        ...invoice.dncns.map(d => ({
          date: d.dncn_date,
          invoice_number: invoice.invoice_number,
          remarks: d.remarks,
          type: 'DNCN',
          debit: d.type === 1 ? d.amount : null,
          credit: d.type === 2 ? d.amount : null,
          dncn_type: d.type,
          amount: d.amount
        }))
      ];

      return calculateRunningBalance(transactions);
    });
  };


  const calculateRunningBalance = (transactions) => {
    let balance = 0;
    return transactions.map(t => {
      if (t.type === 'Purchase') {
        balance += parseFloat(t.v_invoice_value || 0);
      } else if (t.type === 'Payment') {
        balance -= parseFloat(t.payment || 0);
      } else if (t.type === 'DNCN') {
        if (t.dncn_type === 1) { // Debit
          balance -= parseFloat(t.amount || 0);
        } else if (t.dncn_type === 2) { // Credit
          balance += parseFloat(t.amount || 0);
        }
      }
      return { ...t, balance };
    });
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
                  {supplierName} Supplier Invoice History
                </h1>
                <nav className="flex space-x-2 text-sm text-gray-600 mt-1">
                  <a href="/" className="hover:text-blue-600">Home</a>
                  <span>/</span>
                  <span>Supplier Invoice History</span>
                </nav>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
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
        {/* Filter Panel */}
        {showFilter && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Filter Transactions</h3>
            <form onSubmit={handleFilterSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.from_date}
                    onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.to_date}
                    onChange={(e) => setFilters({...filters, to_date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Invoice Transaction History</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  data.map((invoice, index) => {
                    const transactions = [
                      {
                        date: invoice.invoice_date,
                        invoice_number: invoice.invoice_number,
                        remarks: '-',
                        type: 'Purchase',
                        debit: null,
                        credit: invoice.v_invoice_value,
                        v_invoice_value: invoice.v_invoice_value
                      },
                      ...invoice.payments.map(p => ({
                        date: p.date,
                        invoice_number: invoice.invoice_number,
                        remarks: p.remarks,
                        type: 'Payment',
                        debit: p.payment,
                        credit: null,
                        payment: p.payment
                      })),
                      ...invoice.dncns.map(d => ({
                        date: d.dncn_date,
                        invoice_number: invoice.invoice_number,
                        remarks: d.remarks,
                        type: 'DNCN',
                        debit: d.type === 1 ? d.amount : null,
                        credit: d.type === 2 ? d.amount : null,
                        dncn_type: d.type,
                        amount: d.amount
                      }))
                    ];

                    const transactionsWithBalance = calculateRunningBalance(transactions);
                    
                    return (
                      <tbody key={`invoice-${index}`} className="bg-gray-50">
                        {transactionsWithBalance.map((transaction, tIndex) => (
                          <tr key={`${index}-${tIndex}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.invoice_number}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {transaction.remarks}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                transaction.type === 'Purchase' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : transaction.type === 'Payment'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {transaction.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.debit ? (
                                <span className="text-red-600 font-medium">
                                  ₹{parseFloat(transaction.debit).toFixed(2)}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.credit ? (
                                <span className="text-green-600 font-medium">
                                  ₹{parseFloat(transaction.credit).toFixed(2)}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ₹{parseFloat(transaction.balance || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-white">
                          <td colSpan="7" className="h-4"></td>
                        </tr>
                      </tbody>
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

export default function SupplierInvoiceHistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SupplierInvoiceHistoryContent />
    </Suspense>
  );
}
