'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

function SupplierInvoiceContent() {
  const [invoices, setInvoices] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    pay_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  useEffect(() => {
    if (id) {
      fetchInvoices();
    }
  }, [id, fromDate, toDate]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = `/api/supplierinvoice?id=${id}`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setInvoices(data.invoices);
        setSupplierName(data.supplierName);
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
    params.set('id', id);
    params.set('from_date', formData.get('from_date'));
    params.set('to_date', formData.get('to_date'));
    router.push(`/supplierinvoice?${params.toString()}`);
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
          remarks: ''
        });
        fetchInvoices(); // Refresh data
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
      remarks: ''
    });
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      
      <main className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-6">
          {/* Breadcrumb and Header */}
          <div className="mb-6">
            <nav className="mb-4">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link href="/" className="text-blue-600 hover:text-blue-800">
                    Home
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li className="text-gray-600">Supplier Invoice</li>
              </ol>
            </nav>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                <button
                  onClick={() => router.back()}
                  className="mr-4 text-blue-600 hover:text-blue-800"
                >
                  ←
                </button>
                Supplier Invoice - {supplierName}
              </h1>
              <Link
                href="/add-supply"
                className="fixed md:relative bottom-4 right-4 md:bottom-auto md:right-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-lg"
              >
                Add Supply
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Apply Filter
                </button>
                <Link
                  href={`/supplierinvoice?id=${id}`}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                >
                  Reset
                </Link>
              </div>
            </form>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Invoices</h2>
                <Link
                  href={`/supplierinvoice-history?id=${id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Transaction History →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Station
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice#
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanker No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bill#
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ltr
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DNCN
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payable
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.length > 0 ? (
                      invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {invoice.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {invoice.product_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {invoice.station_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(invoice.invoice_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600">
                            <Link
                              href={`/invoice-history?id=${invoice.id}`}
                              className="hover:underline"
                            >
                              {invoice.invoice_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {invoice.tanker_no}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {invoice.transport_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {invoice.ltr}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600">
                            <Link
                              href={`/invoice-history?id=${invoice.id}`}
                              className="hover:underline"
                            >
                              {invoice.v_invoice_value}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {invoice.dncn}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {invoice.payable}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <Link
                                href={`/supply-details?id=${invoice.id}`}
                                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => handleMakePayment(invoice)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Pay
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="12"
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No invoices found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Make Payment</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount to Pay
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.pay_date}
                      onChange={(e) =>
                        setFormData({ ...formData, pay_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) =>
                        setFormData({ ...formData, remarks: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Enter remarks (optional)"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Make Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default function SupplierInvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SupplierInvoiceContent />
    </Suspense>
  );
}