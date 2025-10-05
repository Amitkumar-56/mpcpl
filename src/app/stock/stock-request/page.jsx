// src/app/stock/stock-request/page.jsx
'use client';
import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BiRupee } from 'react-icons/bi';
import { BsChatLeftTextFill, BsEyeFill } from 'react-icons/bs';

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await axios.get('/api/stock');
        setStocks(res.data);
      } catch (err) {
        console.error('Error fetching stock:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500 text-lg animate-pulse">Loading stock requests...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Stock Requests</h1>
          <nav className="text-sm text-gray-500 mt-1">
            <Link href="/" className="hover:underline">Home</Link> / 
            <span className="mx-1">Stock</span> / 
            <span className="font-semibold text-gray-700">Requests</span>
          </nav>
        </div>
        <Link href="/outstanding_history" className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700">
          Outstanding History
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">Invoice Date</th>
              <th className="px-4 py-2">Invoice#</th>
              <th className="px-4 py-2">Transporter</th>
              <th className="px-4 py-2">Transporter Bill#</th>
              <th className="px-4 py-2">Station</th>
              <th className="px-4 py-2">Tanker No</th>
              <th className="px-4 py-2">Ltr</th>
              <th className="px-4 py-2">Sup Invoice</th>
              <th className="px-4 py-2">DNCN</th>
              <th className="px-4 py-2">Payable</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {stocks.length > 0 ? (
              stocks.map((row, idx) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{row.product_name || '-'}</td>
                  <td className="px-4 py-2 text-blue-600">
                    <Link href={`/supplierinvoice?id=${row.supplier_id}`}>
                      {row.supplier_name || 'No Supplier'}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{new Date(row.invoice_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{row.invoice_number}</td>
                  <td className="px-4 py-2 text-blue-600">
                    <Link href={`/transportersinvoice?id=${row.transporter_id}`}>
                      {row.transporter_name || 'No Transporter'}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{row.transport_number || '-'}</td>
                  <td className="px-4 py-2">{row.station_name || '-'}</td>
                  <td className="px-4 py-2">{row.tanker_no || '-'}</td>
                  <td className="px-4 py-2">{row.ltr || '-'}</td>
                  <td className="px-4 py-2">{row.v_invoice_value || '-'}</td>
                  <td className="px-4 py-2">{row.dncn || '-'}</td>
                  <td className="px-4 py-2">{row.payable || '-'}</td>
                  <td className={`px-4 py-2 font-medium ${
                    row.status === 1 ? 'text-yellow-600' :
                    row.status === 2 ? 'text-blue-600' :
                    row.status === 3 ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {row.status === 1 ? 'Dispatched' :
                     row.status === 2 ? 'Processing' :
                     row.status === 3 ? 'Completed' : 'Unknown'}
                  </td>
                  <td className="px-4 py-2 flex justify-center gap-3">
                    <Link href={`/supply-details?id=${row.id}`}>
                      <BsEyeFill className="text-blue-600 hover:scale-110 transition" size={18} />
                    </Link>
                    <button>
                      <BsChatLeftTextFill className="text-green-600 hover:scale-110 transition" size={18} />
                    </button>
                    <Link href={`/dncn?id=${row.id}`}>
                      <BiRupee className="text-red-600 hover:scale-110 transition" size={20} />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="15" className="text-center py-4 text-gray-500">
                  No stock requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link
        href="/add-supply"
        className="fixed bottom-6 right-6 bg-purple-700 text-white px-5 py-3 rounded-full shadow-lg hover:bg-purple-800 transition"
      >
        Add Supply
      </Link>
    </main>
  );
}
