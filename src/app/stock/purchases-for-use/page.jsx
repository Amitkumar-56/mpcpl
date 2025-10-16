// src/app/stock/purchases-for-use/page.jsx
'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from "react";

function PurchaseForUseForm() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [purchaseData, setPurchaseData] = useState({
    supplier_name: '',
    product_name: '',
    amount: '',
    quantity: '',
    invoiceDate: '',
    fs_id: ''
  });
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const response = await fetch('/api/dropdown-data');
        if (response.ok) {
          const data = await response.json();
          setStations(data.stations || []);
        } else {
          console.error('Failed to fetch dropdown data');
        }
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPurchaseData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const requiredFields = ['supplier_name', 'product_name', 'amount', 'quantity', 'invoiceDate', 'fs_id'];
    const missingFields = requiredFields.filter(field => !purchaseData[field]);
    
    if (missingFields.length > 0) {
      alert(`कृपया सभी आवश्यक फील्ड्स भरें: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const submitData = {
        supplier_name: purchaseData.supplier_name,
        product_name: purchaseData.product_name,
        amount: parseFloat(purchaseData.amount),
        quantity: parseFloat(purchaseData.quantity),
        invoiceDate: purchaseData.invoiceDate,
        fs_id: parseInt(purchaseData.fs_id)
      };

      const response = await fetch('/api/purchases-for-use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Purchase for use submitted successfully!');
        resetForm();
        router.push('/stock/purchase-for-use-history');
      } else {
        alert(`Error: ${result.message || 'Failed to submit purchase data'}`);
      }
    } catch (error) {
      console.error('Error submitting purchase:', error);
      alert('Network error: Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPurchaseData({
      supplier_name: '',
      product_name: '',
      amount: '',
      quantity: '',
      invoiceDate: '',
      fs_id: ''
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <div className={`fixed lg:static z-40 h-full transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <Sidebar/>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab Navigation - Only Purchase for Use */}
          <div className="flex border-b mb-6">
            <button className="px-6 py-3 font-medium text-lg border-b-2 border-blue-500 text-blue-600">
              Purchase for Use
            </button>
          </div>

          {/* Purchase Form */}
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Supplier Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  name="supplier_name"
                  value={purchaseData.supplier_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter supplier name"
                  required
                />
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="product_name"
                  value={purchaseData.product_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product name"
                  required
                />
              </div>

              {/* Station Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Station *
                </label>
                <select
                  name="fs_id"
                  value={purchaseData.fs_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={fetchLoading}
                >
                  <option value="">Choose Station</option>
                  {stations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.station_name}
                    </option>
                  ))}
                </select>
                {fetchLoading && (
                  <p className="text-sm text-gray-500 mt-1">Loading stations...</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={purchaseData.amount}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter amount"
                  required
                />
              </div>

              {/* Quantity in KG */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (Kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="quantity"
                  value={purchaseData.quantity}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter quantity in kg"
                  required
                />
              </div>

              {/* Invoice Date */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  name="invoiceDate"
                  value={purchaseData.invoiceDate}
                  onChange={handleInputChange}
                  className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4 flex-wrap">
              <button
                type="submit"
                disabled={loading || fetchLoading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Purchase'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium disabled:bg-gray-400"
              >
                Reset
              </button>
              
              {/* View History Button */}
              <button
                type="button"
                onClick={() => router.push('/stock/purchase-for-use-history')}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
              >
                View Purchase History
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading purchase form...</span>
      </div>
    }>
      <PurchaseForUseForm />
    </Suspense>
  );
}