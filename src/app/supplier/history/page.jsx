'use client';

import { ArrowLeft, Download, Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import SupplierHeader from '@/components/supplierHeader';
import SupplierSidebar from '@/components/supplierSidebar';

function SupplierHistoryContent() {
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
  const [supplierId, setSupplierId] = useState(null);
  
  // ✅ Check supplier login and get ID
  useEffect(() => {
    const checkSupplier = () => {
      if (typeof window !== 'undefined') {
        const savedSupplier = localStorage.getItem('supplier');
        if (savedSupplier) {
          try {
            const supplierData = JSON.parse(savedSupplier);
            setSupplierId(supplierData.id);
            setSupplierName(supplierData.name || 'Supplier');
            fetchData(supplierData.id);
          } catch (e) {
            console.error('Error parsing supplier data:', e);
            router.push('/supplier/login');
          }
        } else {
          router.push('/supplier/login');
        }
      }
    };
    checkSupplier();
  }, [router]);

  useEffect(() => {
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    
    if (from_date || to_date) {
      setFilters({
        from_date: from_date || '',
        to_date: to_date || ''
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (supplierId) {
      fetchData(supplierId);
    }
  }, [searchParams, supplierId]);

  const fetchData = async (id) => {
    if (!id) return;

    try {
      setLoading(true);
      
      const params = new URLSearchParams({ id });
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const response = await fetch(`/api/supplierinvoice-history?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch data: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || []);
      if (result.supplierName) {
        setSupplierName(result.supplierName);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setData([]);
      // Show user-friendly error message
      if (error.message) {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    
    router.push(`/supplier/history?${params}`);
    setShowFilter(false);
  };

  const handleResetFilters = () => {
    setFilters({ from_date: '', to_date: '' });
    router.push('/supplier/history');
  };

  const handleDownload = () => {
    const exportData = getExportData();
    if (exportData.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Invoice#', 'Remarks', 'Type', 'Payment Date', 'Payment Amount', 'TDS Deduction', 'Debit', 'Credit', 'Balance'];
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => [
        row.date || '',
        row.invoice_number || '',
        (row.remarks || '-').replace(/,/g, ';'),
        row.type || '',
        row.payment_date || '',
        row.payment_amount || '',
        row.tds_deduction || '',
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
    link.setAttribute('download', `supplier-invoice-history-${supplierId}-${new Date().toISOString().split('T')[0]}.csv`);
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
          payment: p.payment,
          payment_date: p.date,
          payment_amount: p.payment,
          tds_deduction: p.tds_deduction || 0
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
    let totalTds = 0;
    let dueTds = 0;
    return transactions.map(t => {
      if (t.type === 'Purchase') {
        balance += parseFloat(t.v_invoice_value || 0);
      } else if (t.type === 'Payment') {
        const paymentAmount = parseFloat(t.payment || 0) || 0;
        const tdsAmount = parseFloat(t.tds_deduction || 0) || 0;
        balance -= (paymentAmount + tdsAmount);
        totalTds += tdsAmount;
        if (tdsAmount > 0) {
          dueTds += tdsAmount;
        }
      } else if (t.type === 'DNCN') {
        if (t.dncn_type === 1) {
          balance -= parseFloat(t.amount || 0);
        } else if (t.dncn_type === 2) {
          balance += parseFloat(t.amount || 0);
        }
      }
      const isPaid = balance <= 0;
      const displayBalance = isPaid ? 0 : balance;
      return { 
        ...t, 
        balance: displayBalance,
        isPaid,
        totalTds: totalTds,
        dueTds: dueTds
      };
    });
  };

  if (loading && !supplierId) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <SupplierSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <SupplierHeader />
          <main className="flex-1 px-4 py-6 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="flex-shrink-0">
        <SupplierSidebar />
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <SupplierHeader />
        </div>
        <main className="flex-1 overflow-auto bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-3">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push('/supplier/dashboard')}
                    className="text-green-600 hover:text-green-800 text-xl sm:text-2xl transition-colors"
                    title="Go Back"
                  >
                    ←
                  </button>
                  <div>
                    <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">
                      Transaction History
                    </h1>
                    {supplierName && (
                      <p className="text-gray-600 mt-1 text-sm sm:text-base">Supplier: {supplierName}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Apply Filters
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b">
                <h2 className="text-lg sm:text-xl font-semibold">Transaction History</h2>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading transactions...</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TDS Deduction</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.length === 0 ? (
                          <tr>
                            <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
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
                                payment: p.payment,
                                payment_date: p.date,
                                payment_amount: p.payment,
                                tds_deduction: p.tds_deduction || 0
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
                                      {transaction.payment_date ? new Date(transaction.payment_date).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {transaction.payment_amount ? (
                                        <span className="text-green-600 font-medium">
                                          ₹{parseFloat(transaction.payment_amount).toFixed(2)}
                                        </span>
                                      ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {transaction.type === 'Payment' && transaction.tds_deduction ? (
                                        <span className="text-orange-600 font-medium">
                                          ₹{parseFloat(transaction.tds_deduction).toFixed(2)}
                                        </span>
                                      ) : '-'}
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
                                  <td colSpan="10" className="h-4"></td>
                                </tr>
                              </tbody>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden divide-y divide-gray-200">
                    {data.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No transactions found
                      </div>
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
                            payment: p.payment,
                            payment_date: p.date,
                            payment_amount: p.payment,
                            tds_deduction: p.tds_deduction || 0
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
                        
                        return transactionsWithBalance.map((transaction, tIndex) => (
                          <div key={`${index}-${tIndex}`} className="p-4 space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                    transaction.type === 'Purchase' 
                                      ? 'bg-blue-100 text-blue-800'
                                      : transaction.type === 'Payment'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {transaction.type}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : '-'}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900">Invoice: {transaction.invoice_number}</p>
                                <p className="text-xs text-gray-600 mt-1">{transaction.remarks}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100">
                              {transaction.payment_date && (
                                <div>
                                  <span className="text-gray-600">Payment Date:</span>
                                  <p className="font-medium">{new Date(transaction.payment_date).toLocaleDateString('en-GB')}</p>
                                </div>
                              )}
                              {transaction.payment_amount && (
                                <div>
                                  <span className="text-gray-600">Payment:</span>
                                  <p className="font-medium text-green-600">₹{parseFloat(transaction.payment_amount).toFixed(2)}</p>
                                </div>
                              )}
                              {transaction.type === 'Payment' && transaction.tds_deduction && (
                                <div>
                                  <span className="text-gray-600">TDS:</span>
                                  <p className="font-medium text-orange-600">₹{parseFloat(transaction.tds_deduction).toFixed(2)}</p>
                                </div>
                              )}
                              {transaction.debit && (
                                <div>
                                  <span className="text-gray-600">Debit:</span>
                                  <p className="font-medium text-red-600">₹{parseFloat(transaction.debit).toFixed(2)}</p>
                                </div>
                              )}
                              {transaction.credit && (
                                <div>
                                  <span className="text-gray-600">Credit:</span>
                                  <p className="font-medium text-green-600">₹{parseFloat(transaction.credit).toFixed(2)}</p>
                                </div>
                              )}
                              <div className="col-span-2">
                                <span className="text-gray-600">Balance:</span>
                                <p className="font-bold text-gray-900">₹{parseFloat(transaction.balance || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ));
                      }).flat()
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SupplierHistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SupplierHistoryContent />
    </Suspense>
  );
}

