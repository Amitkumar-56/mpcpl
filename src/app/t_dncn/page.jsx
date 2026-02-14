'use client';

import DncnModal from '@/components/DncnModal';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Create a separate component that uses useSearchParams
function TDncnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('Supply ID is required');
      setLoading(false);
      return;
    }

    fetchDncnRecords();
  }, [id]);

  const fetchDncnRecords = async () => {
    try {
      const response = await fetch(`/api/t_dncn?id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (formData) => {
    try {
      const response = await fetch('/api/t_dncn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create record');
      }

      await fetchDncnRecords();
      setShowAddModal(false);
      alert('Record created successfully!');

    } catch (err) {
      alert(err.message);
      throw err;
    }
  };

  const handleEditSubmit = async (formData) => {
    try {
      const response = await fetch('/api/t_dncn', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update record');
      }

      await fetchDncnRecords();
      setSelectedRecord(null);
      alert('Record updated successfully!');

    } catch (err) {
      alert(err.message);
      throw err;
    }
  };

  const handleDelete = async (recordId) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/t_dncn/${recordId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete record');
      }

      await fetchDncnRecords();
      alert('Record deleted successfully!');

    } catch (err) {
      alert(err.message);
    }
  };

  const getTypeText = (type) => {
    switch(parseInt(type)) {
      case 1: return 'Debit';
      case 2: return 'Credit';
      default: return 'Unknown';
    }
  };

  const getTypeColor = (type) => {
    switch(parseInt(type)) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(parseInt(status)) {
      case 1: return 'Approved';
      case 2: return 'Rejected';
      default: return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch(parseInt(status)) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xl font-semibold text-gray-900 mb-2">Error</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 z-40 md:hidden bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        aria-label="Add Debit/Credit"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      
      <main className="flex-grow container mx-auto px-4 py-4 md:py-8">
        {/* Breadcrumb */}
        <div className="mb-4 md:mb-6">
          <nav className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span>/</span>
            <Link href="/transporters" className="hover:text-blue-600">
              Transporters
            </Link>
            <span>/</span>
            <Link href={`/transportersinvoice?id=${data?.transporterId}`} className="hover:text-blue-600 truncate max-w-[120px] md:max-w-none">
              Invoices
            </Link>
            <span>/</span>
            <span className="text-gray-900 truncate">T-DNCN</span>
          </nav>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">
              Transporter Invoice DNCN
            </h1>
          </div>
          
          {/* Desktop Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="hidden md:flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Debit/Credit
          </button>
        </div>

        {/* Stock Summary Card */}
        {data?.stockData && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Invoice Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-xs text-gray-500">Invoice #</span>
                <p className="text-sm font-medium">{data.stockData.invoice_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">T Invoice Value</span>
                <p className="text-sm font-medium">{formatCurrency(data.stockData.t_invoice_value)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">T DNCN</span>
                <p className="text-sm font-medium">{formatCurrency(data.stockData.t_dncn)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">T Payable</span>
                <p className="text-sm font-medium">{formatCurrency(data.stockData.t_payable)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supply ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.records?.length > 0 ? (
                  data.records.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Link 
                          href={`/supply-details?id=${record.sup_id}`}
                          className="text-blue-600 hover:text-blue-900 hover:underline"
                        >
                          {record.sup_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(record.type)}`}>
                          {getTypeText(record.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.t_dncn_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {record.remarks || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600">No T-DNCN records found</p>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-3 text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Add your first record
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {/* Add Modal */}
      {showAddModal && (
        <DncnModal
          supplyId={id}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddSubmit}
          mode="add"
        />
      )}

      {/* Edit Modal */}
      {selectedRecord && (
        <DncnModal
          record={selectedRecord}
          supplyId={id}
          onClose={() => setSelectedRecord(null)}
          onSubmit={handleEditSubmit}
          mode="edit"
        />
      )}
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function TDncnPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TDncnContent />
    </Suspense>
  );
}