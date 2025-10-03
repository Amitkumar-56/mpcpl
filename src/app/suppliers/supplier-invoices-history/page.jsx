"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "components/sidebar";
import Header from "components/Header";
import Footer from "components/Footer";

interface Transaction {
  id: number;
  supply_id: number;
  v_invoice: number;
  payment: number;
  date: string;
  remarks: string;
  type: number;
}

export default function TransactionHistory() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransactions();
  }, [id]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/supplier-invoices/${id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  const filteredTransactions = transactions.filter(
    (t) =>
      t.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toString().includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-20 hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top nav placeholder */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white shadow p-4">
        <Header />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <div className="hidden md:block fixed top-0 left-64 right-0 z-10 bg-white shadow p-4">
          <Header />
        </div>

        <main className="flex-1 mt-20 p-4 overflow-auto">
          {/* Page Header & Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Transaction History</h1>
            <input
              type="text"
              placeholder="Search by ID or remarks..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Table */}
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm md:text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Invoice Value</th>
                  <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{t.id}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(t.v_invoice)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-green-600 font-medium">{formatCurrency(t.payment)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{t.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded-lg border ${
                  currentPage === i + 1 ? "bg-purple-600 text-white" : "bg-white text-gray-700"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </main>

        {/* Footer */}
        <div className="mt-auto">
          <Footer />
        </div>

        {/* Floating Add Transaction Button */}
        <button
          onClick={() => router.push(`/stock/add-transaction`)}
          className="fixed bottom-5 right-5 md:right-10 bg-purple-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-purple-700 z-50 flex items-center justify-center"
        >
          Add Transaction
        </button>
      </div>
    </div>
  );
}
