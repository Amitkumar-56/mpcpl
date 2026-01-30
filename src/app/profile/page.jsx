'use client';

import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';

export default function ProfilePage() {
  const { user, loading: authLoading } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching profile for user:', user?.id || user?.emp_id);
      
      const response = await fetch('/api/profile', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Profile API response status:', response.status);

      const result = await response.json();
      console.log('📦 Profile API result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch profile');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch profile');
      }

      if (!result.data) {
        throw new Error('No profile data received');
      }

      console.log('✅ Profile data received:', result.data);
      console.log('🔍 Profile Role:', result.data?.role, 'Station:', result.data?.station);
      console.log('🔍 Profile Station Details:', result.data?.station_details);
      console.log('🔍 Profile FS_ID:', result.data?.fs_id, 'FL_ID:', result.data?.fl_id);
      setProfile(result.data);
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <div className={`fixed lg:static z-40 h-full transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Profile</h2>
              </div>

              {authLoading || loading ? (
                <div className="p-6 sm:p-8 flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading profile...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="p-4 sm:p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 max-w-md mx-auto">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-red-800">Error</h3>
                        <p className="text-sm sm:text-base text-red-600 mt-1">{error}</p>
                        <button
                          onClick={fetchProfile}
                          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : profile ? (
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Employee Code</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profile.emp_code || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profile.name || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md break-words">{profile.email || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profile.phone || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profile.phonealt || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Role</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                        {profile.status === 0 ? 'Inactive Staff' : 
                         profile.role === 5 ? 'Admin' : 
                         profile.role === 4 ? 'Accountant' :
                         profile.role === 3 ? 'Team Leader' :
                         profile.role === 2 ? 'Incharge' : 
                         profile.role === 1 ? 'Staff' :
                         profile.role === 6 ? 'Driver' : 'User'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          profile.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {profile.status === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Station</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                        {profile.station_names || 
                         (profile.station_details && profile.station_details.length > 0 
                          ? profile.station_details.map(station => station.station_name || `Station ${station.id}`).join(', ')
                          : profile.station || profile.fs_id || profile.fl_id || 'N/A')
                        }
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Address</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md break-words">{profile.address || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">City</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profile.city || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Region</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profile.region || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Country</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profile.country || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Postbox</label>
                      <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profile.postbox || 'N/A'}</p>
                    </div>

                    {profile.salary && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Salary</label>
                        <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md font-semibold">
                          ₹{parseFloat(profile.salary).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}

                    {profile.account_details && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Account Details</label>
                        <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md break-words">{profile.account_details}</p>
                      </div>
                    )}

                    {profile.created_at && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Created At</label>
                        <p className="text-sm sm:text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                          {new Date(profile.created_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-6">
                  <div className="text-center py-8">
                    <p className="text-sm sm:text-base text-gray-500 mb-4">No profile data available</p>
                    <button
                      onClick={fetchProfile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

