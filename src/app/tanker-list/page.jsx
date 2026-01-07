'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading components
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading data...</p>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b-2 border-gray-800 pb-6 mb-8">
            <div className="h-20 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="text-center flex-1 mx-8">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-2 animate-pulse"></div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
              </div>
            </div>
            <div className="h-20 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Section Title Skeleton */}
          <div className="text-center mb-8">
            <div className="h-10 bg-gray-200 rounded-lg w-64 mx-auto animate-pulse"></div>
          </div>

          {/* Form Fields Skeleton */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-28 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons Skeleton */}
          <div className="flex justify-center space-x-4 pt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-8">
      <div className="h-8 bg-gray-200 rounded-lg w-48 mx-auto mb-6 animate-pulse"></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(11)].map((_, i) => (
                <th key={i} className="px-4 py-3 border">
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(11)].map((_, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 border">
                    <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MessageAlert({ message, messageType, onClose }) {
  if (!message) return null;

  return (
    <div className={`mb-6 p-4 rounded-lg ${
      messageType === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
    }`}>
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Main form component
function TankerFormContent() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    licence_plate: '',
    first_driver: '',
    first_mobile: '',
    first_start_date: '',
    opening_meter: '',
    closing_meter: '',
    diesel_ltr: '',
    opening_station: '',
    closing_station: '',
    remarks: ''
  });

  const [items, setItems] = useState([]);
  const [dropdownData, setDropdownData] = useState({
    employees: [],
    vehicles: [],
    stations: [],
    items: []
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    fetchDropdownData();
    setFormData(prev => ({
      ...prev,
      first_start_date: new Date().toISOString().split('T')[0]
    }));
  }, []);

  const fetchDropdownData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tanker-list');
      const result = await response.json();

      if (result.success) {
        setDropdownData(result.data);
        
        // Initialize items with default values
        const initializedItems = result.data.items.map(item => ({
          ...item,
          pcs: 0,
          description: '',
          opening_status: '',
          closing_status: '',
          opening_driver_sign: '',
          opening_checker_sign: '',
          closing_driver_sign: '',
          closing_checker_sign: ''
        }));
        setItems(initializedItems);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error fetching data', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
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
    const employee = dropdownData.employees.find(emp => emp.name === selectedDriver);
    
    setFormData(prev => ({
      ...prev,
      first_driver: selectedDriver,
      first_mobile: employee ? employee.phone : ''
    }));
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
    setSubmitting(true);
    setMessage('');

    try {
      const submitData = {
        ...formData,
        items_data: items
      };

      const response = await fetch('/api/tanker-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Tanker created successfully!', 'success');
        setTimeout(() => {
          router.push(`/tanker-history?success=1&id=${result.data.tanker_history_id}`);
        }, 2000);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      showMessage('Error creating tanker', 'error');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const closeMessage = () => {
    setMessage('');
    setMessageType('');
  };

  const handleReset = () => {
    setFormData({
      licence_plate: '',
      first_driver: '',
      first_mobile: '',
      first_start_date: new Date().toISOString().split('T')[0],
      opening_meter: '',
      closing_meter: '',
      diesel_ltr: '',
      opening_station: '',
      closing_station: '',
      remarks: ''
    });

    const resetItems = items.map(item => ({
      ...item,
      pcs: 0,
      description: '',
      opening_status: '',
      closing_status: '',
      opening_driver_sign: '',
      opening_checker_sign: '',
      closing_driver_sign: '',
      closing_checker_sign: ''
    }));
    setItems(resetItems);
  };
}

// Main component with Suspense boundary
export default function TankerList() {
  return (
    <Suspense fallback={null}>
      <TankerFormContent />
    </Suspense>
  );
}