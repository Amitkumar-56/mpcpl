// app/stock/supply-details/page.jsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Toast Component (Inline)
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      default:
        return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`${getStyles()} border px-4 py-3 rounded shadow-lg max-w-sm flex items-center justify-between`}
        role="alert"
      >
        <div>
          <span className="block sm:inline">{message}</span>
        </div>
        <button
          type="button"
          className="ml-4 text-lg font-bold"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Modal Component (Inline)
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </>
  );
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading supply details...</p>
      </div>
    </div>
  );
}

// Error Display Component
function ErrorDisplay({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <div className="space-x-4">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Content Component (wrapped in Suspense boundary)
function SupplyDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [supplyDetails, setSupplyDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGSTModal, setShowGSTModal] = useState(false);
  
  // Form states
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    pay_date: '',
    remarks: '',
  });
  
  const [gstForm, setGstForm] = useState({
    gstr1: false,
    gstr3b: false,
  });

  // Fetch supply details
  useEffect(() => {
    if (!id) {
      setError('Invalid supply ID');
      setLoading(false);
      return;
    }

    fetchSupplyDetails();
  }, [id]);

  const fetchSupplyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/stock/supply-details?id=${id}`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch supply details');
      }

      const data = await response.json();
      
      if (data.success) {
        setSupplyDetails(data.data);
        setGstForm({
          gstr1: data.data.gstr1 === 1,
          gstr3b: data.data.gstr3b === 1,
        });
      } else {
        throw new Error(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
      showToast('Error loading supply details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Get CSRF token from cookies
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };
      
      const csrfToken = getCookie('csrf_token');

      const response = await fetch('/api/stock/supply-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id,
          amount: parseFloat(paymentForm.amount),
          pay_date: paymentForm.pay_date,
          remarks: paymentForm.remarks,
          v_invoice: supplyDetails?.v_invoice_value,
          csrf_token: csrfToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Payment updated successfully', 'success');
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', pay_date: '', remarks: '' });
        fetchSupplyDetails();
      } else {
        throw new Error(data.error || 'Failed to update payment');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleGSTSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Get CSRF token from cookies
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };
      
      const csrfToken = getCookie('csrf_token');

      const response = await fetch('/api/stock/supply-details', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id,
          gstr1: gstForm.gstr1 ? 1 : 0,
          gstr3b: gstForm.gstr3b ? 1 : 0,
          csrf_token: csrfToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('GST status updated successfully', 'success');
        setShowGSTModal(false);
        fetchSupplyDetails();
      } else {
        throw new Error(data.error || 'Failed to update GST status');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(num);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      1: { label: 'Dispatched', color: 'bg-yellow-100 text-yellow-800' },
      2: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
      3: { label: 'Completed', color: 'bg-green-100 text-green-800' },
    };
    
    const statusInfo = statusMap[status] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Handle loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Handle error state
  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchSupplyDetails} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                <button
                  onClick={() => router.back()}
                  className="mr-3 text-blue-600 hover:text-blue-800"
                >
                  ←
                </button>
                Supply Details
              </h1>
              <nav className="mt-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Link href="/" className="text-blue-600 hover:text-blue-800">
                    Home
                  </Link>
                  <span className="text-gray-400">/</span>
                  <Link href="/stock" className="text-blue-600 hover:text-blue-800">
                    Stock
                  </Link>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600">Supply Details</span>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {supplyDetails && (
            <div className="p-4 sm:p-6">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setShowGSTModal(true)}
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  Update GST
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                >
                  Update Payment
                </button>
                {supplyDetails.status !== 3 && (
                  <Link
                    href={`/stock/update-supply?id=${id}`}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Update Supply
                  </Link>
                )}
              </div>

              {/* Supply Details Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { label: 'ID', value: supplyDetails.id },
                      { label: 'Filling Station', value: supplyDetails.fs_name },
                      { label: 'Product', value: supplyDetails.product_name },
                      { label: 'Transporter', value: supplyDetails.transporter_name },
                      { label: 'Invoice Date', value: formatDate(supplyDetails.invoice_date) },
                      { label: 'Invoice #', value: supplyDetails.invoice_number },
                      { label: 'Bill #', value: supplyDetails.transport_number },
                      { label: 'Supplier', value: supplyDetails.supplier_name },
                      { label: 'Tanker No', value: supplyDetails.tanker_no },
                      { label: 'Weight Type', value: supplyDetails.weight_type },
                      { label: 'KG', value: supplyDetails.kg },
                      { label: 'LTR', value: supplyDetails.ltr },
                      { label: 'Density', value: supplyDetails.density },
                      { label: 'Driver No', value: supplyDetails.driver_no },
                      { label: 'V Invoice Value', value: `₹${formatCurrency(supplyDetails.v_invoice_value)}` },
                      { label: 'T Invoice Value', value: `₹${formatCurrency(supplyDetails.t_invoice_value)}` },
                      { label: 'CNDN', value: supplyDetails.dncn },
                      { label: 'Payable', value: `₹${formatCurrency(supplyDetails.payable)}` },
                      { label: 'Paid Amount', value: `₹${formatCurrency(supplyDetails.payment)}` },
                      { label: 'Payment Date', value: formatDate(supplyDetails.pay_date) },
                      { label: 'Status', value: getStatusBadge(supplyDetails.status) },
                      { 
                        label: 'GST-R1', 
                        value: (
                          <span className={`px-2 py-1 rounded-full text-xs ${supplyDetails.gstr1 === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {supplyDetails.gstr1 === 1 ? 'Done' : 'Pending'}
                          </span>
                        ) 
                      },
                      { 
                        label: 'GST-R3B', 
                        value: (
                          <span className={`px-2 py-1 rounded-full text-xs ${supplyDetails.gstr3b === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {supplyDetails.gstr3b === 1 ? 'Done' : 'Pending'}
                          </span>
                        ) 
                      },
                      {
                        label: 'Slip Image',
                        value: supplyDetails.slip_image ? (
                          <div className="relative w-20 h-20">
                            <img
                              src={`/uploads/${supplyDetails.slip_image}`}
                              alt="Slip"
                              className="object-cover rounded border"
                            />
                          </div>
                        ) : 'No image'
                      },
                      { label: 'Staff ID', value: supplyDetails.staff_id },
                    ].map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900 bg-gray-50">
                          {item.label}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {item.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment History */}
              {supplyDetails.paymentHistory && supplyDetails.paymentHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Payment History</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Amount</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Remarks</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">V Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {supplyDetails.paymentHistory.map((payment, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2">{formatDate(payment.date)}</td>
                            <td className="px-4 py-2">₹{formatCurrency(payment.payment)}</td>
                            <td className="px-4 py-2">{payment.remarks || '-'}</td>
                            <td className="px-4 py-2">{payment.v_invoice || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Update Payment"
      >
        <form onSubmit={handlePaymentSubmit}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentForm.pay_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, pay_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* GST Modal */}
      <Modal
        isOpen={showGSTModal}
        onClose={() => setShowGSTModal(false)}
        title="Update GST Status"
      >
        <form onSubmit={handleGSTSubmit}>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="gstr1"
                checked={gstForm.gstr1}
                onChange={(e) => setGstForm({ ...gstForm, gstr1: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="gstr1" className="text-sm font-medium text-gray-700">
                GST-R1 Filed
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="gstr3b"
                checked={gstForm.gstr3b}
                onChange={(e) => setGstForm({ ...gstForm, gstr3b: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="gstr3b" className="text-sm font-medium text-gray-700">
                GST-R3B Filed
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowGSTModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update GST
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Main page component with Suspense
export default function SupplyDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SupplyDetailsContent />
    </Suspense>
  );
}
