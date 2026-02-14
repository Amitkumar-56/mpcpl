'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import PaymentModal from '@/components/PaymentModal';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Create a separate component that uses useSearchParams
function TransportersInvoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transporterId = searchParams.get('transporter_id');
  const id = searchParams.get('id');
   
  // Use transporter_id if available, otherwise use id
  const finalId = transporterId || id;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showQuickPayModal, setShowQuickPayModal] = useState(false);
  const [quickPayInvoice, setQuickPayInvoice] = useState(null);

  useEffect(() => {
    if (!finalId) {
      setError('Transporter ID is required');
      setLoading(false);
      return;
    }

    fetchInvoices();
  }, [finalId]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`/api/transportersinvoice?id=${finalId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (paymentData) => {
    try {
      console.log('Submitting payment data:', paymentData);
      
      const response = await fetch('/api/transportersinvoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData,
          transporterId: finalId
        }),
      });

      const result = await response.json();
      console.log('Payment API response:', result);

      if (!response.ok) {
        console.error('API Error Response:', result);
        throw new Error(result.error || 'Failed to update payment');
      }

      // Refresh the data
      await fetchInvoices();
      
      // Close modal
      setShowPaymentModal(false);
      setSelectedInvoice(null);

      // Show success message
      alert('Payment updated successfully!');

    } catch (err) {
      console.error('Payment submission error:', err);
      alert(err.message);
      throw err; // Re-throw to be caught by modal
    }
  };

  const getStatusText = (status) => {
    // Handle both numeric and string status values
    if (typeof status === 'string') {
      switch(status.toLowerCase()) {
        case 'pending': return 'Pending';
        case 'on_the_way': return 'On the Way';
        case 'reported': return 'Reported';
        case 'delivered': return 'Delivered';
        case 'unloaded': return 'Unloaded';
        case 'processing': return 'Processing';
        case 'completed': return 'Completed';
        case 'dispatched': return 'Dispatched';
        default: return status || 'Unknown';
      }
    }
    
    // Handle numeric status values
    switch(parseInt(status)) {
      case 0: return 'Pending';
      case 1: return 'Dispatched';
      case 2: return 'Processing';
      case 3: return 'Completed';
      case 4: return 'On the Way';
      case 5: return 'Reported';
      case 6: return 'Delivered';
      case 7: return 'Unloaded';
      default: return 'Unknown Status';
    }
  };

  const getStatusColor = (status) => {
    // Handle both numeric and string status values
    if (typeof status === 'string') {
      switch(status.toLowerCase()) {
        case 'pending': return 'bg-gray-100 text-gray-800';
        case 'on_the_way': return 'bg-blue-100 text-blue-800';
        case 'reported': return 'bg-yellow-100 text-yellow-800';
        case 'delivered': return 'bg-green-100 text-green-800';
        case 'unloaded': return 'bg-purple-100 text-purple-800';
        case 'processing': return 'bg-blue-100 text-blue-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'dispatched': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    
    // Handle numeric status values
    switch(parseInt(status)) {
      case 0: return 'bg-gray-100 text-gray-800';
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-green-100 text-green-800';
      case 4: return 'bg-blue-100 text-blue-800';
      case 5: return 'bg-yellow-100 text-yellow-800';
      case 6: return 'bg-green-100 text-green-800';
      case 7: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-center">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xl font-semibold mb-2">Error</p>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span>/</span>
            <Link href="/transporters" className="hover:text-blue-600">
              Transporters
            </Link>
            <span>/</span>
            <span className="text-gray-900">Transporter Invoices</span>
          </nav>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Transporter Invoice Requests - {data?.transporterName || 'Unknown'}
            </h1>
          </div>
          <Link
            href={`/transportersinvoice/history?id=${finalId}`}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Transaction History
          </Link>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanker No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ltr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T Invoice Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T DNCN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T Payable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.invoices?.length > 0 ? (
                  data.invoices.map((invoice, index) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.product_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.transporterName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoice_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.transport_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.station_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.tanker_no}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.ltr}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{parseFloat(invoice.t_invoice_value).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.t_dncn)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.t_payable)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/transport-invoice-details?id=${invoice.id}&transporter_id=${finalId}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          
                          {parseFloat(invoice.t_payable) > 0 && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowPaymentModal(true);
                              }}
                              className="text-orange-600 hover:text-orange-900"
                              title="Make Payment"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </button>
                          )}

                          <Link
                            href={`/transport-invoice-history?id=${invoice.id}&transporter_id=${finalId}`}
                            className="text-green-600 hover:text-green-900"
                            title="View History"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                          </Link>

                          <Link
                            href={`/t_dncn?id=${invoice.id}&transporter_id=${finalId}`}
                            className="text-red-600 hover:text-red-900"
                            title="DN/CN"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="13" className="px-6 py-4 text-center text-gray-500">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
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
export default function TransportersInvoice() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TransportersInvoiceContent />
    </Suspense>
  );
}