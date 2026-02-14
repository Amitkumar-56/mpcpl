'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import PaymentModal from '@/components/PaymentModal';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Create a separate component that uses useSearchParams
function TransportInvoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Invoice ID is required');
      setLoading(false);
      return;
    }

    fetchInvoiceDetails();
  }, [id]);

  const fetchInvoiceDetails = async () => {
    try {
      const response = await fetch(`/api/transport-invoice-details?id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice details');
      }
      const result = await response.json();
      setInvoice(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (paymentData) => {
    try {
      const response = await fetch('/api/transport-invoice-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update payment');
      }

      // Refresh the data
      await fetchInvoiceDetails();
      
      // Close modal
      setShowPaymentModal(false);

      // Show success message
      alert('Payment updated successfully!');

    } catch (err) {
      alert(err.message);
      throw err;
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

  const getStatusText = (status) => {
    switch(parseInt(status)) {
      case 1: return 'Dispatched';
      case 2: return 'Processing';
      case 3: return 'Completed';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch(parseInt(status)) {
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGstStatus = (value) => {
    return value == 1 ? 'Done' : 'Pending';
  };

  const getGstColor = (value) => {
    return value == 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice details...</p>
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

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xl font-semibold text-gray-900 mb-2">No Data Found</p>
          <p className="text-gray-600 mb-6">No invoice details found for this ID.</p>
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

  const details = [
    { label: 'ID', value: invoice.id },
    { label: 'Filling Station', value: invoice.station_name || 'N/A' },
    { label: 'Product', value: invoice.product_name || 'N/A' },
    { label: 'Transporter', value: invoice.transporter_name || 'N/A' },
    { label: 'Invoice Date', value: formatDate(invoice.invoice_date) },
    { label: 'Invoice #', value: invoice.invoice_number || 'N/A' },
    { label: 'Bill #', value: invoice.transport_number || 'N/A' },
    { label: 'Supplier', value: invoice.supplier_name || 'N/A' },
    { label: 'Tanker No', value: invoice.tanker_no || 'N/A' },
    { label: 'Weight Type', value: invoice.weight_type || 'N/A' },
    { label: 'KG', value: invoice.kg || '0' },
    { label: 'LTR', value: invoice.ltr || '0' },
    { label: 'Density', value: invoice.density || 'N/A' },
    { label: 'Driver No', value: invoice.driver_no || 'N/A' },
    { label: 'T Invoice Value', value: formatCurrency(invoice.t_invoice_value) },
    { label: 'Payable', value: formatCurrency(invoice.t_payable) },
    { label: 'Paid Amount', value: formatCurrency(invoice.t_payment) },
    { label: 'Staff ID', value: invoice.staff_id || 'N/A' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-4 md:py-8">
        {/* Breadcrumb - Mobile Responsive */}
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
            <Link href={`/transportersinvoice?id=${invoice.transporter_id}`} className="hover:text-blue-600 truncate max-w-[120px] md:max-w-none">
              Invoices
            </Link>
            <span>/</span>
            <span className="text-gray-900 truncate">Details</span>
          </nav>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
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
              Transporter Invoice Details
            </h1>
          </div>
          
          {/* Payment Button - Mobile Responsive */}
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center px-3 py-2 md:px-4 md:py-2 bg-orange-500 text-white text-sm md:text-base rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="hidden xs:inline">Update Payment</span>
            <span className="xs:hidden">Pay</span>
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 md:p-6">
            {/* Status Badges - Mobile Responsive */}
            <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
              <span className={`px-2 py-1 md:px-3 md:py-1 text-xs md:text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                Status: {getStatusText(invoice.status)}
              </span>
              <span className={`px-2 py-1 md:px-3 md:py-1 text-xs md:text-sm font-semibold rounded-full ${getGstColor(invoice.gstr1)}`}>
                GSTR-1: {getGstStatus(invoice.gstr1)}
              </span>
              <span className={`px-2 py-1 md:px-3 md:py-1 text-xs md:text-sm font-semibold rounded-full ${getGstColor(invoice.gstr3b)}`}>
                GSTR-3B: {getGstStatus(invoice.gstr3b)}
              </span>
            </div>

            {/* Details Grid - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {details.map((detail, index) => (
                <div 
                  key={index} 
                  className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors"
                >
                  <span className="text-xs md:text-sm text-gray-500 mb-1">{detail.label}</span>
                  <span className="text-sm md:text-base font-medium text-gray-900 break-words">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Slip Image Section */}
            {invoice.slip_image && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-3">Slip Image</h3>
                <div className="relative w-full max-w-md mx-auto">
                  <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                    {!imageError ? (
                      <img
                        src={`/uploads/${invoice.slip_image}`}
                        alt="Slip"
                        className="w-full h-full object-contain"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <span className="text-gray-500">Image not found</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons - Mobile Responsive */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Update Transport Invoice Payment
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Payment Modal */}
      {showPaymentModal && invoice && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handlePaymentSubmit}
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
export default function TransportInvoiceDetails() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TransportInvoiceContent />
    </Suspense>
  );
}