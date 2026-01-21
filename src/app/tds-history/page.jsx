// app/tds-history/page.jsx
'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import { ArrowLeft, Building, Calendar, Download, FileText, Filter, IndianRupee, Receipt, RefreshCw, Search, Users, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

function TDSHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false
  });
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    supplier_name: ''
  });
  const [showFilter, setShowFilter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState([]);
  const [totals, setTotals] = useState({
    overall_tds: 0,
    total_entries: 0,
    total_suppliers: 0
  });

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
      fetchData();
      return;
    }

    // Check cached permissions
    const moduleName = 'TDS History';
    if (user.permissions && user.permissions[moduleName]) {
      const tdsPerms = user.permissions[moduleName];
      if (tdsPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: tdsPerms.can_view,
          can_edit: tdsPerms.can_edit || false
        });
        fetchData();
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
        fetchData();
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
        fetchData();
      } else {
        setHasPermission(false);
        setPermissions({ can_view: false, can_edit: false });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setPermissions({ can_view: false, can_edit: false });
    }
  }, [user]);

  useEffect(() => {
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const supplier_name = searchParams.get('supplier_name');
    
    if (from_date || to_date || supplier_name) {
      setFilters({
        from_date: from_date || '',
        to_date: to_date || '',
        supplier_name: supplier_name || ''
      });
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      if (filters.supplier_name) params.append('supplier_name', filters.supplier_name);

      const response = await fetch(`/api/tds-history?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch TDS data');
      }

      const result = await response.json();
      setData(result.data || []);
      setSummary(result.summary || []);
      setTotals(result.totals || {
        overall_tds: 0,
        total_entries: 0,
        total_suppliers: 0
      });
    } catch (error) {
      console.error('Error:', error);
      setData([]);
      setSummary([]);
      setTotals({
        overall_tds: 0,
        total_entries: 0,
        total_suppliers: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.supplier_name) params.append('supplier_name', filters.supplier_name);
    
    router.push(`/tds-history?${params}`);
    setShowFilter(false);
  };

  const handleResetFilters = () => {
    setFilters({ from_date: '', to_date: '', supplier_name: '' });
    router.push('/tds-history');
  };

  const handleDownload = () => {
    downloadTdsCSV();
  };

  const downloadTdsCSV = () => {
    if (data.length === 0) {
      alert('No TDS data to export');
      return;
    }

    // Create CSV content
    const headers = ['Supplier ID', 'Supplier Name', 'Invoice Number', 'Invoice Date', 'Payment Date', 'TDS Amount', 'Remarks', 'Type', 'Payment Amount', 'Invoice Value'];
    
    // Detailed data
    const detailedRows = data.map(item => [
      item.supplier_id || '',
      item.supplier_name || '',
      item.invoice_number || '',
      item.invoice_date ? new Date(item.invoice_date).toLocaleDateString('en-GB') : '',
      item.payment_date ? new Date(item.payment_date).toLocaleDateString('en-GB') : '',
      item.tds_amount || 0,
      (item.remarks || '').replace(/,/g, ';'),
      item.type === 1 ? 'Payment' : 'Other',
      item.payment || 0,
      item.v_invoice_value || 0
    ]);

    // Summary data
    const summaryHeaders = ['Supplier Name', 'Total TDS', 'Total Entries'];
    const summaryRows = summary.map(s => [
      s.supplier_name,
      s.total_tds,
      s.entries
    ]);

    // Combine all data
    const csvContent = [
      'DETAILED TDS HISTORY',
      headers.join(','),
      ...detailedRows.map(row => row.join(',')),
      '',
      '',
      'TDS SUMMARY BY SUPPLIER',
      summaryHeaders.join(','),
      ...summaryRows.map(row => row.join(',')),
      '',
      `"Grand Total TDS",${totals.overall_tds.toFixed(2)}`,
      `"Total Suppliers",${totals.total_suppliers}`,
      `"Total Entries",${totals.total_entries}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tds-history-all-suppliers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigateToSupplierHistory = (supplierId, supplierName) => {
    router.push(`/supplierinvoice-history?id=${supplierId}`);
  };

  // Memoized data for better performance
  const filteredData = useMemo(() => {
    if (!filters.supplier_name || filters.supplier_name.trim() === '') {
      return data;
    }
    
    const searchTerm = filters.supplier_name.toLowerCase();
    return data.filter(item => 
      item.supplier_name?.toLowerCase().includes(searchTerm) ||
      item.invoice_number?.toLowerCase().includes(searchTerm)
    );
  }, [data, filters.supplier_name]);

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
                <p className="text-red-600">You do not have permission to view TDS history.</p>
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
                    onClick={() => router.push('/')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                      TDS History - All Suppliers
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">
                      Track all TDS deductions across suppliers
                    </p>
                    <nav className="flex space-x-2 text-sm text-gray-600 mt-1">
                      <a href="/" className="hover:text-blue-600">Home</a>
                      <span>/</span>
                      <span>TDS History</span>
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
                    disabled={data.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Download Report</span>
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
                  <h3 className="text-lg font-semibold text-gray-900">Filter TDS History</h3>
                  <button
                    onClick={() => setShowFilter(false)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <form onSubmit={handleFilterSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Supplier/Invoice
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={filters.supplier_name}
                          onChange={(e) => setFilters({...filters, supplier_name: e.target.value})}
                          placeholder="Supplier name or invoice #"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                        />
                      </div>
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

            {/* Summary Cards */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <IndianRupee className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total TDS</p>
                    <p className="text-2xl font-bold text-purple-700">
                      ₹{totals.overall_tds.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Suppliers</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {totals.total_suppliers}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Receipt className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Entries</p>
                    <p className="text-2xl font-bold text-green-700">
                      {totals.total_entries}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Date Range</p>
                    <p className="text-lg font-semibold text-amber-700">
                      {filters.from_date || 'Start'} - {filters.to_date || 'End'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading TDS history...</p>
              </div>
            )}

            {/* No Data State */}
            {!loading && data.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No TDS Records Found</h3>
                <p className="text-gray-500 mb-4">No TDS deductions recorded for the selected filters.</p>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            )}

            {/* Summary Table */}
            {!loading && summary.length > 0 && !isMobile && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="px-4 sm:px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">TDS Summary by Supplier</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Top suppliers by TDS deductions
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                    {summary.length} suppliers
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Supplier Name
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Total Entries
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Total TDS
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Avg TDS per Entry
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summary.map((supplier, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Building className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {supplier.supplier_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Supplier ID: {supplier.supplier_id || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {supplier.entries} entries
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-purple-700">
                              ₹{supplier.total_tds.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {((supplier.total_tds / totals.overall_tds) * 100).toFixed(1)}% of total
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ₹{(supplier.total_tds / supplier.entries).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => supplier.supplier_id && navigateToSupplierHistory(supplier.supplier_id, supplier.supplier_name)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                              disabled={!supplier.supplier_id}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Detailed TDS Table - Desktop View */}
            {!loading && filteredData.length > 0 && !isMobile && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Detailed TDS History</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Showing {filteredData.length} of {data.length} entries
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                    {filteredData.length} entries
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Supplier
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Invoice #
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Invoice Date
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Payment Date
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Remarks
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Type
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          TDS Amount
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredData.map((tds, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Building className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {tds.supplier_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {tds.supplier_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {tds.invoice_number || '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tds.invoice_date ? new Date(tds.invoice_date).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tds.payment_date ? new Date(tds.payment_date).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <div className="truncate" title={tds.remarks}>
                              {tds.remarks || '-'}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              tds.type === 1
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-green-100 text-green-800 border border-green-200'
                            }`}>
                              {tds.type === 1 ? 'Payment' : 'Other'}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="text-purple-700 font-medium bg-purple-50 px-3 py-1 rounded-lg">
                              ₹{parseFloat(tds.tds_amount || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => navigateToSupplierHistory(tds.supplier_id, tds.supplier_name)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              View Supplier
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mobile View */}
            {!loading && filteredData.length > 0 && isMobile && (
              <div className="space-y-4">
                {/* Summary Mobile */}
                {summary.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Suppliers</h2>
                    <div className="space-y-3">
                      {summary.slice(0, 5).map((supplier, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{supplier.supplier_name}</p>
                            <p className="text-sm text-gray-500">{supplier.entries} entries</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-purple-700">₹{supplier.total_tds.toFixed(2)}</p>
                            <button
                              onClick={() => supplier.supplier_id && navigateToSupplierHistory(supplier.supplier_id, supplier.supplier_name)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                              disabled={!supplier.supplier_id}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Mobile */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">TDS Entries</h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {filteredData.length} entries
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {filteredData.slice(0, 10).map((tds, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{tds.supplier_name}</p>
                            <p className="text-sm text-gray-500">{tds.invoice_number || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-purple-700">
                              ₹{parseFloat(tds.tds_amount || 0).toFixed(2)}
                            </p>
                            <span className={`inline-block px-2 py-1 rounded text-xs ${
                              tds.type === 1
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {tds.type === 1 ? 'Payment' : 'Other'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Invoice Date</p>
                            <p className="text-gray-900">
                              {tds.invoice_date ? new Date(tds.invoice_date).toLocaleDateString('en-GB') : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Payment Date</p>
                            <p className="text-gray-900">
                              {tds.payment_date ? new Date(tds.payment_date).toLocaleDateString('en-GB') : '-'}
                            </p>
                          </div>
                          {tds.remarks && (
                            <div className="col-span-2">
                              <p className="text-gray-500 text-xs">Remarks</p>
                              <p className="text-gray-900">{tds.remarks}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3">
                          <button
                            onClick={() => navigateToSupplierHistory(tds.supplier_id, tds.supplier_name)}
                            className="w-full text-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors"
                          >
                            View Supplier History
                          </button>
                        </div>
                      </div>
                    ))}
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

export default function TDSHistoryPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading page...</p>
        </div>
      </div>
    }>
      <TDSHistoryContent />
    </Suspense>
  );
}