"use client";

import { useEffect, useState } from "react";

export default function SupplierInvoiceTable({ supplierId }) {
  const [rows, setRows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ id: "", v_invoice: "" });
  const [amount, setAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [tdsDeduction, setTdsDeduction] = useState("");

  async function fetchData() {
    const res = await fetch(`/api/stock/supplierinvoice?id=${supplierId}`);
    const data = await res.json();
    setRows(data);
  }

  useEffect(() => {
    fetchData();
  }, [supplierId]);

  function openModal(row) {
    setModalData({ id: row.id, v_invoice: row.v_invoice_value });
    setAmount("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setRemarks("");
    setTdsDeduction("");
    setShowModal(true);
  }

  async function handlePayment(e) {
    e.preventDefault();
    if (!amount || !payDate) return alert("Amount and Payment Date are required.");

    const res = await fetch("/api/stock/supplierinvoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: modalData.id,
        amount,
        pay_date: payDate,
        remarks,
        v_invoice: modalData.v_invoice,
        tds_deduction: tdsDeduction || 0,
      }),
    });

    const result = await res.json();
    if (result.success) {
      setShowModal(false);
      fetchData();
    } else {
      alert(result.error || "Failed to update.");
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">#</th>
              <th className="border px-2 py-1">Product</th>
              <th className="border px-2 py-1">Station</th>
              <th className="border px-2 py-1">Invoice Date</th>
              <th className="border px-2 py-1">Invoice#</th>
              <th className="border px-2 py-1">Tanker No.</th>
              <th className="border px-2 py-1">Bill#</th>
              <th className="border px-2 py-1">Ltr</th>
              <th className="border px-2 py-1">Invoice Value</th>
              <th className="border px-2 py-1">DNCN</th>
              <th className="border px-2 py-1">Payable</th>
              <th className="border px-2 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="12" className="text-center p-2">
                  No filling requests found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{row.id}</td>
                  <td className="border px-2 py-1">{row.product_name}</td>
                  <td className="border px-2 py-1">{row.station_name}</td>
                  <td className="border px-2 py-1">{new Date(row.invoice_date).toLocaleDateString()}</td>
                  <td className="border px-2 py-1">{row.invoice_number}</td>
                  <td className="border px-2 py-1">{row.tanker_no}</td>
                  <td className="border px-2 py-1">{row.transport_number}</td>
                  <td className="border px-2 py-1">{row.ltr}</td>
                  <td className="border px-2 py-1">{row.v_invoice_value}</td>
                  <td className="border px-2 py-1">{row.dncn}</td>
                  <td className="border px-2 py-1">{row.payable}</td>
                  <td className="border px-2 py-1">
                    <button
                      className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      onClick={() => openModal(row)}
                    >
                      Pay
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 p-4 relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
              onClick={() => setShowModal(false)}
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-2">Make Payment</h2>
            <form onSubmit={handlePayment} className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Payment Amount</label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter payment amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border p-2 rounded"
                required
              />
              <label className="text-sm font-medium text-gray-700">Payment Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="border p-2 rounded"
                required
              />
              <label className="text-sm font-medium text-gray-700">TDS Deduction (Manual)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter TDS deduction (optional)"
                value={tdsDeduction}
                onChange={(e) => setTdsDeduction(e.target.value)}
                className="border p-2 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Remarks</label>
              <textarea
                placeholder="Enter remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="border p-2 rounded"
                rows="3"
              />
              <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
                Save Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
