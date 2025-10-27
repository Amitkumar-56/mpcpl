'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Sidebar from '../../components/sidebar';

export default function CreateRequestPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState([]);
  const [productCodes, setProductCodes] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showFullTankMessage, setShowFullTankMessage] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    products_codes: '', // This is product_codes.id
    station_id: '',
    vehicle_no: '',
    driver_no: '',
    request_type: 'Liter',
    qty: '',
    aty: '',
    remarks: '',
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calculatedBarrels, setCalculatedBarrels] = useState(0);
  const [maxQuantity, setMaxQuantity] = useState(0);

  // Product configuration based on product_id
  const productConfig = {
    2: { name: "Industrial Oil 40", type: "liter", min: 1, barrelSize: 200, maxQuantity: 5000 },
    3: { name: "Industrial Oil 60", type: "liter", min: 1, barrelSize: 200, maxQuantity: 5000 },
    4: { name: "DEF Lose", type: "liter", min: 1, maxQuantity: 10000 },
    5: { name: "DEF Bucket", type: "bucket", bucketSize: 20, min: 1, maxQuantity: 100 },
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError('');
        const [customersRes, productCodesRes, stationsRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/create-request'), // This returns product_codes
          fetch('/api/stations')
        ]);

        if (!customersRes.ok) throw new Error('Failed to fetch customers');
        if (!productCodesRes.ok) throw new Error('Failed to fetch product codes');
        if (!stationsRes.ok) throw new Error('Failed to fetch stations');

        const [customersData, productCodesData, stationsData] = await Promise.all([
          customersRes.json(),
          productCodesRes.json(),
          stationsRes.json(),
        ]);

        console.log('📦 Product codes data:', productCodesData);
        setCustomers(customersData);
        setProductCodes(productCodesData);
        setStations(stationsData);
      } catch (err) {
        console.error('❌ Fetch error:', err);
        setError('Error loading data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Barrel calculation - 200 liters per barrel
  useEffect(() => {
    if (selectedProduct?.barrelSize && formData.qty) {
      const qty = parseInt(formData.qty) || 0;
      if (qty === 0) {
        setCalculatedBarrels(0);
      } else {
        let barrels = Math.ceil(qty / 200);
        setCalculatedBarrels(barrels);
      }
    } else {
      setCalculatedBarrels(0);
    }
  }, [formData.qty, selectedProduct]);

  useEffect(() => {
    const currentQty = parseInt(formData.qty) || 0;
    if (selectedProduct?.maxQuantity && currentQty === selectedProduct.maxQuantity) {
      setShowFullTankMessage(true);
    } else {
      setShowFullTankMessage(false);
    }
  }, [formData.qty, selectedProduct]);

  // Handle "full tank" in remarks
  useEffect(() => {
    if (selectedProduct?.maxQuantity) {
      const remarks = formData.remarks.toLowerCase().trim();
      if (remarks === 'full tank' || remarks === 'fulltank') {
        if (selectedProduct.type === 'bucket') {
          const buckets = Math.floor(selectedProduct.maxQuantity / selectedProduct.bucketSize);
          setFormData(prev => ({
            ...prev, 
            aty: buckets.toString(), 
            qty: selectedProduct.maxQuantity.toString()
          }));
        } else {
          setFormData(prev => ({
            ...prev, 
            aty: selectedProduct.maxQuantity.toString(), 
            qty: selectedProduct.maxQuantity.toString()
          }));
        }
        setShowFullTankMessage(true);
      }
    }
  }, [formData.remarks, selectedProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'products_codes') {
      const productCodeId = parseInt(value);
      console.log('🔍 Selected product code ID:', productCodeId);
      
      // Find the selected product code from productCodes array
      const selectedProductCode = productCodes.find(p => p.id === productCodeId);
      console.log('📋 Selected product code:', selectedProductCode);
      
      if (selectedProductCode) {
        const productId = selectedProductCode.product_id;
        const product = productConfig[productId] || null;
        console.log('🎯 Product config for product_id', productId, ':', product);
        
        setSelectedProduct(product);
        setMaxQuantity(product?.maxQuantity || 0);
      } else {
        setSelectedProduct(null);
        setMaxQuantity(0);
      }

      setFormData(prev => ({ 
        ...prev, 
        qty: '', 
        aty: '', 
        request_type: 'Liter' 
      }));
      setCalculatedBarrels(0);
      setShowFullTankMessage(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let qty = formData.qty;
    let aty = formData.aty;

    if (selectedProduct?.type === 'bucket') {
      if (name === 'aty') {
        aty = value;
        qty = (parseInt(value) || 0) * selectedProduct.bucketSize;
      }
    } else {
      if (name === 'aty') {
        aty = value;
        qty = value;
      } else if (name === 'qty') {
        qty = value;
        aty = value;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value, qty, aty }));

    if (name === 'aty' || name === 'qty') {
      const currentQty = parseInt(qty) || 0;
      if (selectedProduct?.maxQuantity && currentQty !== selectedProduct.maxQuantity) {
        setShowFullTankMessage(false);
      }
    }
  };

  const handleFullTank = () => {
    if (selectedProduct?.maxQuantity) {
      if (selectedProduct.type === 'bucket') {
        const buckets = Math.floor(selectedProduct.maxQuantity / selectedProduct.bucketSize);
        setFormData(prev => ({
          ...prev, 
          aty: buckets.toString(), 
          qty: selectedProduct.maxQuantity.toString(),
          remarks: 'FULL TANK'
        }));
      } else {
        setFormData(prev => ({
          ...prev, 
          aty: selectedProduct.maxQuantity.toString(), 
          qty: selectedProduct.maxQuantity.toString(),
          remarks: 'FULL TANK'
        }));
      }
      setShowFullTankMessage(true);
    }
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    if (!selectedProduct) return alert('Please select a product.');
    if (!formData.customer || !formData.products_codes || !formData.station_id || 
        !formData.vehicle_no || !formData.driver_no || !formData.qty)
      return alert('Please fill all required fields.');

    if (formData.driver_no.length !== 10)
      return alert('Please enter a valid 10-digit driver number.');

    const quantity = parseInt(formData.qty) || 0;
    if (quantity < selectedProduct.min)
      return alert(`Minimum quantity for this product is ${selectedProduct.min} liters.`);

    if (selectedProduct.maxQuantity && quantity > selectedProduct.maxQuantity)
      return alert(`Maximum quantity for this product is ${selectedProduct.maxQuantity} liters.`);

    setShowConfirmation(true);
  };

  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setShowConfirmation(false);

      // Find the selected product code to get product_id
      const selectedProductCode = productCodes.find(p => p.id === parseInt(formData.products_codes));
      
      if (!selectedProductCode) {
        alert('Invalid product selection');
        return;
      }

      const submitData = {
        ...formData,
        product_name: selectedProduct?.name || '',
        barrels_required: calculatedBarrels,
        // We only need products_codes (which is product_codes.id)
        products_codes: parseInt(formData.products_codes)
      };

      console.log('📤 Submitting data:', submitData);

      const res = await fetch('/api/submit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      console.log('📨 Response:', data);
      
      if (res.ok && data.success) {
        alert(`Request created successfully! RID: ${data.rid}`);
        router.push('/filling-requests');
      } else {
        alert(data.error || 'Failed to create request.');
      }
    } catch (err) {
      console.error('❌ Submit error:', err);
      alert('An error occurred while creating request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      customer: '',
      products_codes: '',
      station_id: '',
      vehicle_no: '',
      driver_no: '',
      request_type: 'Liter',
      qty: '',
      aty: '',
      remarks: '',
    });
    setSelectedProduct(null);
    setCalculatedBarrels(0);
    setMaxQuantity(0);
    setShowFullTankMessage(false);
    setShowConfirmation(false);
  };

  const getCustomerName = id => customers.find(c => c.id == id)?.name || `Customer ${id}`;
  const getProductName = id => productCodes.find(p => p.id == id)?.pcode || `Product ${id}`;
  const getStationName = id => stations.find(s => s.id == id)?.station_name || `Station ${id}`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="hidden md:block fixed top-0 left-0 h-full w-64 bg-gray-100 shadow-lg z-20">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col md:ml-64">
        <div className="fixed top-0 left-0 md:left-64 right-0 z-10">
          <Header />
        </div>

        <main className="flex-1 mt-20 mb-20 md:mb-16 overflow-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-4">Purchase Request</h1>

          {loading && (
            <div className="bg-white shadow-md rounded-lg p-6 text-center">
              <p className="text-gray-600">Loading data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {showConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                <h3 className="text-xl font-bold mb-4">Confirm Request</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div><strong>Customer:</strong> {getCustomerName(formData.customer)}</div>
                  <div><strong>Product:</strong> {getProductName(formData.products_codes)}</div>
                  <div><strong>Station:</strong> {getStationName(formData.station_id)}</div>
                  <div><strong>Qty:</strong> {formData.qty} L</div>
                  {calculatedBarrels > 0 && (
                    <div><strong>Barrels Required:</strong> {calculatedBarrels}</div>
                  )}
                  <div><strong>Vehicle:</strong> {formData.vehicle_no}</div>
                  <div><strong>Driver:</strong> {formData.driver_no}</div>
                  {formData.remarks && (
                    <div className="md:col-span-2">
                      <strong>Remarks:</strong> <span className={showFullTankMessage ? 'text-red-600 font-bold' : ''}>{formData.remarks}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => setShowConfirmation(false)} 
                    className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleFinalSubmit} 
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Yes, Submit'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="bg-white shadow-md rounded-lg p-6">
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmitClick}>
                
                <div className="flex flex-col">
                  <label className="mb-1 font-medium">Select Customer *</label>
                  <select name="customer" value={formData.customer} onChange={handleChange}
                    className="border border-gray-300 rounded p-2" required>
                    <option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 font-medium">Select Product *</label>
                  <select name="products_codes" value={formData.products_codes} onChange={handleChange}
                    className="border border-gray-300 rounded p-2" required>
                    <option value="">Select Product</option>
                    {productCodes.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.pcode} {p.product_name ? `(${p.product_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-medium">
                      {selectedProduct
                        ? selectedProduct.type === "bucket"
                          ? `No. of Buckets (Min ${selectedProduct.min}) *`
                          : `Liters (Min ${selectedProduct.min}) *`
                        : "Enter Quantity *"}
                    </label>
                    {selectedProduct?.maxQuantity && (
                      <button
                        type="button"
                        onClick={handleFullTank}
                        className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Full Tank
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    name="aty"
                    value={formData.aty}
                    onChange={handleInputChange}
                    placeholder={selectedProduct
                      ? selectedProduct.type === "bucket"
                        ? "Enter number of buckets"
                        : "Enter liters"
                      : "Enter quantity"}
                    className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    min={selectedProduct?.min || 1}
                    max={selectedProduct?.maxQuantity || undefined}
                    required
                  />
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 font-medium">
                    {selectedProduct?.barrelSize ? "Total Barrels" : "Total Liters"}
                  </label>
                  <input
                    type="text"
                    value={
                      selectedProduct?.barrelSize
                        ? `${calculatedBarrels} Barrel${calculatedBarrels > 1 ? "s" : ""} (${formData.qty}L)`
                        : `${formData.qty} Liters`
                    }
                    className="border border-gray-300 rounded p-2 bg-gray-100 text-center font-medium"
                    disabled
                    placeholder="Auto-calculated"
                  />
                  {selectedProduct?.barrelSize && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Each barrel holds 200L
                    </p>
                  )}
                </div>

                {showFullTankMessage && (
                  <div className="md:col-span-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-700 font-semibold text-center">
                      🎉 FULL TANK! Maximum quantity ({maxQuantity} liters) selected.
                    </p>
                  </div>
                )}

                <div className="flex flex-col">
                  <label className="mb-1 font-medium">Select Station *</label>
                  <select name="station_id" value={formData.station_id} onChange={handleChange}
                    className="border border-gray-300 rounded p-2" required>
                    <option value="">Select Station</option>
                    {stations.map(s => <option key={s.id} value={s.id}>{s.station_name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 font-medium">Vehicle Number *</label>
                  <input type="text" name="vehicle_no" value={formData.vehicle_no} onChange={handleChange}
                    className="border border-gray-300 rounded p-2" required />
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 font-medium">Driver Number *</label>
                  <input type="tel" name="driver_no" value={formData.driver_no} onChange={handleChange}
                    pattern="[0-9]{10}" maxLength={10}
                    className="border border-gray-300 rounded p-2" required />
                </div>

                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 font-medium">Remarks</label>
                  <textarea 
                    name="remarks" 
                    value={formData.remarks} 
                    onChange={handleChange}
                    className={`border border-gray-300 rounded p-2 h-20 ${showFullTankMessage ? 'bg-red-50 border-red-300' : ''}`}
                    placeholder="Type 'full tank' to set maximum quantity automatically"
                  />
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-700 text-sm font-medium flex items-center">
                      <span className="mr-2">💡</span>
                      Type Full Tank in Remark and Enter Maximum Quantity in Ltr
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-4">
                  <button type="button" onClick={handleReset} className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400">
                    Reset
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

        <div className="fixed bottom-0 left-0 md:left-64 right-0 z-10">
          <Footer />
        </div>
      </div>
    </div>
  );
}