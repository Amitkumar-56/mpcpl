'use client';

import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Sidebar from '../../components/sidebar';

// Add this SearchableSelect component
const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...",
  required = false,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');

  // Find selected option label
  useEffect(() => {
    const selected = options.find(opt => opt.id == value);
    setSelectedLabel(selected ? selected.name : '');
  }, [value, options]);

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option) => {
    onChange({ target: { name, value: option.id } });
    setSelectedLabel(option.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <div
        className="border border-gray-300 rounded p-2 bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedLabel ? 'text-gray-900' : 'text-gray-500'}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Search customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(option)}
                  >
                    {option.name}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500 text-center">
                  No customers found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function CreateRequestPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({ can_view: false, can_edit: false, can_create: false });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productCodes, setProductCodes] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    product_id: '',
    products_codes: '',
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
  const [allowedStations, setAllowedStations] = useState([]);
  const [allowedStationIds, setAllowedStationIds] = useState(new Set());
  const [stationError, setStationError] = useState('');
  const [currentLocation, setCurrentLocation] = useState({ lat: null, lng: null });
  const [areaName, setAreaName] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Product configuration based on product_id
  const productConfig = {
    2: { name: "Industrial Oil 40", type: "liter", min: 1, barrelSize: 200 },
    3: { name: "Industrial Oil 60", type: "liter", min: 1, barrelSize: 200 },
    4: { name: "DEF Lose", type: "liter", min: 1 },
    5: { name: "DEF Bucket", type: "bucket", bucketSize: 20, min: 1 },
  };

  useEffect(() => {
    if (!authLoading) {
      console.log('🔍 [Create Request] Auth loading:', authLoading);
      if (!user) {
        console.log('❌ [Create Request] No user found, redirecting to login');
        router.push('/login');
        return;
      }
      console.log('✅ [Create Request] User found:', { id: user.id, role: user.role, name: user.name });
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_create: true });
      return;
    }
    if (user.permissions && user.permissions['Filling Requests']) {
      const p = user.permissions['Filling Requests'];
      setPermissions({
        can_view: !!p.can_view,
        can_edit: !!p.can_edit,
        can_create: !!p.can_create || !!p.can_edit || false
      });
      setHasPermission(!!p.can_create);
      return;
    }
    const cacheKey = `perms_${user.id}_Filling Requests`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const c = JSON.parse(cached);
      setPermissions(c);
      setHasPermission(!!c.can_create);
      return;
    }
    try {
      const moduleName = 'Filling Requests';
      const [viewRes, editRes, createRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`)
      ]);
      const [viewData, editData, createData] = await Promise.all([viewRes.json(), editRes.json(), createRes.json()]);
      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_create: createData.allowed || false
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      setPermissions(perms);
      setHasPermission(!!perms.can_create);
    } catch {
      setHasPermission(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('🔄 [Create Request] Starting data fetch...');
        setLoading(true);
        setError('');
        
        const [customersRes, productsRes, stationsRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products'),
          fetch('/api/stations')
        ]);

        console.log('📡 [Create Request] API Responses:', {
          customers: customersRes.status,
          products: productsRes.status,
          stations: stationsRes.status
        });

        if (!customersRes.ok) throw new Error('Failed to fetch customers');
        if (!productsRes.ok) throw new Error('Failed to fetch products');
        if (!stationsRes.ok) throw new Error('Failed to fetch stations');

        const [customersData, productsData, stationsData] = await Promise.all([
          customersRes.json(),
          productsRes.json(),
          stationsRes.json()
        ]);

        console.log('📊 [Create Request] Fetched Data:', {
          customersCount: customersData.length,
          productsCount: productsData.length,
          stationsCount: stationsData.length
        });

        setCustomers(customersData);
        setProducts(productsData);
        setProductCodes([]);
        setStations(stationsData);
      } catch (err) {
        console.error('❌ [Create Request] Fetch error:', err);
        setError('Error loading data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!formData.products_codes) return;
    const selectedCode = productCodes.find(p => p.id === parseInt(formData.products_codes));
    if (!selectedCode) return;
    const pcode = (selectedCode.pcode || '').toUpperCase();
    const pid = parseInt(selectedCode.product_id);
    let category = 'retail';
    if (pid === 2 || pid === 3) {
      const norm = pcode.replace(/\s+/g, '');
      const isRetail = norm.endsWith('R') || norm.includes('-R') || pcode.includes('RTL') || pcode.includes('RETAIL');
      category = isRetail ? 'retail' : 'bulk';
    } else if (pid === 4) {
      const norm = pcode.toUpperCase().replace(/\s+/g, '');
      if (norm.includes('BULK') || norm.includes('DEFLB')) category = 'bulk';
      else category = 'retail';
    } else if (pid === 5) {
      if (pcode.includes('BUCKET')) category = 'bulk';
      else category = 'retail';
    }
    let minValue = 1;
    if (pid === 2 || pid === 3) {
      minValue = category === 'bulk' ? 1000 : 1;
    } else if (pid === 4) {
      minValue = category === 'bulk' ? 1000 : 1;
    } else if (pid === 5) {
      minValue = category === 'bulk' ? 1 : 1;
    }
    setSelectedProduct(prev => prev ? { ...prev, min: minValue } : prev);
  }, [formData.products_codes, productCodes]);

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

  // AUTO-SWITCH BULK/RETAIL BASED ON QTY
  useEffect(() => {
    if (!formData.product_id || !productCodes.length || !formData.qty) return;

    const qty = parseInt(formData.qty) || 0;
    const pid = parseInt(formData.product_id);
    let targetType = 'retail';

    if (pid === 2 || pid === 3) { // Ind Oil
      if (qty > 5000) targetType = 'bulk';
    } else if (pid === 4) { // DEF Lose
      if (qty > 3000) targetType = 'bulk';
    } else if (pid === 5) { // DEF Bucket
      if (qty > 3000) targetType = 'bulk';
    }

    // Find matching code
    let targetCode = null;
    if (pid === 2 || pid === 3) {
      targetCode = productCodes.find(c => {
        const pcode = c.pcode.toUpperCase();
        const isRetail = pcode.includes('(R)');
        return targetType === 'retail' ? isRetail : !isRetail;
      });
    } else if (pid === 4) {
      targetCode = productCodes.find(c => {
        const isRetail = c.pcode.toUpperCase().includes('(R)');
        return targetType === 'retail' ? isRetail : !isRetail;
      });
    } else if (pid === 5) {
      targetCode = productCodes.find(c => {
        const isRetail = c.pcode.toUpperCase().includes('(R)');
        return targetType === 'retail' ? isRetail : !isRetail;
      });
    }

    if (targetCode && parseInt(formData.products_codes) !== targetCode.id) {
      console.log(`🔄 Auto-switching to ${targetType} (Code: ${targetCode.pcode}) based on Qty: ${qty}`);
      setFormData(prev => ({ ...prev, products_codes: targetCode.id }));
    }

  }, [formData.qty, formData.product_id, productCodes]);

  // Auto-detect location on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🌍 [Admin] Starting auto-location detection...');
      
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        console.warn('⚠️ [Admin] Geolocation not supported');
        return;
      }

      setLocationLoading(true);
      setLocationError('');
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 [Admin] Location detected:', { latitude, longitude });
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          try {
            const response = await fetch('/api/get-area', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: latitude, lng: longitude })
            });
            
            const data = await response.json();
            if (data.success) {
              setAreaName(data.area_name);
              setLocationError('');
              console.log('✅ [Admin] Auto-detected area:', data.area_name);
            } else {
              console.warn('⚠️ [Admin] Auto-detection failed:', data.message);
              setLocationError(data.message || 'Unable to detect area');
            }
          } catch (error) {
            console.error('❌ [Admin] Error getting area:', error);
            setLocationError('Failed to get area information');
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          setLocationLoading(false);
          let errorMessage = 'Location detection failed';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your GPS/location services.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'An unknown error occurred while getting location.';
          }
          
          setLocationError(errorMessage);
          console.warn('⚠️ [Admin] Auto-location detection failed:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000
        }
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div>Checking permissions...</div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-red-500 text-4xl mb-2">🚫</div>
              <div>You do not have permission to create filling requests.</div>
              <p className="text-sm text-gray-500 mt-2">Create permission is required.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'customer') {
      setStationError('');
      setFormData(prev => ({ ...prev, station_id: '' }));
      setAllowedStations([]);
      setAllowedStationIds(new Set());
      (async () => {
        try {
          const res = await fetch(`/api/cst/customer-stations?customer_id=${value}`);
          const json = await res.json();
          if (json.success) {
            const stationsList = json.stations || [];
            setAllowedStations(stationsList);
            setAllowedStationIds(new Set(stationsList.map(s => parseInt(s.id))));
            setStations(stationsList.length > 0 ? stationsList : []);
          }
        } catch {
          // keep existing stations if fetch fails
        }
      })();
    }

    if (name === 'product_id') {
      const productId = parseInt(value);
      const product = productConfig[productId] || null;
      setSelectedProduct(product);
      setMaxQuantity(product?.maxQuantity || 0);
      setFormData(prev => ({
        ...prev,
        products_codes: '',
        qty: '',
        aty: '',
        request_type: 'Liter'
      }));
      setCalculatedBarrels(0);
      (async () => {
        try {
          if (!value) {
            setProductCodes([]);
            return;
          }
          const res = await fetch(`/api/cst/product-codes?product_id=${value}`);
          const json = await res.json();
          if (json.success) {
            const codes = json.codes || [];
            setProductCodes(codes);

            let defaultCode = null;
            if (productId === 2 || productId === 3) {
              defaultCode = codes.find(c => c.pcode.toUpperCase().includes('(R)'));
            } else if (productId === 4) {
              defaultCode = codes.find(c => c.pcode.toUpperCase().includes('(R)'));
            } else if (productId === 5) {
              defaultCode = codes.find(c => c.pcode.toUpperCase().includes('(R)'));
            }

            if (defaultCode) {
              console.log('🔄 Auto-selecting Default Retail:', defaultCode);
              setFormData(prev => ({ ...prev, products_codes: defaultCode.id }));
            }

          } else {
            setProductCodes([]);
          }
        } catch {
          setProductCodes([]);
        }
      })();
    }

    if (name === 'products_codes') {
      const productCodeId = parseInt(value);
      console.log('🔍 Selected product code ID:', productCodeId);

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

      setCalculatedBarrels(0);
    }
  };

  // Get current location and detect area
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setLocationLoading(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setCurrentLocation({ lat: latitude, lng: longitude })
        
        try {
          const response = await fetch('/api/get-area', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude })
          })
          
          const data = await response.json()
          if (data.success) {
            setAreaName(data.area_name)
            setLocationError('')
          } else {
            setLocationError(data.message || 'Unable to detect area')
          }
        } catch (error) {
          console.error('Error getting area:', error)
          setLocationError('Failed to get area information')
        } finally {
          setLocationLoading(false)
        }
      },
      (error) => {
        setLocationLoading(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out.')
            break
          default:
            setLocationError('An unknown error occurred while getting location.')
        }
      }
    )
  }

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
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();

    if (!selectedProduct) return alert('Please select a product.');
    if (!formData.customer || !formData.products_codes || !formData.station_id ||
      !formData.vehicle_no || !formData.driver_no || !formData.qty)
      return alert('Please fill all required fields.');

    if (allowedStationIds.size > 0 && !allowedStationIds.has(parseInt(formData.station_id))) {
      setStationError('This station is not allotted to this customer');
      return alert('This station is not allotted to this customer');
    } else {
      setStationError('');
    }

    if (formData.vehicle_no.includes(' ')) {
      return alert('❌ Spaces are not allowed in Vehicle Number! Please remove spaces.');
    }

    if (formData.vehicle_no.length < 3) {
      return alert('Please enter a valid vehicle number (minimum 3 characters).');
    }

    if (formData.driver_no.includes(' ')) {
      return alert('❌ Spaces are not allowed in Driver Number! Please remove spaces.');
    }

    if (formData.driver_no.length !== 10) {
      return alert('Please enter exactly 10-digit driver number.');
    }

    const quantity = parseInt(formData.qty) || 0;
    if (selectedProduct.type === 'bucket') {
      const buckets = parseInt(formData.aty) || 0;
      if (buckets < (selectedProduct.min || 1)) {
        const unit = (selectedProduct.min || 1) === 1 ? 'bucket' : 'buckets';
        return alert(`Minimum quantity for this product is ${selectedProduct.min} ${unit}.`);
      }
    } else {
      if (quantity < (selectedProduct.min || 1)) {
        const minUnit = (selectedProduct.min || 1) === 1 ? 'liter' : 'liters';
        return alert(`Minimum quantity for this product is ${selectedProduct.min} ${minUnit}.`);
      }
    }

    setShowConfirmation(true);
  };

  const handleFinalSubmit = async () => {
    try {
      if (!permissions.can_edit) {
        alert('You do not have permission to create filling requests');
        return;
      }
      setSubmitting(true);
      setShowConfirmation(false);

      const selectedProductCode = productCodes.find(p => p.id === parseInt(formData.products_codes));

      if (!selectedProductCode) {
        alert('Invalid product selection');
        return;
      }

      const submitData = {
        ...formData,
        product_name: selectedProduct?.name || '',
        barrels_required: calculatedBarrels,
        products_codes: parseInt(formData.products_codes),
        area_name: areaName,
        customer_lat: currentLocation.lat,
        customer_lng: currentLocation.lng
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
                      <strong>Remarks:</strong> <span>{formData.remarks}</span>
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

          <div className="bg-white shadow-md rounded-lg p-6">
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmitClick}>

              <div className="flex flex-col">
                <label className="mb-1 font-medium">Select Customer *</label>
                <SearchableSelect
                  options={customers}
                  value={formData.customer}
                  onChange={handleChange}
                  placeholder="Search or select customer..."
                  required={true}
                  name="customer"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 font-medium">Select Product *</label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleChange}
                  className="border border-gray-300 rounded p-2"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.pname || p.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="mb-1 font-medium">Select Product Code (Sub-Product) *</label>
                <select
                  name="products_codes"
                  value={formData.products_codes}
                  onChange={() => {}}
                  className="border border-gray-300 rounded p-2"
                  required
                  disabled={true}
                >
                  <option value="">{productCodes.length === 0 ? 'No sub-products available' : 'Select Product Code'}</option>
                  {productCodes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.pcode}
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

              <div className="flex flex-col">
                <label className="mb-1 font-medium">Select Station *</label>
                <select name="station_id" value={formData.station_id} onChange={handleChange}
                  className="border border-gray-300 rounded p-2" required
                >
                  <option value="">Select Station</option>
                  {stations && stations.length > 0 ? (
                    stations.map(s => <option key={s.id} value={s.id}>{s.station_name}</option>)
                  ) : (
                    <option value="" disabled>Loading stations...</option>
                  )}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="mb-1 font-medium">Vehicle Number *</label>
                <input
                  type="text"
                  name="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '');
                    setFormData(prev => ({ ...prev, vehicle_no: cleanValue }));
                  }}
                  className="border border-gray-300 rounded p-2 uppercase"
                  placeholder="e.g. UP15AB1234"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 font-medium">Driver Number *</label>
                <input
                  type="tel"
                  name="driver_no"
                  value={formData.driver_no}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, driver_no: cleanValue }));
                  }}
                  className="border border-gray-300 rounded p-2"
                  maxLength={10}
                  placeholder="10 digits without spaces"
                  required
                />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="mb-1 font-medium">Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  className="border border-gray-300 rounded p-2 h-20"
                  placeholder="Add any notes for this request"
                />
                
              </div>

              {/* Location Section */}
              <div className="flex flex-col md:col-span-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-700">📍 Location Detection</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detection Status
                    </label>
                    <div className={`px-4 py-3 rounded-lg border-2 flex items-center ${
                      areaName
                        ? 'border-green-300 bg-green-50'
                        : locationLoading
                          ? 'border-blue-300 bg-blue-50'
                          : locationError
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300 bg-gray-50'
                    }`}>
                      {locationLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                          <div>
                            <span className="text-blue-700 font-medium">🌍 Detecting location...</span>
                            <div className="text-xs text-blue-600 mt-1">Please allow location access</div>
                          </div>
                        </>
                      ) : areaName ? (
                        <>
                          <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <span className="text-green-800 font-medium">✅ {areaName}</span>
                            <div className="text-xs text-green-600 mt-1">Location captured successfully</div>
                          </div>
                        </>
                      ) : locationError ? (
                        <>
                          <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <span className="text-red-800 font-medium">❌ Detection Failed</span>
                            <div className="text-xs text-red-600 mt-1">{locationError}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-gray-500">Waiting for auto-detection...</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manual Detection
                    </label>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={locationLoading}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        locationLoading
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      {locationLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          Detecting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Try Manual Detection
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detected Area
                    </label>
                    <div className={`px-4 py-3 rounded-lg border-2 min-h-[48px] flex items-center ${
                      areaName
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {areaName ? (
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-800 font-medium">{areaName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">📍 Area will appear here</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coordinates
                    </label>
                    <div className="px-4 py-3 rounded-lg border-2 border-gray-300 bg-gray-50 min-h-[48px] flex items-center">
                      {currentLocation.lat && currentLocation.lng ? (
                        <span className="text-gray-700 font-mono text-sm">
                          📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                        </span>
                      ) : (
                        <span className="text-gray-500">🌍 Coordinates will appear here</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {locationError && (
                  <div className="md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {locationError}
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex justify-start gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button type="button" onClick={handleReset} className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400">
                  Reset
                </button>
              </div>
            </form>
          </div>
        </main>

        <div className="fixed bottom-0 left-0 md:left-64 right-0 z-10">
          <Footer />
        </div>
      </div>
    </div>
  );
}