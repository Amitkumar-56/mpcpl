'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from "react";
import { FiArrowLeft, FiEye, FiPlus } from "react-icons/fi";

function DNCNContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplyId = searchParams.get('id');
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [dncnRecords, setDncnRecords] = useState([]);
  const [stockData, setStockData] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (supplyId) {
        fetchDNCN();
      } else {
        setLoading(false);
      }
    }
  }, [supplyId, user, authLoading]);

  const fetchDNCN = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dncn?id=${supplyId}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setDncnRecords(result.data || []);
        setStockData(result.stock);
      } else {
        alert('Failed to load DNCN records: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error loading DNCN records');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    if (type == 1) return 'Debit';
    if (type == 2) return 'Credit';
    return 'Unknown';
  };

  const getStatusLabel = (status) => {
    if (status == 1) return 'Approved';
    if (status == 2) return 'Rejected';
    return 'Unknown';
  };

  const getStatusColor = (status) => {
    if (status == 1) return 'bg-green-100 text-green-800';
    if (status == 2) return 'bg-red-100 text-red-800';
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
              <p className="text-gray-600">Loading DNCN records...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!supplyId) {
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Supply ID</h2>
              <p className="text-gray-600 mb-6">Please provide a valid supply ID.</p>
              <button
                onClick={() => router.push('/stock')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go to Stock
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()} 
                className="mr-3 sm:mr-4 text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Stock Requests</h1>
                <nav className="text-xs sm:text-sm text-gray-600 mt-1">
                  <ol className="flex flex-wrap items-center space-x-2">
                    <li><a href="/" className="hover:text-blue-600">Home</a></li>
                    {stockData?.transporter_id && (
                      <>
                        <li>/</li>
                        <li>
                          <a 
                            href={`/transportersinvoice?id=${stockData.transporter_id}`}
                            className="hover:text-blue-600"
                          >
                            Transporter Invoices
                          </a>
                        </li>
                      </>
                    )}
                    <li>/</li>
                    <li className="text-gray-900">Transporter Invoice DNCN</li>
                  </ol>
                </nav>
              </div>
            </div>
            <a
              href={`/add_t_dncn?id=${supplyId}`}
              className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 sm:px-6 sm:py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105 z-50 text-sm sm:text-base"
            >
              <FiPlus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Debit/Credit</span>
              <span className="sm:hidden">Add</span>
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">T_DNCN</h2>
              
              {dncnRecords.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Supply ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">DNCN Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Remarks</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dncnRecords.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <a 
                              href={`/stock/supply-details/${row.sup_id}`}
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {row.sup_id}
                            </a>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row.type == 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {getTypeLabel(row.type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            ₹{parseFloat(row.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                              {getStatusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {row.t_dncn_date ? new Date(row.t_dncn_date).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {row.remarks || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <a 
                              href={`/stock/supply-details/${row.id}`}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="View Details"
                            >
                              <FiEye className="h-5 w-5 inline" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-4">
                    {dncnRecords.map((row) => (
                      <div key={row.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">#{row.id}</h3>
                            <p className="text-xs text-gray-500">Supply ID: {row.sup_id}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            row.type == 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {getTypeLabel(row.type)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Amount:</span>
                            <p className="font-semibold text-gray-900">₹{parseFloat(row.amount || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Status:</span>
                            <div className="mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                                {getStatusLabel(row.status)}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">Date:</span>
                            <p className="text-gray-900 text-xs">
                              {row.t_dncn_date ? new Date(row.t_dncn_date).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : '-'}
                            </p>
                          </div>
                          {row.remarks && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Remarks:</span>
                              <p className="text-gray-900 text-xs">{row.remarks}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                          <a 
                            href={`/stock/supply-details/${row.sup_id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Supply →
                          </a>
                          <a 
                            href={`/stock/supply-details/${row.id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <FiEye className="h-5 w-5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-500 text-base sm:text-lg">No T-DNCN found</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function DNCNPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DNCNContent />
    </Suspense>
  );
}

