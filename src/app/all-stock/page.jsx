'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

// Loading component for Suspense fallback
function AllStockLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading stock data...</p>
      </div>
    </div>
  );
}

// Error component
function AllStockError({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-xl mb-4">Error</div>
        <div className="text-gray-600 mb-6">{error}</div>
        <button 
          onClick={onRetry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Success Message Component
function SuccessMessage({ message, onClose }) {
  if (!message) return null;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Success!</span>
        </div>
        <span className="block sm:inline ml-7">{message}</span>
        <button 
          onClick={onClose}
          className="absolute top-0 right-0 px-4 py-3 transition-colors hover:text-green-800"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Add Stock Modal Component
function AddStockModal({ 
  show, 
  onClose, 
  selectedStation, 
  selectedProduct, 
  operationType = 'plus',
  quantity, 
  onQuantityChange, 
  remarks, 
  onRemarksChange, 
  formErrors, 
  onConfirm,
  isFormValid 
}) {
  if (!show || !selectedStation) return null;

  const getProductName = (productId) => {
    const productNames = {
      2: 'Industrial Oil 40',
      3: 'Industrial Oil 60',
      4: 'DEF Loose',
      5: 'DEF Bucket'
    };
    return productNames[productId] || 'Unknown Product';
  };

  const getCurrentStock = () => {
    const productFieldMap = {
      2: 'industrial_oil_40',
      3: 'industrial_oil_60',
      4: 'def_loose',
      5: 'def_bucket'
    };
    
    const fieldName = productFieldMap[selectedProduct];
    return selectedStation[fieldName] || 0;
  };

  const getNewStockTotal = () => {
    const currentStock = getCurrentStock();
    const addedQuantity = parseInt(quantity) || 0;
    return currentStock + addedQuantity;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className={`px-6 py-4 border-b border-gray-200 flex justify-between items-center ${
          operationType === 'minus' ? 'bg-red-50' : 'bg-blue-50'
        }`}>
          <h3 className="text-lg font-semibold text-gray-800">
            {operationType === 'minus' ? 'Minus Stock (Shortage)' : 'Add Stock'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-gray-600">Station:</div>
            <div className="font-semibold">{selectedStation.station_name}</div>
            
            <div className="text-gray-600">Product:</div>
            <div className="font-semibold">{getProductName(selectedProduct)}</div>
            
            <div className="text-gray-600">Current Stock:</div>
            <div className={`font-semibold ${
              getCurrentStock() > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {getCurrentStock()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity to {operationType === 'minus' ? 'Deduct (Shortage)' : 'Add'} *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={onQuantityChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                operationType === 'minus' ? 'focus:ring-red-500' : 'focus:ring-blue-500'
              } ${formErrors.quantity ? 'border-red-500' : 'border-gray-300'}`}
              placeholder={`Enter quantity to ${operationType === 'minus' ? 'deduct' : 'add'}`}
              min="1"
              max="10000"
            />
            {formErrors.quantity && (
              <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={onRemarksChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter remarks"
              rows="3"
              maxLength="500"
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {remarks.length}/500 characters
            </div>
          </div>

          {quantity && !formErrors.quantity && (
            <div className={`p-3 rounded-lg border ${
              operationType === 'minus' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={operationType === 'minus' ? 'text-red-600' : 'text-blue-600'}>
                  {operationType === 'minus' ? 'After Deduction:' : 'New Total:'}
                </div>
                <div className={`font-semibold ${
                  operationType === 'minus' ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {getNewStockTotal()}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 border border-gray-300 rounded-md text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isFormValid}
            className={`px-4 py-2 rounded-md transition-colors duration-200 flex items-center justify-center text-sm sm:text-base ${
              isFormValid 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Proceed to Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
function ConfirmationModal({ 
  show, 
  onClose, 
  selectedStation, 
  selectedProduct, 
  operationType = 'plus',
  quantity, 
  remarks, 
  onSubmit, 
  loading 
}) {
  if (!show || !selectedStation) return null;

  const getProductName = (productId) => {
    const productNames = {
      2: 'Industrial Oil 40',
      3: 'Industrial Oil 60',
      4: 'DEF Loose',
      5: 'DEF Bucket'
    };
    return productNames[productId] || 'Unknown Product';
  };

  const getCurrentStock = () => {
    const productFieldMap = {
      2: 'industrial_oil_40',
      3: 'industrial_oil_60',
      4: 'def_loose',
      5: 'def_bucket'
    };
    
    const fieldName = productFieldMap[selectedProduct];
    return selectedStation[fieldName] || 0;
  };

  const getNewStockTotal = () => {
    const currentStock = getCurrentStock();
    const quantityValue = parseInt(quantity) || 0;
    if (operationType === 'minus') {
      return Math.max(0, currentStock - quantityValue); // Don't go below 0
    }
    return currentStock + quantityValue;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className={`px-6 py-4 border-b border-gray-200 flex justify-between items-center ${
          operationType === 'minus' ? 'bg-red-50' : 'bg-yellow-50'
        }`}>
          <h3 className="text-lg font-semibold text-gray-800">
            {operationType === 'minus' ? 'Confirm Stock Deduction (Shortage)' : 'Confirm Stock Addition'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-center text-yellow-500 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <div className="text-center">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {operationType === 'minus' ? 'Confirm Stock Deduction (Shortage)?' : 'Confirm Stock Addition?'}
            </h4>
            <p className="text-gray-600 text-sm">
              Please review the details below before confirming.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <h5 className="font-medium text-gray-700 mb-3">Stock Details:</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-gray-600">Station:</div>
              <div className="font-semibold">{selectedStation.station_name}</div>
              
              <div className="text-gray-600">Product:</div>
              <div className="font-semibold">{getProductName(selectedProduct)}</div>
              
              <div className="text-gray-600">Current Stock:</div>
              <div className="font-semibold">{getCurrentStock()}</div>
              
              <div className="text-gray-600">{operationType === 'minus' ? 'Deducting Quantity:' : 'Adding Quantity:'}</div>
              <div className={`font-semibold ${
                operationType === 'minus' ? 'text-red-600' : 'text-green-600'
              }`}>
                {operationType === 'minus' ? `-${quantity}` : `+${quantity}`}
              </div>
              
              <div className="text-gray-600 font-medium">{operationType === 'minus' ? 'After Deduction:' : 'New Total:'}</div>
              <div className={`font-semibold ${
                operationType === 'minus' ? 'text-red-700' : 'text-blue-700'
              }`}>{getNewStockTotal()}</div>

              {remarks && (
                <>
                  <div className="text-gray-600">Remarks:</div>
                  <div className="font-semibold text-sm col-span-1">{remarks}</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 border border-gray-300 rounded-md text-sm sm:text-base"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              'Confirm & Add Stock'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Stock Content Component
function AllStockContent() {
  const router = useRouter();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [operationType, setOperationType] = useState('plus'); // 'plus' or 'minus'
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // ✅ Memoize fetchStockData to prevent unnecessary re-renders
  const fetchStockData = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) {
      console.log('⚠️ Fetch already in progress, skipping...');
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/all-stock', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      
      const result = await response.json();
      
      if (!isMountedRef.current) {
        return; // Component unmounted, don't update state
      }
      
      if (result.success) {
        setStockData(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return; // Component unmounted, don't update state
      }
      setError(err.message);
    } finally {
      fetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []); // Empty dependency array - only create once

  useEffect(() => {
    isMountedRef.current = true;
    fetchStockData();
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStockData]);

  const refreshData = () => {
    fetchStockData();
    setSuccessMessage('');
  };

  const validateForm = () => {
    const errors = {};

    if (!quantity || quantity <= 0) {
      errors.quantity = 'Please enter a valid quantity';
    }

    if (quantity > 10000) {
      errors.quantity = 'Quantity is too large';
    }

    if (remarks && remarks.length > 500) {
      errors.remarks = 'Remarks should not exceed 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddStock = (station, productType, operation = 'plus') => {
    setSelectedStation(station);
    setOperationType(operation);
    
    // Map product type to product ID
    const productMap = {
      'industrial_oil_40': 2,
      'industrial_oil_60': 3,
      'def_loose': 4,
      'def_bucket': 5
    };
    
    setSelectedProduct(productMap[productType]);
    setShowAddModal(true);
    setQuantity('');
    setRemarks('');
    setFormErrors({});
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    setShowConfirmModal(true);
  };

  const submitAddStock = async () => {
    try {
      setAddingStock(true);
      
      const response = await fetch('/api/add-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          station_id: selectedStation.station_id,
          product_id: selectedProduct,
          quantity: operationType === 'minus' ? -parseInt(quantity) : parseInt(quantity), // Negative for minus
          remarks: remarks || (operationType === 'minus' ? 'Stock shortage deducted' : 'Stock added'),
          operation_type: operationType
        }),
      });

      const result = await response.json();

      if (result.success) {
        const actionText = operationType === 'minus' ? 'deducted' : 'added';

        // Optimistically update local state so UI reflects change immediately
        const qtyNum = parseInt(quantity) || 0;
        const keyMap = {
          2: 'industrial_oil_40',
          3: 'industrial_oil_60',
          4: 'def_loose',
          5: 'def_bucket'
        };
        const key = keyMap[selectedProduct];

        if (key) {
          setStockData(prev => prev.map(s => {
            if (s.station_id !== selectedStation.station_id) return s;
            const cur = parseInt(s[key] || 0);
            const updated = operationType === 'minus' ? Math.max(0, cur - qtyNum) : cur + qtyNum;
            return { ...s, [key]: updated };
          }));
        }

        setSuccessMessage(`Stock ${actionText} successfully! ${quantity} units of ${getProductName(selectedProduct)} ${actionText} ${operationType === 'minus' ? 'from' : 'to'} ${selectedStation.station_name}`);
        setShowConfirmModal(false);
        setShowAddModal(false);

        // Still refresh data from server after a short delay to ensure consistency
        setTimeout(() => {
          if (isMountedRef.current && !fetchingRef.current) {
            fetchStockData();
          }
        }, 1000);

      } else {
        alert(result.error || `Failed to ${operationType === 'minus' ? 'deduct' : 'add'} stock`);
      }
    } catch (err) {
      alert('Error adding stock: ' + err.message);
    } finally {
      setAddingStock(false);
    }
  };

  const getProductName = (productId) => {
    const productNames = {
      2: 'Industrial Oil 40',
      3: 'Industrial Oil 60',
      4: 'DEF Loose',
      5: 'DEF Bucket'
    };
    return productNames[productId] || 'Unknown Product';
  };

  const isFormValid = () => {
    const quantityNum = parseInt(quantity);
    return quantity && 
           quantityNum > 0 && 
           quantityNum <= 10000 && 
           !formErrors.quantity;
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setQuantity(value);
    
    // Real-time validation
    if (!value || parseInt(value) <= 0) {
      setFormErrors({...formErrors, quantity: 'Please enter a valid quantity'});
    } else if (parseInt(value) > 10000) {
      setFormErrors({...formErrors, quantity: 'Quantity is too large'});
    } else {
      setFormErrors({...formErrors, quantity: ''});
    }
  };

  const handleRemarksChange = (e) => {
    setRemarks(e.target.value);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
  };

  // Show error state if there's an error during initial loading
  if (error && loading === false) {
    return <AllStockError error={error} onRetry={refreshData} />;
  }

  // Show loading state for initial content
  if (loading) {
    return <AllStockLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors mr-4"
                title="Go Back"
              >
                ←
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Stations</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Current inventory across all stations</p>
              </div>
            </div>
            <button 
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Success Message */}
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} />

      {/* Breadcrumb */}
      <nav className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 text-sm py-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors duration-200">
              Home
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-700 font-medium">All Stations</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-800">Stock Summary</h2>
              <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                {stockData.length} Stations
              </span>
            </div>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Station Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Industrial Oil 40
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Industrial Oil 60
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DEF Loose
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DEF Bucket
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockData.length > 0 ? (
                  stockData.map((station, index) => (
                    <tr key={index} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {station.station_name}
                        </div>
                      </td>
                      
                      {/* Industrial Oil 40 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            station.industrial_oil_40 > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {station.industrial_oil_40}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddStock(station, 'industrial_oil_40', 'plus')}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs transition-colors duration-200"
                              title="Add Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddStock(station, 'industrial_oil_40', 'minus')}
                              className="bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs transition-colors duration-200"
                              title="Minus Stock (Shortage)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Industrial Oil 60 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            station.industrial_oil_60 > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {station.industrial_oil_60}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddStock(station, 'industrial_oil_60', 'plus')}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs transition-colors duration-200"
                              title="Add Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddStock(station, 'industrial_oil_60', 'minus')}
                              className="bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs transition-colors duration-200"
                              title="Minus Stock (Shortage)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* DEF Loose */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            station.def_loose > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {station.def_loose}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddStock(station, 'def_loose', 'plus')}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs transition-colors duration-200"
                              title="Add Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddStock(station, 'def_loose', 'minus')}
                              className="bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs transition-colors duration-200"
                              title="Minus Stock (Shortage)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* DEF Bucket */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            station.def_bucket > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {station.def_bucket}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddStock(station, 'def_bucket', 'plus')}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs transition-colors duration-200"
                              title="Add Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddStock(station, 'def_bucket', 'minus')}
                              className="bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs transition-colors duration-200"
                              title="Minus Stock (Shortage)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <div className="text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-8V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v1M9 7h6" />
                        </svg>
                        <p className="text-lg font-medium">No stock data found</p>
                        <p className="text-sm mt-1">There are currently no stock records available.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden">
            <div className="p-4 space-y-4">
              {stockData.length > 0 ? (
                stockData.map((station, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">{station.station_name}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Industrial Oil 40 */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Industrial Oil 40</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            station.industrial_oil_40 > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {station.industrial_oil_40}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddStock(station, 'industrial_oil_40', 'plus')}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs transition-colors"
                              title="Add Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddStock(station, 'industrial_oil_40', 'minus')}
                              className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs transition-colors"
                              title="Minus Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Industrial Oil 60 */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Industrial Oil 60</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            station.industrial_oil_60 > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {station.industrial_oil_60}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddStock(station, 'industrial_oil_60', 'plus')}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs transition-colors"
                              title="Add Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddStock(station, 'industrial_oil_60', 'minus')}
                              className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs transition-colors"
                              title="Minus Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* DEF Loose */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">DEF Loose</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            station.def_loose > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {station.def_loose}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddStock(station, 'def_loose', 'plus')}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs transition-colors"
                              title="Add Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddStock(station, 'def_loose', 'minus')}
                              className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs transition-colors"
                              title="Minus Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* DEF Bucket */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">DEF Bucket</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            station.def_bucket > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {station.def_bucket}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddStock(station, 'def_bucket', 'plus')}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs transition-colors"
                              title="Add Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddStock(station, 'def_bucket', 'minus')}
                              className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs transition-colors"
                              title="Minus Stock"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-8V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v1M9 7h6" />
                  </svg>
                  <p className="text-lg font-medium">No stock data found</p>
                  <p className="text-sm mt-1">There are currently no stock records available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Stock Modal */}
      <AddStockModal
        show={showAddModal}
        onClose={closeAddModal}
        selectedStation={selectedStation}
        selectedProduct={selectedProduct}
        operationType={operationType}
        quantity={quantity}
        onQuantityChange={handleQuantityChange}
        remarks={remarks}
        onRemarksChange={handleRemarksChange}
        formErrors={formErrors}
        onConfirm={handleSubmit}
        isFormValid={isFormValid()}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmModal}
        onClose={closeConfirmModal}
        selectedStation={selectedStation}
        selectedProduct={selectedProduct}
        operationType={operationType}
        quantity={quantity}
        remarks={remarks}
        onSubmit={submitAddStock}
        loading={addingStock}
      />
    </div>
  );
}

// Main Page Component with Suspense
export default function AllStock() {
  return (
    <Suspense fallback={null}>
      <AllStockContent />
    </Suspense>
  );
}