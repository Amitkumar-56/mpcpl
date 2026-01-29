'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import * as XLSX from 'xlsx';

function RechargeHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError('Customer ID required');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/customers/recharge-history?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to load history');
        } else {
          setCustomer(data.customer);
          setHistory(data.history || []);
          setTotalAmount(Number(data.total_amount || 0));
        }
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const exportToExcel = () => {
    const rows = (history || []).map(h => ({
      'Payment Date': h.payment_date || (h.created_at ? new Date(h.created_at).toLocaleDateString('en-GB') : ''),
      Amount: Number(h.amount || 0),
      'Payment Type': h.payment_type || '',
      'Transaction ID': h.transaction_id || '',
      'UTR No.': h.utr_no || '',
      Comments: h.comments || ''
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Recharge History');
    const fileName = `recharge_history_${customer?.id || id}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar activePage="Customers" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 px-4 py-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <nav className="text-sm text-gray-600">
                <ol className="flex items-center gap-2">
                  <li><Link href="/dashboard" className="hover:underline">Home</Link></li>
                  <li>/</li>
                  <li><Link href="/customers" className="hover:underline">Customers</Link></li>
                  <li>/</li>
                  <li className="text-gray-800">Recharge History</li>
                </ol>
              </nav>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-4">
              Recharge History{customer ? ` for ${customer.name} (${customer.id})` : ''}
            </h1>

            {!loading && !error && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-gray-800">
                  Total Amount: <span className="text-blue-700">₹{Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Export Excel
                </button>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-lg p-6 border text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => router.push('/customers')}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Back to Customers
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-x-auto">
                <table className="w-full border-collapse min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 border text-left font-semibold">Payment Date</th>
                      <th className="px-4 py-3 border text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 border text-left font-semibold">Payment Type</th>
                      <th className="px-4 py-3 border text-left font-semibold">Transaction ID</th>
                      <th className="px-4 py-3 border text-left font-semibold">UTR No.</th>
                      <th className="px-4 py-3 border text-left font-semibold">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-600">
                          No recharge records found
                        </td>
                      </tr>
                    ) : (
                      history.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 border">{h.payment_date || new Date(h.created_at).toLocaleDateString('en-GB')}</td>
                          <td className="px-4 py-2 border text-right">₹{Number(h.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 border">{h.payment_type || '-'}</td>
                          <td className="px-4 py-2 border">{h.transaction_id || '-'}</td>
                          <td className="px-4 py-2 border">{h.utr_no || '-'}</td>
                          <td className="px-4 py-2 border">{h.comments || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function RechargeHistoryPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 px-4 py-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg p-6 border text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <RechargeHistoryContent />
    </Suspense>
  );
}