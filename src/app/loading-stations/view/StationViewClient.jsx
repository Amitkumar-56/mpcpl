'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StationViewClient() {
  const searchParams = useSearchParams();
  const stationId = searchParams.get('id');
  
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stationId) {
      fetchStationDetails();
    }
  }, [stationId]);

  const fetchStationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/loading-stations/view?id=${stationId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();

      if (result.success) {
        setStationData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch station details');
      }
    } catch (error) {
      console.error('Error fetching station details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    
    // Convert status to string and handle null/undefined
    const statusStr = String(status || '').toLowerCase();
    
    if (statusStr === 'enable' || statusStr === '1' || statusStr === 'active') {
      return `${baseClasses} bg-green-100 text-green-800`;
    } else if (statusStr === 'disable' || statusStr === '0' || statusStr === 'inactive') {
      return `${baseClasses} bg-red-100 text-red-800`;
    } else {
      return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusText = (status) => {
    const statusStr = String(status || '').toLowerCase();
    
    if (statusStr === 'enable' || statusStr === '1' || statusStr === 'active') {
      return 'Enable';
    } else if (statusStr === 'disable' || statusStr === '0' || statusStr === 'inactive') {
      return 'Disable';
    } else {
      return String(status || 'Unknown');
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading station details...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !stationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {!stationId ? 'Station ID Required' : 'Error Loading Station'}
          </h2>
          <p className="text-gray-600 mb-4">
            {!stationId ? 'Please provide a station ID in the URL.' : error}
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.href = '/loading-stations'}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View All Stations
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No Data State
  if (!stationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Station Not Found</h2>
          <p className="text-gray-600 mb-4">The requested station could not be found.</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.href = '/loading-stations'}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View All Stations
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { station, products } = stationData;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <button 
              onClick={() => window.history.back()} 
              className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Loading Station</h1>
              <nav className="flex mt-2">
                <ol className="flex items-center space-x-2 text-sm">
                  <li>
                    <a href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
                      Home
                    </a>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <a href="/loading-stations" className="ml-2 text-blue-600 hover:text-blue-800 transition-colors">
                      Loading Stations
                    </a>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="ml-2 text-gray-500">{station.station_name || 'Unknown Station'}</span>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Station Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Station Details (ID: {station.id})
              </h2>
              <span className={getStatusBadge(station.status)}>
                {getStatusText(station.status)}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Information */}
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Basic Information
                  </h3>
                  <dl className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Station Name</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">{station.station_name || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="mt-1 text-sm text-gray-900 leading-relaxed">{station.address || 'N/A'}</dd>
                      </div>
                    </div>
                  </dl>
                </div>

                {/* Manager & Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Contact Information
                  </h3>
                  <dl className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Manager</dt>
                        <dd className="mt-1 text-sm text-gray-900">{station.manager || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{station.phone || 'N/A'}</dd>
                      </div>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900 break-all">{station.email || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Right Column - GST & Products */}
              <div className="space-y-6">
                {/* GST Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    GST Information
                  </h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">GST Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{station.gst_name || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">GST Number</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded border">{station.gst_number || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Product Stocks */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Product Stocks
                  </h3>
                  {products && products.length > 0 ? (
                    <div className="space-y-3">
                      {products.map((product) => (
                        <div 
                          key={product.product_id} 
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <div>
                            <span className="text-sm font-medium text-gray-700">{product.pname || 'Unknown Product'}</span>
                          </div>
                          <span className="text-sm font-semibold text-blue-600 bg-white px-3 py-1 rounded-full border">
                            {product.stock || 0} units
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-sm text-gray-500">No products found for this station</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(station.created)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Station Status</dt>
                  <dd className="mt-1">
                    <span className={getStatusBadge(station.status)}>
                      {getStatusText(station.status)}
                    </span>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Back to Previous Page
          </button>
          <button
            onClick={() => window.location.href = '/loading-stations'}
            className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            View All Stations
          </button>
          <button
            onClick={() => window.location.href = '/loading-stations/add-station'}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Add New Station
          </button>
        </div>
      </div>
    </main>
  );
}