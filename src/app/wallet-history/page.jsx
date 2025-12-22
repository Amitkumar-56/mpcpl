'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from "react";
import { FiArrowLeft, FiEye, FiMessageCircle } from "react-icons/fi";

function WalletHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');
  const { user, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [walletHistory, setWalletHistory] = useState([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (customerId) {
        fetchWalletHistory();
      } else {
        setLoading(false);
      }
    }
  }, [customerId, user, authLoading]);

  const fetchWalletHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wallet-history?id=${customerId}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setWalletHistory(result.data || []);
      } else {
        alert('Failed to load wallet history: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error loading wallet history');
    } finally {
      setLoading(false);
    }
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
              <p className="text-gray-600">Loading wallet history...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!customerId) {
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Customer ID</h2>
              <p className="text-gray-600 mb-6">Please provide a valid customer ID.</p>
              <button
                onClick={() => router.push('/customers')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go to Customers
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
          <div className="flex items-center mb-6">
            <button 
              onClick={() => router.back()} 
              className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <FiArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Wallet History</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer ID: {customerId}</h2>
              
              {walletHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">RID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Old Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Deducted</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Added</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">New Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Trans Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {walletHistory.map((row, index) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.rid || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">₹{parseFloat(row.old_balance || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">₹{parseFloat(row.deducted || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">₹{parseFloat(row.added || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">₹{parseFloat(row.c_balance || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {row.d_date ? new Date(row.d_date).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-3">
                              <button 
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="View Details"
                              >
                                <FiEye className="h-5 w-5" />
                              </button>
                              <button 
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Chat"
                              >
                                <FiMessageCircle className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No wallet history found</p>
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

export default function WalletHistoryPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <WalletHistoryContent />
    </Suspense>
  );
}

