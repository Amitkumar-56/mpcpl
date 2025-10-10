// src/app/suppliers/purchase/PurchaseContent.jsx
'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useState } from 'react';

export default function PurchaseContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sale');
  const [purchaseData, setPurchaseData] = useState({
    // Common fields
    supplierName: '',
    invoiceNumber: '',
    invoiceDate: '',
    productName: '',
    
    // Purchase for Sale fields
    ewayBillNumber: '',
    ewayBillExpiryDate: '',
    density: '',
    quantityInKg: '',
    quantityInLtr: '',
    tankerNumber: '',
    driverNumber: '',
    lrNo: '',
    invoiceAmount: '',
    debitNote: '',
    creditNote: '',

    // Purchase for Use fields
    amount: ''
  });

  const [status, setStatus] = useState('on_the_way');
  const [quantityChanged, setQuantityChanged] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPurchaseData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = {
      type: activeTab,
      ...purchaseData,
      status,
      quantityChanged
    };

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert('Purchase data submitted successfully!');
        // Reset form
        setPurchaseData({
          supplierName: '',
          invoiceNumber: '',
          invoiceDate: '',
          productName: '',
          ewayBillNumber: '',
          ewayBillExpiryDate: '',
          density: '',
          quantityInKg: '',
          quantityInLtr: '',
          tankerNumber: '',
          driverNumber: '',
          lrNo: '',
          invoiceAmount: '',
          debitNote: '',
          creditNote: '',
          amount: ''
        });
        setStatus('on_the_way');
        setQuantityChanged(false);
      }
    } catch (error) {
      console.error('Error submitting purchase:', error);
      alert('Error submitting purchase data');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <div className={`fixed lg:static z-40 h-full transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <Sidebar activePage="Customers" onClose={() => setSidebarOpen(false)} />
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
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          title="Purchase Management"
          subtitle="Manage your purchases and track inventory"
        />

        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab Navigation */}
          <div className="flex border-b mb-6">
            <button 
              className={`px-6 py-3 font-medium text-lg ${
                activeTab === 'sale' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('sale')}
            >
              Purchase for Sale
            </button>
            <button 
              className={`px-6 py-3 font-medium text-lg ${
                activeTab === 'use' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('use')}
            >
              Purchase for Use
            </button>
          </div>

          {/* Purchase Form */}
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            {activeTab === 'sale' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Your form fields for sale */}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Your form fields for use */}
              </div>
            )}

            {/* Status Selection */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Status
              </label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full md:w-1/3 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="on_the_way">On the Way</option>
                <option value="reported">Reported</option>
                <option value="unloaded">Unloaded</option>
              </select>
            </div>

            {/* Quantity Change Check */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={quantityChanged}
                  onChange={(e) => setQuantityChanged(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5" 
                />
                <span className="ml-3 text-sm font-medium text-gray-700">Is there any change in quantity?</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Submit Purchase
              </button>
              <button
                type="button"
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Edit
              </button>
              <button
                type="button"
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Payment
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