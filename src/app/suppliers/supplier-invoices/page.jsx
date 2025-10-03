"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "components/sidebar";
import Header from "components/Header";
import Footer from "components/Footer";

interface Invoice {
  id: number;
  product_id: number;
  fs_id: number;
  invoice_date: string;
  invoice_number: string;
  tanker_no: string;
  transport_number: string;
  ltr: number;
  v_invoice_value: number;
  dncn: number;
  payable: number;
  payment: number;
  pname: string;
  station_name: string;
}

interface Supplier {
  name: string;
}

export default function SupplierInvoices() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    pay_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  useEffect(() => {
    fetchInvoices();
  }, [id]);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/supplier-invoices/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices);
        setSupplier(data.supplier);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-GB");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.pname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: "",
      pay_date: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/supplier-invoices/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sid: selectedInvoice.id,
          amount: parseFloat(paymentData.amount),
          pay_date: paymentData.pay_date,
          remarks: paymentData.remarks,
          v_invoice: selectedInvoice.v_invoice_value,
        }),
      });

      if (response.ok) {
        setShowPaymentModal(false);
        fetchInvoices();
        alert("Payment updated successfully!");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating payment");
    }
  };

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
      <div className="hidden md:block w-64 fixed top-0 left-0 h-full bg-white shadow-lg z-20">
        <Sidebar />
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 md:left-64 z-10 bg-white shadow p-4">
        <Header />
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 mt-20 p-4 overflow-auto">
        {/* Page Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Supplier Invoices - {supplier?.name}
          </h1>
          <input
            type="text"
            placeholder="Search by product or invoice#"
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
                <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Station</th>
                <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Invoice#</th>
                <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Invoice Date</th>
                <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Invoice Value</th>
                <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Payable</th>
                <th className="px-4 py-2 text-left text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    No invoices found
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">{inv.id}</td>
                    <td className="px-4 py-2">{inv.pname}</td>
                    <td className="px-4 py-2">{inv.station_name}</td>
                    <td className="px-4 py-2 text-blue-600 font-medium hover:underline">
                      <Link href={`/invoice-history/${inv.id}`}>{inv.invoice_number}</Link>
                    </td>
                    <td className="px-4 py-2">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-2">{formatCurrency(inv.v_invoice_value)}</td>
                    <td className="px-4 py-2">{formatCurrency(inv.payable)}</td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() => openPaymentModal(inv)}
                        className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        Pay
                      </button>
                      <Link
                        href={`/supply-details/${inv.id}`}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                      >
                        View
                      </Link>
                    </td>
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
      <div className="fixed bottom-0 left-0 right-0 md:left-64 z-10">
        <Footer />
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Make Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Paid
                </label>
                <input
                  type="number"
                  required
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="input-field w-full"
                  min="0"
                  max={selectedInvoice.payable}
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentData.pay_date}
                  onChange={(e) => setPaymentData({ ...paymentData, pay_date: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={paymentData.remarks}
                  onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                  className="input-field w-full"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
