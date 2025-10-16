//src/app/suppliers/purchase/PurchaseContent.jsx
'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useEffect, useState } from 'react';

export default function PurchaseContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sale');
  const [purchaseData, setPurchaseData] = useState({
    // Common fields
    supplier_id: '',
    product_id: '',
    station_id: '',
    invoiceNumber: '',
    invoiceDate: '',
    
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
    amount: '',
    unit: '',
    quantity: '',
    productName: ''
  });

  const [formData, setFormData] = useState({
    suppliers: [],
    products: [],
    stations: []
  });

  const [status, setStatus] = useState('on_the_way');
  const [quantityChanged, setQuantityChanged] = useState(false);
  const [quantityChangeReason, setQuantityChangeReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const response = await fetch('/api/dropdown-data');
        if (response.ok) {
          const data = await response.json();
          setFormData({
            suppliers: data.suppliers || [],
            products: data.products || [],
            stations: data.stations || []
          });
        } else {
          console.error('Failed to fetch dropdown data');
        }
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };

    fetchDropdownData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setPurchaseData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate required fields based on tab
    const requiredFields = {
      sale: ['supplier_id', 'product_id', 'station_id', 'invoiceNumber', 'invoiceDate', 'invoiceAmount'],
      use: ['supplier_id', 'product_id', 'invoiceNumber', 'invoiceDate', 'amount', 'quantity', 'unit']
    };

    const missingFields = requiredFields[activeTab].filter(field => !purchaseData[field]);
    
    if (missingFields.length > 0) {
      alert(`Please fill all required fields: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }

    const submitData = {
      type: activeTab,
      ...purchaseData,
      status,
      quantityChanged,
      quantity_change_reason: quantityChangeReason,
      // Ensure numeric fields are properly formatted
      debitNote: purchaseData.debitNote || 0,
      creditNote: purchaseData.creditNote || 0,
      // For purchase for use, set quantity_kg from quantity field
      quantityInKg: activeTab === 'use' ? purchaseData.quantity : purchaseData.quantityInKg
    };

    console.log('Submitting data:', submitData);

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Purchase data submitted successfully!');
        resetForm();
      } else {
        alert(`Error: ${result.message || 'Failed to submit purchase data'}`);
        console.error('Backend error:', result);
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
      supplier_id: '',
      product_id: '',
      station_id: '',
      invoiceNumber: '',
      invoiceDate: '',
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
      amount: '',
      unit: '',
      quantity: '',
      productName: ''
    });
    setStatus('on_the_way');
    setQuantityChanged(false);
    setQuantityChangeReason('');
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
                {/* Supplier Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Supplier *</label>
                  <select
                    name="supplier_id"
                    value={purchaseData.supplier_id}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {formData.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Product Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Product *</label>
                  <select
                    name="product_id"
                    value={purchaseData.product_id}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                    required
                  >
                    <option value="">Select Product</option>
                    {formData.products.map(p => (
                      <option key={p.id} value={p.id}>{p.pname}</option>
                    ))}
                  </select>
                </div>

                {/* Station Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Station *</label>
                  <select
                    name="station_id"
                    value={purchaseData.station_id}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                    required
                  >
                    <option value="">Choose Station</option>
                    {formData.stations.map(s => (
                      <option key={s.id} value={s.id}>{s.station_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Eway Bill Number
                  </label>
                  <input
                    type="text"
                    name="ewayBillNumber"
                    value={purchaseData.ewayBillNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Eway Bill Expiry Date
                  </label>
                  <input
                    type="date"
                    name="ewayBillExpiryDate"
                    value={purchaseData.ewayBillExpiryDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={purchaseData.invoiceNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    name="invoiceDate"
                    value={purchaseData.invoiceDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Density
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="density"
                    value={purchaseData.density}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity in Kg
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="quantityInKg"
                    value={purchaseData.quantityInKg}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity in Ltr
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="quantityInLtr"
                    value={purchaseData.quantityInLtr}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanker Number
                  </label>
                  <input
                    type="text"
                    name="tankerNumber"
                    value={purchaseData.tankerNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Number
                  </label>
                  <input
                    type="text"
                    name="driverNumber"
                    value={purchaseData.driverNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LR No
                  </label>
                  <input
                    type="text"
                    name="lrNo"
                    value={purchaseData.lrNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="invoiceAmount"
                    value={purchaseData.invoiceAmount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
             
                
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Supplier Dropdown for Purchase for Use */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Supplier *</label>
                  <select
                    name="supplier_id"
                    value={purchaseData.supplier_id}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {formData.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Product Dropdown for Purchase for Use */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Product *</label>
                  <select
                    name="product_id"
                    value={purchaseData.product_id}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                    required
                  >
                    <option value="">Select Product</option>
                    {formData.products.map(p => (
                      <option key={p.id} value={p.id}>{p.pname}</option>
                    ))}
                  </select>
                </div>

                {/* Unit Dropdown - Only KG */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                  <select
                    name="unit"
                    value={purchaseData.unit}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600"
                    required
                  >
                    <option value="">Select Unit</option>
                    <option value="kg">Kilogram (Kg)</option>
                  </select>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={purchaseData.invoiceNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    name="invoiceDate"
                    value={purchaseData.invoiceDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={purchaseData.amount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={purchaseData.productName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Additional product description"
                  />
                </div>
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
              <label className="flex items-center mb-3">
                <input 
                  type="checkbox" 
                  checked={quantityChanged}
                  onChange={(e) => setQuantityChanged(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5" 
                />
                <span className="ml-3 text-sm font-medium text-gray-700">Is there any change in quantity?</span>
              </label>
              
              {quantityChanged && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Change Reason
                  </label>
                  <input
                    type="text"
                    value={quantityChangeReason}
                    onChange={(e) => setQuantityChangeReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Reason for quantity change"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                type="submit"
                disabled={loading}
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
              <button
                type="button"
                disabled={loading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium disabled:bg-green-400"
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