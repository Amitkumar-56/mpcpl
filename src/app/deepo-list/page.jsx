'use client';

import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Main component content
function DeepoListContent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    licence_plate: '',
    first_driver: '',
    first_mobile: '',
    first_start_date: '',
    diesel_ltr: '',
    opening_station: '',
    closing_station: '',
    remarks: '',
    closing1: '',
    closing2: '',
    closing3: '',
    closing4: ''
  });
  
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFormData();
    setFormData(prev => ({
      ...prev,
      first_start_date: new Date().toISOString().split('T')[0]
    }));
  }, []);

  const fetchFormData = async () => {
    try {
      const response = await fetch('/api/deepo-list');
      const result = await response.json();
      
      if (result.success) {
        setItems(result.data.items);
        setEmployees(result.data.employees);
        setVehicles(result.data.vehicles);
        setStations(result.data.stations);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update mobile number when driver is selected
    if (name === 'first_driver') {
      const selectedEmployee = employees.find(emp => emp.name === value);
      if (selectedEmployee) {
        setFormData(prev => ({
          ...prev,
          first_mobile: selectedEmployee.phone
        }));
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        items: items.map(item => ({
          item_id: item.id,
          item_name: item.remarks_name,
          pcs: item.pcs || 0,
          description: item.description || '',
          opening_status: item.opening_status || '',
          closing_status: item.closing_status || ''
        }))
      };

      const response = await fetch('/api/deepo-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/deepo-history?success=1&id=${result.id}`);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An error occurred while saving the data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="responsive-container">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
            <img src="/LOGO_NEW.jpg" alt="Left Logo" className="h-12 sm:h-16" />
            <div className="text-center flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">GYANTI MULTISERVICES PVT. LTD.</h2>
              <div className="mt-1 sm:mt-2 text-gray-600 text-xs sm:text-sm">
                <div><em><strong>Registered Office</strong></em> : Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007</div>
                <div>E-Mail – accounts@gyanti.in</div>
                <div>GSTIN – 09AAGCG6220R1Z3, CIN No. U15549UP2016PTC088333</div>
              </div>
            </div>
            <img src="/LOGO_NEW.jpg" alt="Right Logo" className="h-12 sm:h-16" />
          </div>
        </div>

        {/* Form Title */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800 text-center">
              Deepo Details Form
            </h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Vehicle and Station Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Licence Plate *
              </label>
              <select
                name="licence_plate"
                value={formData.licence_plate}
                onChange={handleInputChange}
                required
                className="responsive-input border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Licence Plate --</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.licence_plate}>
                    {vehicle.licence_plate}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Station *
              </label>
              <select
                name="opening_station"
                value={formData.opening_station}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Station --</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.station_name}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Station
              </label>
              <select
                name="closing_station"
                value={formData.closing_station}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Station --</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.station_name}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diesel LTR *
              </label>
              <input
                type="number"
                name="diesel_ltr"
                value={formData.diesel_ltr}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Driver Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                First Driver Name *
              </label>
              <select
                name="first_driver"
                value={formData.first_driver}
                onChange={handleInputChange}
                required
                className="responsive-input border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Driver --</option>
                {employees.map((emp, index) => (
                  <option key={index} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Mobile No
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                {formData.first_mobile || '-- Select Driver First --'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                name="first_start_date"
                value={formData.first_start_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Item Checklist */}
          <div className="mb-6">
            <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 text-center">
                Item Checklist
              </h3>
            </div>
            
            <div className="responsive-table-container">
              <table className="responsive-table min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pcs
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opening YES
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opening NO
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing YES
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing NO
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.remarks_name}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={item.pcs || 0}
                          onChange={(e) => handleItemChange(index, 'pcs', parseInt(e.target.value))}
                          className="w-16 sm:w-20 px-2 sm:px-2 py-1 sm:py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs sm:text-sm"
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-2 sm:px-2 py-1 sm:py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs sm:text-sm"
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`opening_status_${index}`}
                          value="YES"
                          checked={item.opening_status === 'YES'}
                          onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                          className="focus:ring-blue-500 h-3 sm:h-4 w-3 sm:w-4 text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`opening_status_${index}`}
                          value="NO"
                          checked={item.opening_status === 'NO'}
                          onChange={(e) => handleItemChange(index, 'opening_status', e.target.value)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`closing_status_${index}`}
                          value="YES"
                          checked={item.closing_status === 'YES'}
                          onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`closing_status_${index}`}
                          value="NO"
                          checked={item.closing_status === 'NO'}
                          onChange={(e) => handleItemChange(index, 'closing_status', e.target.value)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Closing Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Closing 1
              </label>
              <input
                type="text"
                name="closing1"
                value={formData.closing1}
                onChange={handleInputChange}
                className="responsive-input border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing 2
              </label>
              <input
                type="text"
                name="closing2"
                value={formData.closing2}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing 3
              </label>
              <input
                type="text"
                name="closing3"
                value={formData.closing3}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing 4
              </label>
              <input
                type="text"
                name="closing4"
                value={formData.closing4}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <input
              type="text"
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4 sm:pt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
            >
              {loading ? 'Saving...' : 'Save Details'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors touch-target"
            >
              Print Form
            </button>
            <button
              type="reset"
              onClick={() => {
                setFormData({
                  licence_plate: '',
                  first_driver: '',
                  first_mobile: '',
                  first_start_date: new Date().toISOString().split('T')[0],
                  diesel_ltr: '',
                  opening_station: '',
                  closing_station: '',
                  remarks: '',
                  closing1: '',
                  closing2: '',
                  closing3: '',
                  closing4: ''
                });
                setItems(items.map(item => ({
                  ...item,
                  pcs: 0,
                  description: '',
                  opening_status: '',
                  closing_status: ''
                })));
              }}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors touch-target"
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function DeepoList() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={null}>
            <DeepoListContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
