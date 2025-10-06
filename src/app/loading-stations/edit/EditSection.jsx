'use client';
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditStation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    manager: '',
    phone: '',
    email: '',
    gst_name: '',
    gst_number: '',
    map_link: ''
  });

  useEffect(() => {
    if (id) {
      fetchStation();
    } else {
      setError('No station ID provided');
      setLoading(false);
    }
  }, [id]);

  const fetchStation = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching station with ID:', id);

      const response = await fetch(`/api/edit-station?id=${id}`);
      const data = await response.json();

      console.log('API response:', data);

      if (data.success) {
        setStation(data.station);
        setFormData({
          manager: data.station.manager || '',
          phone: data.station.phone || '',
          email: data.station.email || '',
          gst_name: data.station.gst_name || '',
          gst_number: data.station.gst_number || '',
          map_link: data.station.map_link || ''
        });
      } else {
        setError(data.error || 'No record found for the provided ID.');
      }
    } catch (error) {
      console.error('Error fetching station:', error);
      setError('Error fetching station data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      console.log('Submitting form data:', { id, ...formData });

      const response = await fetch('/api/edit-station', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData }),
      });

      const data = await response.json();
      console.log('Update response:', data);

      if (data.success) {
        alert('Filling station updated successfully!');
        router.push('/loading-stations');
      } else {
        setError(data.error || 'Error updating station');
      }
    } catch (error) {
      console.error('Error updating station:', error);
      setError('Error updating station: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (station) {
      setFormData({
        manager: station.manager || '',
        phone: station.phone || '',
        email: station.email || '',
        gst_name: station.gst_name || '',
        gst_number: station.gst_number || '',
        map_link: station.map_link || ''
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar className="h-screen sticky top-0" />
        <div className="flex flex-col flex-grow">
          <Header className="sticky top-0 z-10" />
          <main className="flex-grow overflow-auto flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center max-w-md">
              <div className="text-red-500 text-xl font-semibold mb-4">{error}</div>
              <div className="mb-4">Station ID: {id}</div>
              <button
                onClick={fetchStation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/loading-stations')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Back to Stations
              </button>
            </div>
          </main>
          <Footer className="sticky bottom-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Main content with fixed header and footer */}
      <div className="flex flex-col flex-1 w-full">
        {/* Fixed Header */}
        <div className="sticky top-0 z-10">
          <Header />
        </div>

        {/* Scrollable form content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <ol className="flex flex-wrap items-center space-x-2 text-sm">
                <li>
                  <Link href="/" className="text-blue-600 hover:text-blue-800">Home</Link>
                </li>
                <li className="flex items-center">
                  <span className="mx-2 text-gray-400">/</span>
                  <Link href="/loading-stations" className="text-blue-600 hover:text-blue-800">Loading Station</Link>
                </li>
                <li className="flex items-center">
                  <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-600">Edit Station ({id})</span>
                </li>
              </ol>
            </nav>

            {/* Page Title */}
            <div className="flex items-center mb-6">
              <button 
                onClick={() => router.back()} 
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Edit Station</h1>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">Edit Station Details</h2>

              <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
                {['manager','phone','email','gst_name','gst_number'].map(field => (
                  <div key={field} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{field.replace('_',' ').toUpperCase()}</label>
                    <input
                      type={field==='email' ? 'email' : 'text'}
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={field.replace('_',' ')}
                      required
                    />
                  </div>
                ))}

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Google Maps Link</label>
                  <input
                    type="text"
                    name="map_link"
                    value={formData.map_link}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Google Maps Link"
                  />
                </div>

                <div className="md:col-span-2 flex justify-center space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Updating...' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Reset
                  </button>
                </div>
              </form>

              {formData.map_link && (
                <div className="mt-6">
                  <a
                    href={formData.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    View Location on Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Fixed Footer */}
        <div className="sticky bottom-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}