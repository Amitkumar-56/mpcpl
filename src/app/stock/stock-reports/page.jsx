// src/app/stock/stock-reports/page.jsx
'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Main component wrapped with Suspense
export default function StockReportsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FillingHistory />
    </Suspense>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading filling history...</p>
      </div>
    </div>
  );
}

// Your existing FillingHistory component
function FillingHistory() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [selectedStation, setSelectedStation] = useState('');
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: ''
  });
  const router = useRouter();

  const columns = [
    'fs_name',
    'product_name', 
    'trans_type',
    'current_stock',
    'filling_qty',
    'available_stock',
    'filling_date',
    'created_by_name'
  ];

  const fetchHistory = async (filterParams = {}) => {
    try {
      setLoading(true);
      const params = { ...filterParams };
      if (selectedStation) {
        params.station = selectedStation;
      }
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`/api/stock/stock-reports?${queryParams}`);
      
      if (response.ok) {
        const result = await response.json();
        setHistoryData(result.data || []);
      } else {
        console.error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchHistory(filters);
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        export: 'true'
      }).toString();
      
      const response = await fetch(`/api/stock/stock-reports?${queryParams}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `filling_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Fetch stations from database
  const fetchStations = async () => {
    try {
      setLoadingStations(true);
      const response = await fetch('/api/stock/stock-reports?fetch_stations=true');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.stations) {
          setStations(result.stations.map(station => station.station_name));
          console.log('✅ Stations loaded:', result.stations.length);
        }
      } else {
        console.error('Failed to fetch stations');
        // Fallback to hardcoded stations if API fails
        setStations(['Agra', 'Nellore', 'Kushinagar', 'Gurgaon', 'Baharagora', 'Krishnagiri']);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      // Fallback to hardcoded stations if API fails
      setStations(['Agra', 'Nellore', 'Kushinagar', 'Gurgaon', 'Baharagora', 'Krishnagiri']);
    } finally {
      setLoadingStations(false);
    }
  };

  useEffect(() => {
    fetchStations();
    fetchHistory();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Filling History</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Station Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Station</h2>
          {loadingStations ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading stations...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedStation('');
                  fetchHistory(filters);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedStation === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Stations
              </button>
              {stations.length > 0 ? (
                stations.map((station) => (
                  <button
                    key={station}
                    type="button"
                    onClick={() => {
                      setSelectedStation(station);
                      fetchHistory(filters);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedStation === station
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {station}
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No stations available</p>
              )}
            </div>
          )}
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <form onSubmit={handleFilter} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="end_date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
              >
                Export
              </button>
            </div>
          </form>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filling History</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S No
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column === 'created_by_name' 
                        ? 'Created By' 
                        : column.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : historyData.length > 0 ? (
                  historyData.map((row, index) => (
                    <tr key={row.rid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {column === 'filling_date' 
                            ? new Date(row[column]).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })
                            : column === 'created_by_name'
                            ? row[column] || 'N/A'
                            : row[column]}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}