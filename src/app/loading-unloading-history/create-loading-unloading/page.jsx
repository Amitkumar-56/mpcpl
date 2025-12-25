'use client';

import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Inner component content
function CreateLoadingUnloadingContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [formData, setFormData] = useState({
    tanker: '',
    driver: '',
    dispatch: '',
    driver_mobile: '',
    empty_weight_loading: '',
    loaded_weight_loading: '',
    net_weight_loading: '',
    final_loading_datetime: '',
    entered_by_loading: '',
    seal1_loading: '',
    seal2_loading: '',
    seal_datetime_loading: '',
    sealed_by_loading: '',
    density_loading: '',
    temperature_loading: '',
    timing_loading: '',
    consignee: '',
    empty_weight_unloading: '',
    loaded_weight_unloading: '',
    net_weight_unloading: '',
    final_unloading_datetime: '',
    entered_by_unloading: '',
    seal1_unloading: '',
    seal2_unloading: '',
    seal_datetime_unloading: '',
    sealed_by_unloading: '',
    density_unloading: '',
    temperature_unloading: '',
    timing_unloading: ''
  });

  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Check authentication and permissions
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;
    
    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      fetchDropdownData();
      return;
    }
    
    try {
      const response = await fetch(
        `/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent('Loading History')}&action=can_create`
      );
      const data = await response.json();
      
      if (data.allowed) {
        setHasPermission(true);
        fetchDropdownData();
      } else {
        setHasPermission(false);
        setPageLoading(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setPageLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const response = await fetch('/api/loading-unloading-history/create-loading-unloading');
      const result = await response.json();
      
      if (result.success) {
        setEmployees(result.data.employees);
        setVehicles(result.data.vehicles);
      }
      setPageLoading(false);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      setPageLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDriverChange = (e) => {
    const selectedDriver = e.target.value;
    const employee = employees.find(emp => emp.name === selectedDriver);
    
    setFormData(prev => ({
      ...prev,
      driver: selectedDriver,
      driver_mobile: employee ? employee.phone : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/loading-unloading-history/create-loading-unloading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        setTimeout(() => {
          router.push('/loading-unloading-history');
        }, 2000);
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('❌ Error saving record');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadAsPDF = () => {
    const element = document.getElementById('shipmentForm');
    const opt = {
      margin: 10,
      filename: 'shipment_document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // You'll need to install html2pdf.js
    // import html2pdf from 'html2pdf.js';
    // html2pdf().from(element).set(opt).save();
    alert('PDF download functionality - install html2pdf.js to enable');
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to create loading-unloading records.</p>
          <button
            onClick={() => router.push('/loading-unloading-history')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Print
          </button>
          <button
            onClick={downloadAsPDF}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Download as PDF
          </button>
          <button
            type="submit"
            form="shipmentForm"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : '💾 Save Data'}
          </button>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-lg text-center ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Form */}
        <form id="shipmentForm" onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 print:shadow-none">
          {/* Company Header */}
          <div className="flex items-center justify-between mb-6 print:flex print:justify-between">
            <div className="w-20 h-20 flex items-center justify-center">
              <img src="/LOGO_NEW.jpg" alt="Company Logo" className="h-16 w-auto" />
            </div>
            <div className="text-center flex-1 mx-4">
              <h2 className="text-2xl font-bold text-gray-800">GYANTI MULTISERVICES PVT. LTD.</h2>
              <p className="text-gray-600">Tanker Loading & Unloading Checklist</p>
            </div>
            <div className="w-20 h-20 flex items-center justify-center">
              <img src="/LOGO_NEW.jpg" alt="Company Logo" className="h-16 w-auto" />
            </div>
          </div>

          <hr className="mb-6 border-gray-300" />

          <h3 className="text-xl font-semibold text-center mb-6 text-gray-800">
            Supplier Gyanti Multiservices Pvt Ltd
          </h3>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanker Number:
              </label>
              <select
                name="tanker"
                value={formData.tanker}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Select Tanker --</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.licence_plate}>
                    {vehicle.licence_plate}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dispatch From:
              </label>
              <input
                type="text"
                name="dispatch"
                value={formData.dispatch}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver Name:
              </label>
              <select
                name="driver"
                value={formData.driver}
                onChange={handleDriverChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Select Driver --</option>
                {employees.map((emp) => (
                  <option key={emp.name} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver Mobile No:
              </label>
              <input
                type="text"
                name="driver_mobile"
                value={formData.driver_mobile}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
          </div>

          {/* Loading Weights */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Loading Information</h4>
            
            {/* Weight Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empty Weight (Kg)
                </label>
                <input
                  type="number"
                  name="empty_weight_loading"
                  value={formData.empty_weight_loading}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loaded Weight (Kg)
                </label>
                <input
                  type="number"
                  name="loaded_weight_loading"
                  value={formData.loaded_weight_loading}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Net Weight (Kg)
                </label>
                <input
                  type="number"
                  name="net_weight_loading"
                  value={formData.net_weight_loading}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Loading Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Loading Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="final_loading_datetime"
                  value={formData.final_loading_datetime}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entered By Name
                </label>
                <input
                  type="text"
                  name="entered_by_loading"
                  value={formData.entered_by_loading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Seals Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seal No. 01
                </label>
                <input
                  type="text"
                  name="seal1_loading"
                  value={formData.seal1_loading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seal No. 02
                </label>
                <input
                  type="text"
                  name="seal2_loading"
                  value={formData.seal2_loading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Seal Date and Checked By */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seal Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="seal_datetime_loading"
                  value={formData.seal_datetime_loading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Checked By
                </label>
                <select
                  name="sealed_by_loading"
                  value={formData.sealed_by_loading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Checked By --</option>
                  {employees.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Density, Temperature and Timing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Density
                </label>
                <select
                  name="density_loading"
                  value={formData.density_loading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Density --</option>
                  {Array.from({ length: 51 }, (_, i) => (0.800 + i * 0.001).toFixed(3)).map(density => (
                    <option key={density} value={density}>{density}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature (°C)
                </label>
                <select
                  name="temperature_loading"
                  value={formData.temperature_loading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Temperature --</option>
                  {Array.from({ length: 101 }, (_, i) => i).map(temp => (
                    <option key={temp} value={temp}>{temp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timing
                </label>
                <input
                  type="time"
                  name="timing_loading"
                  value={formData.timing_loading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Unloading Information */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Unloading Information (Customer)</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                name="consignee"
                value={formData.consignee}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Unloading Weights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empty Weight (Kg)
                </label>
                <input
                  type="number"
                  name="empty_weight_unloading"
                  value={formData.empty_weight_unloading}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loaded Weight (Kg)
                </label>
                <input
                  type="number"
                  name="loaded_weight_unloading"
                  value={formData.loaded_weight_unloading}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Net Weight (Kg)
                </label>
                <input
                  type="number"
                  name="net_weight_unloading"
                  value={formData.net_weight_unloading}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Unloading Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Unloading Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="final_unloading_datetime"
                  value={formData.final_unloading_datetime}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entered By Name
                </label>
                <input
                  type="text"
                  name="entered_by_unloading"
                  value={formData.entered_by_unloading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Unloading Seals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seal No. 01
                </label>
                <input
                  type="text"
                  name="seal1_unloading"
                  value={formData.seal1_unloading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seal No. 02
                </label>
                <input
                  type="text"
                  name="seal2_unloading"
                  value={formData.seal2_unloading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Unloading Seal Date and Checked By */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seal Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="seal_datetime_unloading"
                  value={formData.seal_datetime_unloading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sealed By
                </label>
                <input
                  type="text"
                  name="sealed_by_unloading"
                  value={formData.sealed_by_unloading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Unloading Density, Temperature and Timing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Density
                </label>
                <select
                  name="density_unloading"
                  value={formData.density_unloading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Density --</option>
                  {Array.from({ length: 51 }, (_, i) => (0.800 + i * 0.001).toFixed(3)).map(density => (
                    <option key={density} value={density}>{density}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature (°C)
                </label>
                <select
                  name="temperature_unloading"
                  value={formData.temperature_unloading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Temperature --</option>
                  {Array.from({ length: 101 }, (_, i) => i).map(temp => (
                    <option key={temp} value={temp}>{temp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timing
                </label>
                <input
                  type="time"
                  name="timing_unloading"
                  value={formData.timing_unloading}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 print:bg-white print:border print:border-gray-300">
            <h4 className="text-lg font-semibold mb-4 text-yellow-800 print:text-gray-800">Important Note</h4>
            <ol className="list-decimal list-inside space-y-3 text-yellow-700 print:text-gray-700">
              <li>Please check the seal number and its position before unloading. If there is any seal broken please do not unload, (Some time in rout any department investigation then they may open our team will inform the same not on last moment).</li>
              <li>Our oil measurement will be considered valid only at the same temperature as during loading. If there is a variation in temperature due to weather, please wait until the product temperature stabilizes to the loading temperature. After the temperature matches, if there is any difference in weight, Gyanti Multiservices will accept such variation as temperature difference.</li>
              <li>Differences may arise due to evaporation, temperature variation, handling losses, and weighing scale accuracy. For petroleum products (Industrial Oil, Base Oil, Lubricant Oil), the normal allowable difference is up to <strong>0.5% of Net Weight</strong>. Gyanti Multiservices will not accept any shortage if it is equal to or less than this parameter. However, if the shortage is above this limit, we are ready to accept it. (For reference, you may check Google for <em>TT Club – Contractual Tolerances in Bulk Material Handling</em>.)</li>
            </ol>
          </div>

          {/* Footer */}
          <div className="text-center border-t border-gray-300 pt-6">
            <p className="font-semibold text-gray-800 text-lg">GYANTI MULTISERVICES PVT. LTD.</p>
            <p className="text-sm text-gray-600 mt-2">
              Registered Office : Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007<br />
              E-Mail – accounts@gyanti.in | GSTIN – 09AAGCGG20R123 | CIN No. U15549UP2016PTC088333
            </p>
          </div>

          {/* Stamp */}
          <div className="text-right mt-6">
            <div className="inline-block border-2 border-gray-400 p-4 rounded">
              <p className="text-sm font-semibold">Company Stamp</p>
              <p className="text-xs text-gray-600">Authorized Signature</p>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        @media print {
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:flex {
            display: flex !important;
          }
          .print\\:justify-between {
            justify-content: space-between !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:border {
            border: 1px solid #d1d5db !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:text-gray-800 {
            color: #1f2937 !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense
export default function CreateLoadingUnloading() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Suspense 
            fallback={
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading form...</p>
                </div>
              </div>
            }
          >
            <CreateLoadingUnloadingContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
