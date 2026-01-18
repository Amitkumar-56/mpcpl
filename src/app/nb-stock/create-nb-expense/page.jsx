// src/app/nb-stock/create-nb-expense/page.jsx
"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Loading Component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading expense form...</p>
            <p className="text-gray-400 text-sm mt-2">Please wait while we load the data</p>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Form Component wrapped in Suspense
function CreateExpenseForm() {
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStation, setSelectedStation] = useState('');
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    title: '',
    reason: '',
    paid_to: '',
    amount: ''
  });

  // Fetch stations data
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await fetch('/api/nb-stock/create-nb-expense');
        const data = await res.json();
        if (data.success) {
          setStations(data.data);
        }
      } catch (error) {
        console.error('Error fetching stations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  // Get selected station details
  const selectedStationDetails = selectedStation 
    ? stations.find(s => `${s.station_id}-${s.product_id}` === selectedStation)
    : null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Get user data
      const userDataStr = localStorage.getItem('user') || sessionStorage.getItem('user') || '{}';
      let userData;
      try {
        userData = JSON.parse(userDataStr);
      } catch {
        userData = {};
      }
      
      const userId = userData.id || 1;
      
      const formDataToSend = new FormData(e.target);
      formDataToSend.append('user_id', userId);
      
      const res = await fetch('/api/nb-stock/create-nb-expense', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await res.json();

      if (result.success) {
        alert(result.message);
        router.push('/nb-stock');
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error creating expense. Please try again.');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedStation('');
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      title: '',
      reason: '',
      paid_to: '',
      amount: ''
    });
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading stations data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header Section */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Create NB Expense
            </h1>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm">
            Add new non-billing expense and deduct stock
          </p>
        </div>

        {/* Stats Cards */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Stations</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                  {new Set(stations.map(s => s.station_id)).size}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Available Products</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                  {new Set(stations.map(s => s.product_id)).size}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Stock Items</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                  {stations.length}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              NB Expense Details
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              Fill expense details and deduct stock
            </p>
          </div>

          {/* Form Content */}
          <div className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Station and Product Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Station and Product *
                </label>
                <select
                  name="station_product"
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white text-sm sm:text-base"
                >
                  <option value="">-- Select Station and Product --</option>
                  {stations.map((row) => {
                    const stockValue = parseFloat(row.stock || 0);
                    const stockDisplay = stockValue > 0 
                      ? `${stockValue.toFixed(2)} Ltr` 
                      : '0.00 Ltr';
                    return (
                      <option
                        key={`${row.station_id}-${row.product_id}`}
                        value={`${row.station_id}-${row.product_id}`}
                        style={{
                          color: stockValue <= 0 ? '#999' : '#000'
                        }}
                      >
                        {row.station_name} - {row.pname} | Stock: {stockDisplay}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Selected Station Info */}
              {selectedStationDetails && (
                <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
                  parseFloat(selectedStationDetails.stock || 0) > 0 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className={`font-semibold text-sm sm:text-base ${
                        parseFloat(selectedStationDetails.stock || 0) > 0 
                          ? 'text-blue-900' 
                          : 'text-yellow-900'
                      }`}>
                        Selected Item Info
                      </h4>
                      <p className={`text-xs sm:text-sm mt-1 ${
                        parseFloat(selectedStationDetails.stock || 0) > 0 
                          ? 'text-blue-700' 
                          : 'text-yellow-700'
                      }`}>
                        <span className="font-medium">Station:</span> {selectedStationDetails.station_name}
                        <span className="mx-2">|</span>
                        <span className="font-medium">Product:</span> {selectedStationDetails.pname}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`text-xs sm:text-sm font-medium ${
                        parseFloat(selectedStationDetails.stock || 0) > 0 
                          ? 'text-blue-900' 
                          : 'text-yellow-900'
                      }`}>
                        Current Stock
                      </p>
                      <p className={`text-lg sm:text-xl font-bold ${
                        parseFloat(selectedStationDetails.stock || 0) > 0 
                          ? 'text-blue-700' 
                          : 'text-yellow-700'
                      }`}>
                        {parseFloat(selectedStationDetails.stock || 0).toFixed(2)} Ltr
                      </p>
                      {parseFloat(selectedStationDetails.stock || 0) <= 0 && (
                        <p className="text-xs text-yellow-600 mt-1">⚠️ Low stock</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Date and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={formData.payment_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Stock to Deduct (Ltr) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="Enter quantity in liters"
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter quantity in liters to deduct from stock</p>
                </div>
              </div>

              {/* Title and Paid To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expense Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Maintenance, Repair, Supplies"
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Paid To / Vendor *
                  </label>
                  <input
                    type="text"
                    name="paid_to"
                    value={formData.paid_to}
                    onChange={handleInputChange}
                    placeholder="Enter vendor or recipient name"
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description / Reason
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Describe the purpose of this expense..."
                  rows="3"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none text-sm sm:text-base"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting || (selectedStationDetails && parseFloat(selectedStationDetails.stock || 0) <= 0)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 text-sm sm:text-base"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Expense...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Expense & Deduct Stock
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Reset Form
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs font-medium text-blue-900">Note:</p>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li>• Stock will be automatically deducted from selected station/product</li>
                <li>• Expense record and audit log will be created</li>
                <li>• You cannot deduct more than available stock</li>
                <li>• Expense will be linked to your user account</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function CreateNbExpensePage() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen">
        <div className="flex-shrink-0">
          <Header />
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <CreateExpenseForm />
        </Suspense>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}