'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoadingStationViewContent() {
  const searchParams = useSearchParams();
  const stationId = searchParams.get('id');
  
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stationId) {
      fetchStationDetails(stationId);
    }
  }, [stationId]);

  const fetchStationDetails = async (id) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/cst/loading-stations/${id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch station details');
      }
      
      setStation(data.station);
    } catch (err) {
      setError(err.message);
      setStation(null);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading station details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <div className="text-yellow-600 text-lg font-semibold mb-2">Station Not Found</div>
            <p className="text-yellow-700">The requested station could not be found.</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Stations
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{station.station_name}</h1>
          <p className="text-gray-600 mt-2">Station ID: {station.id}</p>
        </div>

        {/* Station Details Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Station Information</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Station Name</label>
                    <p className="mt-1 text-sm text-gray-900">{station.station_name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Station ID</label>
                    <p className="mt-1 text-sm text-gray-900">{station.id}</p>
                  </div>
                  
                  {station.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <a
                        href={`tel:${station.phone}`}
                        className="mt-1 inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                        </svg>
                        {station.phone}
                      </a>
                    </div>
                  )}
                  
                  {station.address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1 text-sm text-gray-900">{station.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Map & Actions */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Location & Actions</h2>
                <div className="space-y-4">
                  {station.map_link ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Map Location</label>
                        <a
                          href={station.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                          </svg>
                          Open in Maps
                        </a>
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => copyMapLink(station.map_link)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg>
                          Copy Link
                        </button>
                        
                        <button
                          onClick={() => shareNow(station.station_name, station.phone, station.map_link)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                          </svg>
                          Share
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-yellow-700 text-sm">No map location available for this station.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {(station.description || station.operating_hours) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {station.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">{station.description}</p>
                    </div>
                  )}
                  
                  {station.operating_hours && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
                      <p className="mt-1 text-sm text-gray-900">{station.operating_hours}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}