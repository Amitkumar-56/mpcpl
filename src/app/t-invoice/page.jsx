'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from "react";
import { FiArrowLeft, FiEye, FiMessageCircle, FiPlus, FiDollarSign } from "react-icons/fi";

function TInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transporterId = searchParams.get('id');
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (transporterId) {
        fetchInvoices();
      } else {
        setLoading(false);
      }
    }
  }, [transporterId, user, authLoading]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/t-invoice?id=${transporterId}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setInvoices(result.data || []);
      } else {
        alert('Failed to load invoices: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error loading invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    if (status == 1) return 'Dispatched';
    if (status == 2) return 'Processing';
    if (status == 3) return 'Completed';
    return 'Unknown Status';
  };

  const getStatusColor = (status) => {
    if (status == 1) return 'bg-blue-100 text-blue-800';
    if (status == 2) return 'bg-yellow-100 text-yellow-800';
    if (status == 3) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 w-full">
          <div className="sticky top-0 z-10">
            <Header />
          </div>
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading invoices...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!transporterId) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 w-full">
          <div className="sticky top-0 z-10">
            <Header />
          </div>
          <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Transporter ID</h2>
              <p className="text-gray-600 mb-6">Please provide a valid transporter ID.</p>
              <button
                onClick={() => router.push('/transporters')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go to Transporters
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="sticky top-0 h-screen">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 w-full">
        <div className="sticky top-0 z-10">
          <Header />
        </div>

        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()} 
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <FiArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stock Requests</h1>
                <nav className="text-sm text-gray-600 mt-1">
                  <ol className="flex items-center space-x-2">
                    <li><a href="/" className="hover:text-blue-600">Home</a></li>
                    <li>/</li>
                    <li className="text-gray-900">Transporter Invoice Value</li>
                  </ol>
                </nav>
              </div>
            </div>
            <a
              href="/add-supply"
              className="fixed bottom-10 right-10 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105 z-50"
            >
              <FiPlus className="h-5 w-5" />
              <span>Add Supply</span>
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoices</h2>
              
              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Transporter</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Station</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tanker No.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Weight Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ltr</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">DNCN</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Payable</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {row.product_name || 'Product not found'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {row.transporter_name || 'No Transporter'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {row.station_name || 'Station not found'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.tanker_no || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.weight_type || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.ltr || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            ₹{parseFloat(row.t_invoice_value || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            ₹{parseFloat(row.dncn || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-semibold">
                            ₹{parseFloat(row.payable || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                              {getStatusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-3">
                              <a 
                                href={`/supply-details?id=${row.id}`}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="View Details"
                              >
                                <FiEye className="h-5 w-5" />
                              </a>
                              <button 
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Chat"
                              >
                                <FiMessageCircle className="h-5 w-5" />
                              </button>
                              <a 
                                href={`/dncn?id=${row.id}`}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="DNCN"
                              >
                                <FiDollarSign className="h-5 w-5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No filling requests found</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <div className="sticky bottom-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function TInvoicePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TInvoiceContent />
    </Suspense>
  );
}

