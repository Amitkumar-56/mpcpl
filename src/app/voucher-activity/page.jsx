'use client';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { FaArrowLeft, FaCalendar, FaChartLine, FaDownload, FaEye, FaFileInvoice, FaSearch, FaUser } from 'react-icons/fa';

// Loading Component for Suspense fallback
function VoucherActivityLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-400">
                <FaArrowLeft className="w-5 h-5 mr-2" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center">
                <FaChartLine className="w-6 h-6 text-blue-300 mr-2" />
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FaFileInvoice className="w-6 h-6 text-gray-300" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex items-center space-x-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Search Bar Skeleton */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <FaSearch className="w-5 h-5 text-gray-300 mr-3" />
              <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Voucher ID', 'Voucher No', 'Vehicle No', 'Prepared By', 'Approved By', 'Created Date', 'Activities'].map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row}>
                    {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                      <td key={col} className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component Content
function VoucherActivityContent() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalVouchers: 0,
    activeVouchers: 0,
    totalActivities: 0
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    limit: 10,
    has_next: false,
    has_prev: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVouchers, setFilteredVouchers] = useState([]);

  useEffect(() => {
    fetchVoucherActivity();
  }, []);

  useEffect(() => {
    // Filter vouchers based on search query
    if (!searchQuery.trim()) {
      setFilteredVouchers(vouchers);
    } else {
      const filtered = vouchers.filter(voucher => {
        const query = searchQuery.toLowerCase();
        return (
          (voucher.voucher_no && voucher.voucher_no.toLowerCase().includes(query)) ||
          (voucher.vehicle_no && voucher.vehicle_no.toLowerCase().includes(query)) ||
          (voucher.prepared_by_name && voucher.prepared_by_name.toLowerCase().includes(query)) ||
          (voucher.approved_by_name && voucher.approved_by_name.toLowerCase().includes(query))
        );
      });
      setFilteredVouchers(filtered);
    }
  }, [vouchers, searchQuery]);

  const fetchVoucherActivity = async (page = pagination.current_page, limit = pagination.limit) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/voucher-activity-summary?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch voucher activity data');
      }
      const data = await response.json();
      setVouchers(data.vouchers || []);
      setStats(data.stats || stats);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching voucher activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchVoucherActivity(newPage, pagination.limit);
    }
  };

  const handleLimitChange = (newLimit) => {
    const newPage = 1; // Reset to first page when changing limit
    fetchVoucherActivity(newPage, newLimit);
  };

  const handleDownloadPDF = async () => {
    try {
      // Dynamically import html2pdf only on client side
      const html2pdf = (await import('html2pdf.js')).default;

      // Get all voucher data for PDF generation
      const response = await fetch('/api/voucher-activity-summary?page=1&limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch data for PDF');
      }
      const data = await response.json();

      // Create PDF content element
      const pdfContent = createPDFContent(data.vouchers || [], data.stats || stats);

      // Configure PDF options
      const options = {
        margin: [10, 10, 10, 10],
        filename: `voucher-activity-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape'
        }
      };

      // Generate and download PDF
      await html2pdf().set(options).from(pdfContent).save();

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const createPDFContent = (voucherData, statsData) => {
    const currentDate = new Date().toLocaleDateString('en-IN');

    // Create a temporary div for PDF content
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px;">VOUCHER ACTIVITY REPORT</h1>
          <p style="margin: 5px 0; color: #666;">Generated on: ${currentDate}</p>
        </div>

        <!-- Statistics -->
        <div style="display: flex; justify-content: space-around; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${statsData.totalVouchers || 0}</div>
            <div style="color: #666; font-size: 14px;">Total Vouchers</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${statsData.activeVouchers || 0}</div>
            <div style="color: #666; font-size: 14px;">Active Vouchers</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${statsData.totalActivities || 0}</div>
            <div style="color: #666; font-size: 14px;">Total Activities</div>
          </div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">ID</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Voucher No</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Vehicle</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Prepared By</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Approved By</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Created Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Activities</th>
            </tr>
          </thead>
          <tbody>
            ${voucherData.map((voucher, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
                <td style="border: 1px solid #ddd; padding: 6px;">${voucher.voucher_id}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${voucher.voucher_no || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${voucher.vehicle_no || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${voucher.prepared_by_name || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${voucher.approved_by_name || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${voucher.created_at ? new Date(voucher.created_at).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${voucher.activity_count || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Footer -->
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
          <p>This report contains ${voucherData.length} voucher records.</p>
          <p>Report generated by MPCPL Management System</p>
        </div>
      </div>
    `;

    return contentDiv;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return <VoucherActivityLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchVoucherActivity}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <FaArrowLeft className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
              <div className="flex items-center">
                <FaChartLine className="w-6 h-6 text-blue-600 mr-2" />
                <h1 className="text-xl font-semibold text-gray-900">Voucher Activity Summary</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <FaDownload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
              <Link
                href="/voucher-wallet-driver"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <FaFileInvoice className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">View Vouchers</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaFileInvoice className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vouchers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalVouchers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaEye className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Vouchers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeVouchers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FaChartLine className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActivities}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Voucher Activity Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Voucher Activity Details</h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {searchQuery
                    ? `Found ${filteredVouchers.length} of ${pagination.total_records} vouchers`
                    : `Page ${pagination.current_page} of ${pagination.total_pages} (${pagination.total_records} total vouchers)`
                  }
                </span>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <FaSearch className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="text"
                placeholder="Search by Voucher No, Vehicle No, Prepared By, or Approved By..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voucher ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voucher No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prepared By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activities
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      {searchQuery ? `No vouchers found matching "${searchQuery}"` : 'No voucher activity found'}
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((voucher) => (
                    <tr key={voucher.voucher_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {voucher.voucher_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voucher.voucher_no || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voucher.vehicle_no || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <FaUser className="w-4 h-4 text-gray-400 mr-2" />
                          {voucher.prepared_by_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <FaUser className="w-4 h-4 text-gray-400 mr-2" />
                          {voucher.approved_by_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <FaCalendar className="w-4 h-4 text-gray-400 mr-2" />
                          {formatDate(voucher.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {voucher.activity_count || 0} activities
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.current_page - 1) * pagination.limit) + 1} to {Math.min(pagination.current_page * pagination.limit, pagination.total_records)} of {pagination.total_records} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={!pagination.has_prev}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={!pagination.has_prev}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Previous
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.total_pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.current_page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.current_page >= pagination.total_pages - 2) {
                        pageNum = pagination.total_pages - 4 + i;
                      } else {
                        pageNum = pagination.current_page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            pageNum === pagination.current_page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={!pagination.has_next}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.total_pages)}
                    disabled={!pagination.has_next}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Export with Suspense
export default function VoucherActivityPage() {
  return (
    <Suspense fallback={<VoucherActivityLoading />}>
      <VoucherActivityContent />
    </Suspense>
  );
}