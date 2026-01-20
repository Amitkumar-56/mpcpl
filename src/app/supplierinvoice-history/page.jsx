// app/supplierinvoice-history/page.jsx
'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import { ArrowLeft, Download, FileText, Filter, RefreshCw, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

function SupplierInvoiceHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false
  });
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: ''
  });
  const [showFilter, setShowFilter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const id = searchParams.get('id');

  // Check screen size for responsiveness
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ Check permissions
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      checkPermissions();
    }
  }, [user, authLoading, router]);

  const checkPermissions = useCallback(async () => {
    if (!user || !user.id) {
      setHasPermission(false);
      return;
    }

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true });
      if (id) fetchData();
      return;
    }

    // Check cached permissions
    const moduleName = 'Supplier Invoice';
    if (user.permissions && user.permissions[moduleName]) {
      const invoicePerms = user.permissions[moduleName];
      if (invoicePerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: invoicePerms.can_view,
          can_edit: invoicePerms.can_edit || false
        });
        if (id) fetchData();
        return;
      } else {
        setHasPermission(false);
        setPermissions({ can_view: false, can_edit: false });
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_${moduleName}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        if (id) fetchData();
        return;
      } else {
        setHasPermission(false);
        setPermissions({ can_view: false, can_edit: false });
        return;
      }
    }

    try {
      const [viewRes, editRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`)
      ]);

      const [viewData, editData] = await Promise.all([
        viewRes.json(),
        editRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed || false,
        can_edit: editData.allowed || false
      };

      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        if (id) fetchData();
      } else {
        setHasPermission(false);
        setPermissions({ can_view: false, can_edit: false });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setPermissions({ can_view: false, can_edit: false });
    }
  }, [user, id]);

  useEffect(() => {
    if (id && hasPermission && !authLoading) {
      fetchData();
    }
  }, [searchParams, hasPermission, authLoading]);

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
      setLoading(true);
      
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
    } finally {
      setLoading(false);
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
      return { ...t, balance: balance.toFixed(2) };
    });
  };

  // Memoized transactions data for better performance
  const processedData = useMemo(() => {
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
          v_invoice_value: invoice.v_invoice_value,
          payment_date: null,
          payment_amount: null,
          tds_deduction: null
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
          amount: d.amount,
          payment_date: null,
          payment_amount: null,
          tds_deduction: null
        }))
      ];

      return calculateRunningBalance(transactions);
    });
  }, [data]);

  // ✅ Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden">
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ✅ Redirect if user is not authenticated
  if (!user) {
    return null; // Will redirect via useEffect
  }

  // ✅ Show access denied if no permission
  if (!hasPermission) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="h-full flex items-center justify-center p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl">
                <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
                <p className="text-red-600">You do not have permission to view supplier invoice history.</p>
                <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen z-30">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 pl-16 md:pl-64 overflow-hidden">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-16 md:left-64 z-20">
          <Header />
        </div>

        {/* Fixed Footer */}
        <div className="fixed bottom-0 right-0 left-16 md:left-64 z-20">
          <Footer />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-auto pt-16 pb-16 bg-gray-50 mt-16 mb-16">
          {/* Header Section */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                      Supplier Invoice History
                    </h1>
                    {supplierName && (
                      <p className="text-gray-600 mt-1 text-sm sm:text-base">
                        Supplier: <span className="font-medium">{supplierName}</span>
                      </p>
                    )}
                    <nav className="flex space-x-2 text-sm text-gray-600 mt-1">
                      <a href="/" className="hover:text-blue-600">Home</a>
                      <span>/</span>
                      <span>Supplier Invoice History</span>
                    </nav>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className={`flex items-center px-3 py-2 sm:px-4 sm:py-2 border rounded-lg text-sm sm:text-base transition-colors ${
                      showFilter 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Filter</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base transition-colors"
                    disabled={processedData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Download CSV</span>
                    <span className="sm:hidden">Download</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {/* Filter Panel */}
            {showFilter && (
              <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Filter Transactions</h3>
                  <button
                    onClick={() => setShowFilter(false)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <form onSubmit={handleFilterSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={filters.from_date}
                        onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base transition-colors"
                    >
                      Reset Filters
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            )}

            {/* No Data State */}
            {!loading && processedData.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Transactions Found</h3>
                <p className="text-gray-500 mb-4">No transactions available for this supplier.</p>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            )}

            {/* Transactions Table - Desktop View */}
            {!loading && processedData.length > 0 && !isMobile && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Transaction History</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Showing all transactions for {supplierName}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                    {processedData.length} transactions
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Date
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Invoice #
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Remarks
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Type
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Payment Date
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Payment Amt
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          TDS
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Debit
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Credit
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    
                    <tbody className="bg-white divide-y divide-gray-200">
                      {processedData.map((transaction, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {transaction.invoice_number}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <div className="truncate" title={transaction.remarks}>
                              {transaction.remarks}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              transaction.type === 'Purchase' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : transaction.type === 'Payment'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.payment_date ? new Date(transaction.payment_date).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.payment_amount ? (
                              <span className="text-green-700 font-medium bg-green-50 px-2 py-1 rounded">
                                ₹{parseFloat(transaction.payment_amount).toFixed(2)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.tds_deduction && parseFloat(transaction.tds_deduction) > 0 ? (
                              <span className="text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded">
                                ₹{parseFloat(transaction.tds_deduction).toFixed(2)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.debit ? (
                              <span className="text-red-700 font-medium bg-red-50 px-2 py-1 rounded">
                                ₹{parseFloat(transaction.debit).toFixed(2)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.credit ? (
                              <span className="text-green-700 font-medium bg-green-50 px-2 py-1 rounded">
                                ₹{parseFloat(transaction.credit).toFixed(2)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold px-3 py-1 rounded ${
                              parseFloat(transaction.balance) > 0 
                                ? 'text-red-700 bg-red-50' 
                                : parseFloat(transaction.balance) < 0
                                ? 'text-green-700 bg-green-50'
                                : 'text-gray-700 bg-gray-50'
                            }`}>
                              ₹{parseFloat(transaction.balance || 0).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mobile View */}
            {!loading && processedData.length > 0 && isMobile && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {processedData.length} items
                    </span>
                  </div>
                </div>
                
                {processedData.map((transaction, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'Purchase' 
                            ? 'bg-blue-100 text-blue-800'
                            : transaction.type === 'Payment'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {transaction.type}
                        </span>
                        <p className="text-sm text-gray-900 mt-1 font-medium">
                          {transaction.invoice_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : '-'}
                        </p>
                        <p className={`text-lg font-semibold mt-1 ${
                          parseFloat(transaction.balance) > 0 
                            ? 'text-red-700' 
                            : parseFloat(transaction.balance) < 0
                            ? 'text-green-700'
                            : 'text-gray-700'
                        }`}>
                          ₹{parseFloat(transaction.balance || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Remarks</p>
                        <p className="text-gray-900">{transaction.remarks}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-gray-500 text-xs">Debit</p>
                          <p className="text-red-700 font-medium">
                            {transaction.debit ? `₹${parseFloat(transaction.debit).toFixed(2)}` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Credit</p>
                          <p className="text-green-700 font-medium">
                            {transaction.credit ? `₹${parseFloat(transaction.credit).toFixed(2)}` : '-'}
                          </p>
                        </div>
                        {transaction.payment_date && (
                          <div>
                            <p className="text-gray-500 text-xs">Payment Date</p>
                            <p className="text-gray-900">
                              {new Date(transaction.payment_date).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                        )}
                        {transaction.payment_amount && (
                          <div>
                            <p className="text-gray-500 text-xs">Payment</p>
                            <p className="text-blue-700 font-medium">
                              ₹{parseFloat(transaction.payment_amount).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SupplierInvoiceHistoryPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading page...</p>
        </div>
      </div>
    }>
      <SupplierInvoiceHistoryContent />
    </Suspense>
  );
}