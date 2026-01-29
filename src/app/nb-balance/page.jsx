'use client';

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BiTransferAlt } from 'react-icons/bi';
import {
  FiArrowLeft,
  FiCalendar,
  FiDollarSign,
  FiEdit2,
  FiMessageSquare,
  FiUser
} from 'react-icons/fi';

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="animate-pulse">
              <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-48 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Total Cash Card Skeleton */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="animate-pulse">
              <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 w-64 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

// Async function to fetch cash data
async function fetchCashData(page = 1) {
  try {
    const response = await fetch(`/api/nb-balance?page=${page}&limit=10`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch data');
    }
    return result.data;
  } catch (error) {
    console.error('Error fetching cash data:', error);
    throw error;
  }
}

// Async function to fetch total cash
async function fetchTotalCash() {
  try {
    const response = await fetch('/api/nb-balance/total', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch total cash');
    }
    return result.data.totalCash;
  } catch (error) {
    console.error('Error fetching total cash:', error);
    return 0;
  }
}

// Table component
function CashHistoryTable({ onEditClick }) {
  const [cashData, setCashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadCashData();
  }, [currentPage]);

  const loadCashData = async () => {
    setLoading(true);
    try {
      const data = await fetchCashData(currentPage);
      setCashData(data);
    } catch (error) {
      console.error('Failed to load cash data:', error);
      // Set empty data to prevent crash
      setCashData({
        cashHistory: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!cashData || !cashData.cashHistory) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Format currency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Payment type badge styling
  const getPaymentTypeBadge = (type) => {
    const styles = {
      Cash: 'bg-green-100 text-green-800',
      RTGS: 'bg-blue-100 text-blue-800',
      NEFT: 'bg-purple-100 text-purple-800',
      UPI: 'bg-yellow-100 text-yellow-800',
      CHEQUE: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= cashData.pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <FiUser className="mr-2" />
                  Customer Name
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <FiDollarSign className="mr-2" />
                  Amount
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <FiCalendar className="mr-2" />
                  Payment Date
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <BiTransferAlt className="mr-2" />
                  Payment Type
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <FiMessageSquare className="mr-2" />
                  Remark
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <BiTransferAlt className="mr-2" />
                  Type
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cashData.cashHistory.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No cash records found.
                </td>
              </tr>
            ) : (
              cashData.cashHistory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.name || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(record.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {record.payment_date ? new Date(record.payment_date).toLocaleDateString('en-IN') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentTypeBadge(record.payment_type)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {record.comments || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Type कॉलम - यहां सभी transactions Inward हैं */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Inward
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onEditClick(record)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      <FiEdit2 className="mr-2" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {cashData.cashHistory.length > 0 && cashData.pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {cashData.pagination.currentPage} of {cashData.pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(cashData.pagination.currentPage - 1)}
              disabled={cashData.pagination.currentPage === 1}
              className="px-3 py-1 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(cashData.pagination.currentPage + 1)}
              disabled={cashData.pagination.currentPage === cashData.pagination.totalPages}
              className="px-3 py-1 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Main component
export default function NBBalancePage() {
  const router = useRouter();
  const [totalCash, setTotalCash] = useState(0);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: '',
    comments: '',
    payment_type: 'Cash'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch total cash balance
  useEffect(() => {
    const loadTotalCash = async () => {
      try {
        const total = await fetchTotalCash();
        setTotalCash(total);
      } catch (error) {
        console.error('Failed to load total cash:', error);
        setTotalCash(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTotalCash();
  }, []);

  // Handle edit button click
  const handleEditClick = (record) => {
    setEditingRecord(record);
    setFormData({
      amount: record.amount?.toString() || '',
      payment_date: record.payment_date ? record.payment_date.split('T')[0] : '',
      comments: record.comments || '',
      payment_type: record.payment_type || 'Cash'
    });
    setIsModalOpen(true);
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingRecord?.id) {
      alert('Invalid record');
      return;
    }
    
    try {
      const response = await fetch('/api/nb-balance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingRecord.id,
          ...formData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Record updated successfully!');
        setIsModalOpen(false);
        // Refresh total cash balance
        const newTotalCash = await fetchTotalCash();
        setTotalCash(newTotalCash);
        // Note: In a real app, you'd want to refresh the table data too
        window.location.reload(); // Simple refresh
      } else {
        alert(result.error || 'Failed to update record');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Breadcrumb and Title */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <button
                onClick={() => router.back()}
                className="flex items-center hover:text-blue-600"
              >
                <FiArrowLeft className="mr-1" />
                Back
              </button>
              <span>/</span>
              <a href="/" className="hover:text-blue-600">Home</a>
              <span>/</span>
              <span className="text-gray-800 font-medium">Cash History</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Cash History</h1>
          </div>

          {/* Total Cash Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Total Cash Balance</h2>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatCurrency(totalCash)}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <FiDollarSign className="w-12 h-12 text-green-500" />
                <button
                  onClick={() => router.push('/cash-management')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cash Management
                </button>
              </div>
            </div>
          </div>

          {/* Cash History Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Cash List</h2>
            </div>
            
            <CashHistoryTable onEditClick={handleEditClick} />
          </div>
        </div>

        <Footer />

        {/* Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Edit Recharge Entry</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      name="payment_date"
                      value={formData.payment_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type
                    </label>
                    <select
                      name="payment_type"
                      value={formData.payment_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Cash">Cash</option>
                      <option value="RTGS">RTGS</option>
                      <option value="NEFT">NEFT</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">CHEQUE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remark
                    </label>
                    <input
                      type="text"
                      name="comments"
                      value={formData.comments}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter remark"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Update Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}