'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SupplierHeader from '@/components/supplierHeader';
import SupplierSidebar from '@/components/supplierSidebar';
import Link from 'next/link';

function SupplierInvoicesContent() {
  const [invoices, setInvoices] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    pay_date: new Date().toISOString().split('T')[0],
    remarks: '',
    tds_deduction: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [supplierId, setSupplierId] = useState(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

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
            fetchInvoices(supplierData.id);
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
    if (supplierId) {
      fetchInvoices(supplierId);
    }
  }, [fromDate, toDate, supplierId]);

  const fetchInvoices = async (id) => {
    if (!id) return;
    
    setLoading(true);
    try {
      let url = `/api/supplierinvoice?id=${id}`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setInvoices(data.invoices || []);
        if (data.supplierName) {
          setSupplierName(data.supplierName);
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFilter = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const params = new URLSearchParams();
    if (formData.get('from_date')) params.set('from_date', formData.get('from_date'));
    if (formData.get('to_date')) params.set('to_date', formData.get('to_date'));
    router.push(`/supplier/invoices?${params.toString()}`);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/supplierinvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInvoice.id,
          v_invoice: selectedInvoice.v_invoice_value,
          ...formData
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Payment recorded successfully!');
        setShowModal(false);
        setSelectedInvoice(null);
        setFormData({
          amount: '',
          pay_date: new Date().toISOString().split('T')[0],
          remarks: '',
          tds_deduction: ''
        });
        fetchInvoices(supplierId);
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      amount: '',
      pay_date: new Date().toISOString().split('T')[0],
      remarks: '',
      tds_deduction: ''
    });
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <SupplierSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <SupplierHeader />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center">
                  <button
                    onClick={() => router.push('/supplier/dashboard')}
                    className="mr-3 sm:mr-4 text-green-600 hover:text-green-800 text-xl sm:text-2xl"
                  >
                    ←
                  </button>
                  <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800">
                    My Invoices - {supplierName}
                  </h1>
                </div>
                <Link
                  href="/supplier/history"
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-lg text-sm sm:text-base text-center"
                >
                  View History →
                </Link>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Filter</h2>
              <form onSubmit={handleSubmitFilter}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      name="from_date"
                      defaultValue={fromDate || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      name="to_date"
                      defaultValue={toDate || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Apply Filter
                  </button>
                  <Link
                    href="/supplier/invoices"
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  >
                    Reset
                  </Link>
                </div>
              </form>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-4">Invoices</h2>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading invoices...</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanker No.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ltr</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Value</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNCN</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payable</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {invoices.length > 0 ? (
                            invoices.map((invoice) => (
                              <tr key={invoice.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{invoice.id}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{invoice.product_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{invoice.station_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{formatDate(invoice.invoice_date)}</td>
                                <td className="px-4 py-3 text-sm text-green-600 font-medium">{invoice.invoice_number}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{invoice.tanker_no}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{invoice.transport_number}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{invoice.ltr}</td>
                                <td className="px-4 py-3 text-sm text-green-600 font-medium">₹{invoice.v_invoice_value || '0'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{invoice.dncn || '0'}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{invoice.payable || '0'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                                No invoices found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden divide-y divide-gray-200">
                      {invoices.length > 0 ? (
                        invoices.map((invoice) => (
                          <div key={invoice.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                    #{invoice.id}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(invoice.invoice_date)}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-gray-900">{invoice.product_name}</h3>
                                <p className="text-sm text-gray-600">{invoice.station_name}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100">
                              <div>
                                <span className="text-gray-600 text-xs">Invoice#:</span>
                                <p className="font-medium text-green-600">{invoice.invoice_number}</p>
                              </div>
                              <div>
                                <span className="text-gray-600 text-xs">Tanker:</span>
                                <p className="font-medium">{invoice.tanker_no || '-'}</p>
                              </div>
                              <div>
                                <span className="text-gray-600 text-xs">Bill#:</span>
                                <p className="font-medium">{invoice.transport_number || '-'}</p>
                              </div>
                              <div>
                                <span className="text-gray-600 text-xs">Ltr:</span>
                                <p className="font-medium">{invoice.ltr || '0'}</p>
                              </div>
                              <div>
                                <span className="text-gray-600 text-xs">Invoice Value:</span>
                                <p className="font-medium text-green-600">₹{invoice.v_invoice_value || '0'}</p>
                              </div>
                              <div>
                                <span className="text-gray-600 text-xs">DNCN:</span>
                                <p className="font-medium">{invoice.dncn || '0'}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-600 text-xs">Payable:</span>
                                <p className="font-bold text-gray-900 text-base">₹{invoice.payable || '0'}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          No invoices found
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SupplierInvoicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <SupplierInvoicesContent />
    </Suspense>
  );
}

