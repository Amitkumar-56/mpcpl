'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AddSupplyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    suppliers: [],
    transporters: [],
    products: [],
    stations: []
  });
  const [loading, setLoading] = useState(true);

  // ✅ States for UI toggle
  const [supplyType, setSupplyType] = useState("1");
  const [weightType, setWeightType] = useState("");

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const res = await fetch('/api/add-supply-form');
        const data = await res.json();
        setFormData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFormData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    try {
      const res = await fetch('/api/add-supply', { method: 'POST', body: data });
      const result = await res.json();

      if (result.success) {
        alert('Supply added successfully!');
        e.target.reset();
        router.push('/stock-requests');
      } else {
        alert('Failed: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error occurred.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-white shadow-lg z-30 hidden md:block">
        <Sidebar activePage="Add Supply" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-0 md:left-64 bg-white shadow-sm z-20">
          <Header />
        </div>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-auto pt-20 pb-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Back Button */}
            <div className="flex justify-start">
              <Link
                href="/stock/stock-request"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition duration-200"
              >
                ← Back to Stock Requests
              </Link>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-1"></div>
              <div className="p-6">
                <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Supply Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Supply Type *</label>
                      <select
                        name="supply_type"
                        value={supplyType}
                        onChange={e => setSupplyType(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      >
                        <option value="1">Material Only</option>
                        <option value="2">Material + Transport</option>
                      </select>
                    </div>

                    {/* Supplier */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Supplier *</label>
                      <select
                        name="supplier_id"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      >
                        <option value="">Select Supplier</option>
                        {formData.suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Transporter */}
                    {supplyType === "2" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Transporter</label>
                        <select
                          name="transporter_id"
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        >
                          <option value="">Select Transporter</option>
                          {formData.transporters.map(t => (
                            <option key={t.id} value={t.id}>{t.transporter_name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Product */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Product *</label>
                      <select
                        name="product_id"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      >
                        <option value="">Select Product</option>
                        {formData.products.map(p => (
                          <option key={p.id} value={p.id}>{p.pname}</option>
                        ))}
                      </select>
                    </div>

                    {/* Station */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Station *</label>
                      <select
                        name="station_id"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      >
                        <option value="">Choose Station</option>
                        {formData.stations.map(s => (
                          <option key={s.id} value={s.id}>{s.station_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tanker Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tanker Number *</label>
                      <input
                        type="text"
                        name="tanker_no"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      />
                    </div>

                    {/* Driver Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Driver Number *</label>
                      <input
                        type="number"
                        name="driver_no"
                        min="1000000000"
                        max="9999999999"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      />
                    </div>

                    {/* Weight Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weight Type *</label>
                      <select
                        name="weight_type"
                        value={weightType}
                        onChange={e => setWeightType(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      >
                        <option value="">Select Weight Type</option>
                        <option value="kg">KG</option>
                        <option value="ltr">LTR</option>
                      </select>
                    </div>

                    {/* KG */}
                    {weightType === "kg" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">KG</label>
                        <input type="number" name="kg" step="0.01" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600" />
                      </div>
                    )}

                    {/* LTR */}
                    {weightType === "ltr" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">LTR</label>
                        <input type="number" name="ltr" step="0.01" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600" />
                      </div>
                    )}

                    {/* Density (only if KG chosen) */}
                    {weightType === "kg" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Density</label>
                        <input type="number" name="density" step="0.001" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600" />
                      </div>
                    )}

                    {/* ✅ Extra Fields */}

                    {/* Supplier Product Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Product Name *</label>
                      <input
                        type="text"
                        name="supplier_product_name"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      />
                    </div>

                    {/* Invoice Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date *</label>
                      <input
                        type="date"
                        name="invoice_date"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      />
                    </div>

                    {/* Supplier Invoice Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Invoice Number *</label>
                      <input
                        type="text"
                        name="supplier_invoice_no"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      />
                    </div>

                    {/* Supplier Invoice Value */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Invoice Value *</label>
                      <input
                        type="number"
                        name="supplier_invoice_value"
                        step="0.01"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                        required
                      />
                    </div>

                    {/* Transporter Invoice Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Transporter Invoice Number</label>
                      <input
                        type="text"
                        name="transporter_invoice_no"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      />
                    </div>

                    {/* Transporter Invoice Value */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Transporter Invoice Value</label>
                      <input
                        type="number"
                        name="transporter_invoice_value"
                        step="0.01"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      />
                    </div>

                    {/* Slip Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Slip Image</label>
                      <input
                        type="file"
                        name="slip_image"
                        accept="image/*"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="reset" className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-200 font-medium">
                      Reset
                    </button>
                    <button type="submit" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 font-medium">
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>

        {/* Fixed Footer */}
        <div className="fixed bottom-0 right-0 left-0 md:left-64 bg-white border-t border-gray-200 z-20">
          <Footer />
        </div>
      </div>
    </div>
  );
}
