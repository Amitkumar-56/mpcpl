'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function SupplierInvoiceContent() {
  const [invoices, setInvoices] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false
  });
  const [formData, setFormData] = useState({
    amount: '',
    pay_date: new Date().toISOString().split('T')[0],
    remarks: '',
    tds_deduction: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const id = searchParams.get('id');
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  // Handle escape key and body scroll
  useEffect(() => {
    if (showModal) {
      const handleEscKey = (e) => {
        if (e.key === 'Escape') setShowModal(false);
      };
      
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscKey);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [showModal]);

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

  const checkPermissions = async () => {
    if (!user || !user.id) {
      setHasPermission(false);
      return;
    }

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true });
      if (id) fetchInvoices();
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
        if (id) fetchInvoices();
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
        if (id) fetchInvoices();
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
        if (id) fetchInvoices();
      } else {
        setHasPermission(false);
        setPermissions({ can_view: false, can_edit: false });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setPermissions({ can_view: false, can_edit: false });
    }
  };

  useEffect(() => {
    if (id && hasPermission && !authLoading) {
      fetchInvoices();
    }
  }, [id, fromDate, toDate, hasPermission, authLoading]);

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
      const paymentAmount = parseFloat(formData.amount);
      const tdsAmount = parseFloat(formData.tds_deduction || 0);
      const netAmount = paymentAmount - tdsAmount;

      if (netAmount <= 0) {
        alert('Net amount after TDS must be greater than 0');
        setSubmitting(false);
        return;
      }

      if (selectedInvoice.payable < netAmount) {
        alert(`Payment amount exceeds payable amount. Available: ₹${selectedInvoice.payable}`);
        setSubmitting(false);
        return;
      }

      const response = await fetch('/api/supplierinvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInvoice.id,
          amount: formData.amount,
          pay_date: formData.pay_date,
          remarks: formData.remarks,
          v_invoice: selectedInvoice.v_invoice_value,
          tds_deduction: formData.tds_deduction || 0
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Payment of ₹${netAmount.toFixed(2)} recorded successfully!`);
        setShowModal(false);
        setSelectedInvoice(null);
        setFormData({
          amount: '',
          pay_date: new Date().toISOString().split('T')[0],
          remarks: '',
          tds_deduction: ''
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
      amount: invoice.payable || '',
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

  // ✅ Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
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
          <main className="flex-1 px-4 py-6 overflow-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view supplier invoices.</p>
              <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="pt-16 lg:pt-20 flex-1 overflow-y-auto bg-gray-50">
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
                                  href={`/stock/supply-details?id=${invoice.id}`}
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

        {/* Dynamic Payment Modal */}
        {showModal && selectedInvoice && (
          <>
            {/* Modal Overlay */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-[100] transition-opacity duration-300"
              onClick={() => setShowModal(false)}
            />
            
            {/* Modal Container */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Make Payment</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Invoice #{selectedInvoice.invoice_number}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close modal"
                  >
                    &times;
                  </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
                  {/* Invoice Summary */}
                  <div className="mb-6 bg-blue-50 rounded-lg border border-blue-100 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Product:</span>
                          <span className="font-medium">{selectedInvoice.product_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Station:</span>
                          <span className="font-medium">{selectedInvoice.station_name}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Invoice Date:</span>
                          <span className="font-medium">{formatDate(selectedInvoice.invoice_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Current Payable:</span>
                          <span className="text-lg font-bold text-blue-700">
                            ₹{selectedInvoice.payable}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Form */}
                  <form onSubmit={handlePaymentSubmit} className="space-y-6">
                    {/* Payment Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Payment Amount (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.amount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            const max = parseFloat(selectedInvoice.payable);
                            const validatedValue = value > max ? max : value;
                            setFormData({ ...formData, amount: validatedValue });
                          }}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                          placeholder="0.00"
                          min="0"
                          max={selectedInvoice.payable}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          Maximum: ₹{selectedInvoice.payable}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({ 
                            ...formData, 
                            amount: selectedInvoice.payable 
                          })}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded"
                        >
                          Use Full Amount
                        </button>
                      </div>
                    </div>

                    {/* TDS Deduction */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        TDS Deduction (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.tds_deduction}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            const max = parseFloat(formData.amount) || 0;
                            const validatedValue = value > max ? max : value;
                            setFormData({ ...formData, tds_deduction: validatedValue });
                          }}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          min="0"
                          max={formData.amount}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Optional - Tax Deducted at Source
                      </p>
                    </div>

                    {/* Net Amount Calculation */}
                    {(formData.amount || formData.tds_deduction) && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Payment Amount:</span>
                            <span className="font-medium">₹{parseFloat(formData.amount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">TDS Deduction:</span>
                            <span className="font-medium text-red-600">
                              - ₹{parseFloat(formData.tds_deduction || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t border-green-200 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold text-gray-800">Net Amount Payable:</span>
                              <span className="text-2xl font-bold text-green-700">
                                ₹{(
                                  parseFloat(formData.amount || 0) - 
                                  parseFloat(formData.tds_deduction || 0)
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Date */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.pay_date}
                        onChange={(e) =>
                          setFormData({ ...formData, pay_date: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Remarks
                      </label>
                      <textarea
                        value={formData.remarks}
                        onChange={(e) =>
                          setFormData({ ...formData, remarks: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        placeholder="Enter payment remarks (optional)..."
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="sticky bottom-0 bg-white pt-6 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowModal(false)}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium transition-colors w-full sm:w-auto"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !formData.amount}
                          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
                        >
                          {submitting ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing Payment...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                              </svg>
                              Confirm Payment
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fixed Footer */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function SupplierInvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Supplier Invoice...</p>
        </div>
      </div>
    }>
      <SupplierInvoiceContent />
    </Suspense>
  );
}