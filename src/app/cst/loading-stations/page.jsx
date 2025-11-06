// src/app/cst/loading-stations/page.jsx
'use client';
import { useEffect, useState } from 'react';

export default function LoadingStationsPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    const savedCustomer = localStorage.getItem("customer");
    if (!savedCustomer) {
      window.location.href = "/cst/login";
      return;
    }
    
    const customerData = JSON.parse(savedCustomer);
    setCustomer(customerData);
    
    // Use logged-in customer's ID
    if (customerData && customerData.id) {
      fetchStations(customerData.id);
    }
  }, []);

  const fetchStations = async (customerId) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/cst/loading-stations?cid=${customerId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stations');
      }
      
      setStations(data.stations || []);
    } catch (err) {
      setError(err.message);
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  const copyMapLink = (mapLink) => {
    if (mapLink) {
      navigator.clipboard.writeText(mapLink).then(() => {
        alert("✅ Map link copied to clipboard!");
      }).catch(err => {
        console.error("Copy failed", err);
        alert("❌ Failed to copy link");
      });
    } else {
      alert("❌ No map link found!");
    }
  };

  const shareNow = (name, phone, mapLink) => {
    const textToShare = `Station: ${name}\nPhone: ${phone}\nMap: ${mapLink}`;
    const whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(textToShare);
    window.open(whatsappUrl, "_blank");
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Filling Station Details</h1>
        </div>

        {/* Customer Info Display */}
        <div className="mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900">
              Customer ID: {customer.id}
            </h2>
            <p className="text-gray-600">Name: {customer.name}</p>
            {customer.station && (
              <p className="text-gray-600">Station: {customer.station}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading stations...</span>
          </div>
        )}

        {/* Stations Table */}
        {!loading && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              {stations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Station ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Station Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Map Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stations.map((station) => (
                        <tr key={station.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {station.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {station.station_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {station.phone ? (
                              <a
                                href={`tel:${station.phone}`}
                                className="inline-flex items-center px-3 py-1 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 transition-colors"
                              >
                                📞 {station.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400">No phone</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {station.map_link ? (
                              <a
                                href={station.map_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                              >
                                View Map
                              </a>
                            ) : (
                              <span className="text-gray-400">No map link</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {/* Copy URL Section */}
                            <div className="flex items-center border-b border-gray-200 pb-2 mb-2">
                              <span className="flex-1 text-gray-900 text-xs truncate mr-2">
                                {station.map_link || 'No map link available'}
                              </span>
                              {station.map_link && (
                                <button
                                  onClick={() => copyMapLink(station.map_link)}
                                  className="text-teal-600 font-semibold text-xs hover:text-teal-700 transition-colors whitespace-nowrap"
                                >
                                  COPY LINK
                                </button>
                              )}
                            </div>
                            
                            {/* Share Button */}
                            <button
                              onClick={() => shareNow(
                                station.station_name,
                                station.phone,
                                station.map_link
                              )}
                              disabled={!station.map_link}
                              className="inline-flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs"
                            >
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                              </svg>
                              Share
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 inline-block">
                    <p className="text-yellow-700">
                      No station details found for your account!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}