'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AddSupplyForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    suppliers: [],
    transporters: [],
    products: [],
    stations: []
  });
  const [loading, setLoading] = useState(true);
  const [supplyType, setSupplyType] = useState("1");
  const [weightType, setWeightType] = useState("");

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const res = await fetch('/api/stock/add-supply');
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        setFormData(data);
      } catch (err) {
        console.error('Failed to fetch form data:', err);
        alert('Failed to load form data. Please refresh the page.');
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
      const res = await fetch('/api/stock/add-supply', {
        method: 'POST',
        body: data
      });
      
      const result = await res.json();

      if (result.success) {
        alert('Supply added successfully!');
        e.target.reset();
        router.push('/stock/stock-request');
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
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
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

        {/* Transporter (only if type 2) */}
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

        {/* KG and Density Fields */}
        {weightType === "kg" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">KG</label>
              <input 
                type="number" 
                name="kg" 
                step="0.01" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Density</label>
              <input 
                type="number" 
                name="density" 
                step="0.001" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600" 
              />
            </div>
          </>
        )}

        {/* LTR Field */}
        {weightType === "ltr" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">LTR</label>
            <input 
              type="number" 
              name="ltr" 
              step="0.01" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600" 
            />
          </div>
        )}

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

        {/* Supplier Invoice No */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Invoice No *</label>
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

        {/* Transporter Invoice No */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Transporter Invoice No</label>
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
        <button 
          type="reset" 
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
        >
          Reset
        </button>
        <button 
          type="submit" 
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

export default function AddSupplyPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-white shadow-lg z-30 hidden md:block">
        <Sidebar activePage="Add Supply" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <div className="fixed top-0 right-0 left-0 md:left-64 bg-white shadow-sm z-20">
          <Header />
        </div>

        <main className="flex-1 overflow-auto pt-20 pb-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-start">
              <Link 
                href="/stock/stock-request" 
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                ← Back to Stock Requests
              </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-1"></div>
              <div className="p-6">
                <Suspense fallback={
                  <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600 font-medium">Loading form...</p>
                    </div>
                  </div>
                }>
                  <AddSupplyForm />
                </Suspense>
              </div>
            </div>
          </div>
        </main>

        <div className="fixed bottom-0 right-0 left-0 md:left-64 bg-white border-t border-gray-200 z-20">
          <Footer />
        </div>
      </div>
    </div>
  );
}