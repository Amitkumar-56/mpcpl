'use client';

import SupplierHeader from '@/components/supplierHeader';
import SupplierSidebar from '@/components/supplierSidebar';
import { Download, Filter, Calendar, FileText, X, CheckCircle, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useMemo } from 'react';

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

  // Correct balance calculation function
  const calculateInvoiceTransactions = (invoice) => {
    const transactions = [
      {
        date: invoice.invoice_date,
        invoice_number: invoice.invoice_number,
        remarks: 'Invoice Created',
        type: 'Purchase',
        payment_date: '',
        payment_amount: '',
        tds: '',
        debit: '',
        credit: invoice.v_invoice_value,
        v_invoice_value: invoice.v_invoice_value
      },
      ...(invoice.payments || []).map(p => ({
        date: p.date,
        invoice_number: invoice.invoice_number,
        remarks: p.remarks || 'Payment Received',
        type: 'Payment',
        payment_date: p.date,
        payment_amount: p.payment,
        tds: p.tds_deduction || 0,
        debit: p.payment, // Payment is debit for supplier
        credit: '',
        payment: p.payment,
        tds_deduction: p.tds_deduction || 0
      })),
      ...(invoice.dncns || []).map(d => ({
        date: d.dncn_date,
        invoice_number: invoice.invoice_number,
        remarks: d.remarks || (d.type === 1 ? 'Debit Note Issued' : 'Credit Note Issued'),
        type: d.type === 1 ? 'Debit Note' : 'Credit Note',
        payment_date: '',
        payment_amount: '',
        tds: '',
        debit: d.type === 1 ? d.amount : '', // Debit Note is debit
        credit: d.type === 2 ? d.amount : '', // Credit Note is credit
        dncn_type: d.type,
        amount: d.amount
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance correctly
    let balance = 0;
    const transactionsWithBalance = transactions.map(t => {
      // STARTING BALANCE calculation
      if (t.type === 'Purchase') {
        // Purchase (Credit) increases balance
        balance += parseFloat(t.credit || 0);
      } else if (t.type === 'Payment') {
        // Payment (Debit) decreases balance
        // Formula: balance = balance - (tds + debit)
        const tdsAmount = parseFloat(t.tds || 0) || 0;
        const debitAmount = parseFloat(t.debit || 0) || 0;
        balance = balance - (tdsAmount + debitAmount);
      } else if (t.type === 'Debit Note') {
        // Debit Note (Debit) decreases balance
        balance -= parseFloat(t.debit || 0);
      } else if (t.type === 'Credit Note') {
        // Credit Note (Credit) increases balance
        balance += parseFloat(t.credit || 0);
      }

      // Ensure balance doesn't go negative (if payment exceeds balance)
      balance = Math.max(0, balance);
      
      return {
        ...t,
        balance: balance,
        status: balance === 0 ? 'Paid' : 'Pending',
        displayBalance: balance === 0 ? '0.00' : balance.toFixed(2)
      };
    });

    return transactionsWithBalance;
  };

  // Get all transactions across all invoices
  const allTransactions = useMemo(() => {
    const allTrans = [];
    data.forEach(invoice => {
      const transactions = calculateInvoiceTransactions(invoice);
      allTrans.push(...transactions);
    });
    // Sort by date descending (newest first)
    return allTrans.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data]);

  const handleDownload = () => {
    if (allTransactions.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Invoice #', 'Remarks', 'Type', 'Payment Date', 'Payment Amt', 'TDS', 'Debit', 'Credit', 'Balance', 'Status'];
    const csvRows = [
      headers.join(','),
      ...allTransactions.map(row => [
        row.date ? new Date(row.date).toLocaleDateString('en-GB') : '',
        row.invoice_number || '',
        (row.remarks || '-').replace(/,/g, ';'),
        row.type || '',
        row.payment_date ? new Date(row.payment_date).toLocaleDateString('en-GB') : '',
        row.payment_amount || '',
        row.tds || '',
        row.debit || '',
        row.credit || '',
        row.displayBalance || '0.00',
        row.status || ''
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `supplier-history-${supplierName}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate summary
  const summaryData = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let totalTDS = 0;
    let totalPayment = 0;
    let totalBalance = 0;
    let paidInvoices = 0;
    let pendingInvoices = 0;

    // Calculate totals from all transactions
    allTransactions.forEach(transaction => {
      totalDebit += parseFloat(transaction.debit || 0);
      totalCredit += parseFloat(transaction.credit || 0);
      totalTDS += parseFloat(transaction.tds || 0);
      totalPayment += parseFloat(transaction.payment_amount || 0);
    });

    // Calculate final balance from each invoice
    data.forEach(invoice => {
      const transactions = calculateInvoiceTransactions(invoice);
      const lastTransaction = transactions[transactions.length - 1];
      totalBalance += lastTransaction?.balance || 0;
      
      if (lastTransaction?.balance === 0) {
        paidInvoices++;
      } else {
        pendingInvoices++;
      }
    });

    return {
      totalDebit,
      totalCredit,
      totalTDS,
      totalPayment,
      totalBalance,
      paidInvoices,
      pendingInvoices,
      totalInvoices: data.length
    };
  }, [data, allTransactions]);

  if (loading && !supplierId) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <SupplierSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <SupplierHeader />
          <main className="flex-1 p-4 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount || amount === '' || amount === 0) return '-';
    if (amount === '0.00') return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="hidden md:flex">
        <SupplierSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <SupplierHeader />

        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/supplier/dashboard')}
                    className="text-green-600 hover:text-green-800 text-xl"
                    title="Go Back"
                  >
                    ←
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
                </div>
                <p className="text-gray-600 mt-1">Supplier: {supplierName}</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download CSV</span>
                  <span className="sm:hidden">Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summaryData.totalBalance)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summaryData.pendingInvoices} pending invoices
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(summaryData.totalPayment)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summaryData.paidInvoices} paid invoices
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total TDS</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {formatCurrency(summaryData.totalTDS)}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Invoices Status</p>
                  <div className="flex items-center gap-4 mt-1">
                    <div>
                      <p className="text-lg font-bold text-green-600">{summaryData.paidInvoices}</p>
                      <p className="text-xs text-gray-500">Paid</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">{summaryData.pendingInvoices}</p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilter && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Filter Transactions</h3>
                <button
                  onClick={() => setShowFilter(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleFilterSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
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
                      <Calendar className="inline h-4 w-4 mr-1" />
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
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
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
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">All Transactions</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {allTransactions.length} transactions • {summaryData.totalInvoices} invoices
                    {filters.from_date && ` from ${filters.from_date}`}
                    {filters.to_date && ` to ${filters.to_date}`}
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading transactions...</p>
              </div>
            ) : allTransactions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No transactions found</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-3 text-green-600 hover:text-green-800"
                >
                  Clear filters to see all transactions
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <table className="w-full hidden md:table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Amt</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TDS</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allTransactions.map((transaction, index) => (
                      <tr 
                        key={index} 
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.invoice_number || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          {transaction.remarks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'Purchase' 
                              ? 'bg-blue-100 text-blue-800'
                              : transaction.type === 'Payment'
                              ? 'bg-green-100 text-green-800'
                              : transaction.type === 'Debit Note'
                              ? 'bg-red-100 text-red-800'
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
                              {formatCurrency(transaction.payment_amount)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.tds ? (
                            <span className="text-orange-600 font-medium">
                              {formatCurrency(transaction.tds)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.debit ? (
                            <span className="text-red-600 font-medium">
                              {formatCurrency(transaction.debit)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.credit ? (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(transaction.credit)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                          {transaction.balance === 0 ? (
                            <span className="text-green-600">₹0.00</span>
                          ) : (
                            <span className="text-red-600">
                              {formatCurrency(transaction.balance)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.balance === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-200">
                  {allTransactions.map((transaction, index) => (
                    <div key={index} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'Purchase' 
                                ? 'bg-blue-100 text-blue-800'
                                : transaction.type === 'Payment'
                                ? 'bg-green-100 text-green-800'
                                : transaction.type === 'Debit Note'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {transaction.type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : '-'}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900">{transaction.invoice_number || 'No Invoice'}</p>
                          <p className="text-sm text-gray-600 mt-1">{transaction.remarks}</p>
                        </div>
                        <div>
                          {transaction.balance === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-100">
                        {transaction.payment_date && (
                          <div>
                            <span className="text-gray-500">Payment Date:</span>
                            <p className="font-medium">
                              {new Date(transaction.payment_date).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                        )}
                        {transaction.payment_amount && (
                          <div>
                            <span className="text-gray-500">Payment Amt:</span>
                            <p className="font-medium text-green-600">
                              {formatCurrency(transaction.payment_amount)}
                            </p>
                          </div>
                        )}
                        {transaction.tds && (
                          <div>
                            <span className="text-gray-500">TDS:</span>
                            <p className="font-medium text-orange-600">
                              {formatCurrency(transaction.tds)}
                            </p>
                          </div>
                        )}
                        {transaction.debit && (
                          <div>
                            <span className="text-gray-500">Debit:</span>
                            <p className="font-medium text-red-600">
                              {formatCurrency(transaction.debit)}
                            </p>
                          </div>
                        )}
                        {transaction.credit && (
                          <div>
                            <span className="text-gray-500">Credit:</span>
                            <p className="font-medium text-green-600">
                              {formatCurrency(transaction.credit)}
                            </p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <div className={`flex justify-between items-center px-3 py-2 rounded-lg mt-2 ${
                            transaction.balance === 0 ? 'bg-green-50' : 'bg-red-50'
                          }`}>
                            <span className="text-gray-700 font-medium">Balance:</span>
                            <span className={`font-bold ${
                              transaction.balance === 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.balance === 0 ? '₹0.00' : formatCurrency(transaction.balance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Summary Footer */}
            {allTransactions.length > 0 && (
              <div className="px-4 md:px-6 py-4 border-t bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Balance</p>
                    <p className={`text-lg font-bold ${
                      summaryData.totalBalance === 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {summaryData.totalBalance === 0 ? '₹0.00' : formatCurrency(summaryData.totalBalance)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summaryData.pendingInvoices} invoices pending
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Paid</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(summaryData.totalPayment)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summaryData.paidInvoices} invoices paid
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total TDS</p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(summaryData.totalTDS)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SupplierHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    }>
      <SupplierHistoryContent />
    </Suspense>
  );
}