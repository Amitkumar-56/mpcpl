'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { BiEdit, BiHistory, BiShow, BiChevronDown, BiChevronUp } from "react-icons/bi";
import EntityLogs from "@/components/EntityLogs";

export default function LoadingStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [stationFilterInfo, setStationFilterInfo] = useState(null);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false
  });
  const [expandedStations, setExpandedStations] = useState({}); // Track which stations have logs expanded
  const router = useRouter();
  const { user, loading: authLoading } = useSession();

  const toggleStationLogs = (stationId) => {
    setExpandedStations(prev => ({
      ...prev,
      [stationId]: !prev[stationId]
    }));
  };

  // Check permissions first
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true });
      fetchStations();
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['Loading Station']) {
      const stationPerms = user.permissions['Loading Station'];
      if (stationPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: stationPerms.can_view,
          can_edit: stationPerms.can_edit,
          can_delete: stationPerms.can_delete
        });
        fetchStations();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Loading Station`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchStations();
        return;
      }
    }

    try {
      const moduleName = 'Loading Station';
      const [viewRes, editRes, deleteRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`)
      ]);

      const [viewData, editData, deleteData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        deleteRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed
      };

      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        fetchStations();
      } else {
        setHasPermission(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      setLoading(true);
      
      // For admin (role 5), fetch all stations
      // For staff/incharge (role 1,2), fetch only assigned stations
      let apiUrl = '/api/stations';
      
      if (user && Number(user.role) !== 5) {
        // Non-admin user - send user info for station filtering
        apiUrl += `?user_id=${user.id}&role=${user.role}`;
        console.log('🔍 Fetching assigned stations for user:', user.id, user.role);
      } else {
        console.log('👑 Admin user - fetching all stations');
      }
      
      const res = await fetch(apiUrl);
      const data = await res.json();
      
      // Log the response for debugging
      console.log('📊 Stations API Response:', {
        success: data.success,
        count: Array.isArray(data.stations) ? data.stations.length : 0,
        filtered: data.filtered || false,
        userRole: user?.role
      });
      
      setStations(Array.isArray(data.stations) ? data.stations : []);
      
      // Set station filter info for non-admin users
      if (user && Number(user.role) !== 5 && data.filtered) {
        setStationFilterInfo('Showing your assigned stations only');
      } else {
        setStationFilterInfo(null);
      }
    } catch (err) {
      console.error('Error fetching stations:', err);
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  // Show access denied if no permission
  if (!authLoading && user && !hasPermission) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view loading stations.</p>
            </div>
          </main>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Loading Stations</h1>
              {/* Station Filter Info */}
              {stationFilterInfo && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {stationFilterInfo}
                  </span>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              {/* Add Station Button - Only for admin */}
              {user && Number(user.role) === 5 && (
                <a
                  href="/loading-stations/add-station"
                  className="fixed bottom-16 right-4 sm:right-10 bg-purple-700 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-full shadow-lg hover:bg-purple-800 z-10 flex items-center justify-center text-sm sm:text-base"
                >
                  <span className="mr-1 sm:mr-2">+</span> <span className="hidden sm:inline">Add Station</span>
                </a>
              )}

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logs</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stations.length > 0 ? (
                      stations.map((station) => (
                        <React.Fragment key={station.id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">{station.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{station.station_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{station.manager}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{station.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {station.map_link ? (
                                <a href={station.map_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                  View on Map
                                </a>
                              ) : (
                                <span className="text-gray-400">No map link</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {/* Actions column - Hide for staff/incharge, show for admin */}
                              {user && Number(user.role) === 5 ? (
                                <div className="flex space-x-3">
                                  <a href={`/loading-stations/edit?id=${station.id}`} className="text-green-600 hover:text-green-800">
                                    <BiEdit size={20} />
                                  </a>
                                  <a href={`/loading-stations/view?id=${station.id}`} className="text-blue-600 hover:text-blue-800">
                                    <BiShow size={20} />
                                  </a>
                                  <a
                                    href={`/stock-history?id=${station.id}`}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <BiHistory size={20} />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No actions</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleStationLogs(station.id)}
                                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                                title="View Activity Logs"
                              >
                                {expandedStations[station.id] ? (
                                  <>
                                    <BiChevronUp size={20} />
                                    <span className="ml-1 text-sm">Hide Logs</span>
                                  </>
                                ) : (
                                  <>
                                    <BiChevronDown size={20} />
                                    <span className="ml-1 text-sm">Show Logs</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                          {/* Expandable Logs Row */}
                          {expandedStations[station.id] && (
                            <tr className="bg-gray-50">
                              <td colSpan="7" className="px-6 py-4">
                                <div className="max-w-4xl">
                                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Logs for {station.station_name}</h3>
                                  <EntityLogs entityType="station" entityId={station.id} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                          No stations found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {stations.length > 0 ? (
                  stations.map((station) => (
                    <div key={station.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{station.station_name}</h3>
                          <p className="text-gray-600">{station.manager}</p>
                        </div>
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">#{station.id}</span>
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="flex items-center">
                          <BiShow className="text-gray-500 mr-2" /> {station.phone}
                        </p>
                        <p className="flex items-center">
                          {station.map_link ? (
                            <a href={station.map_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              <BiHistory className="inline mr-2" /> View on Map
                            </a>
                          ) : (
                            <span className="text-gray-400 flex items-center">
                              <BiHistory className="mr-2" /> No map link
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="mt-4 flex justify-around pt-3 border-t border-gray-100">
                        {/* Actions - Hide for staff/incharge, show for admin */}
                        {user && Number(user.role) === 5 ? (
                          <>
                            <a href={`/loading-stations/edit?id=${station.id}`} className="text-green-600 hover:text-green-800">
                              <BiEdit size={20} />
                            </a>
                            <a href={`/loading-stations/view?id=${station.id}`} className="flex flex-col items-center text-blue-600">
                              <BiShow size={24} />
                              <span className="text-xs mt-1">View</span>
                            </a>
                            <a href={`/stock-history?id=${station.id}`} className="flex flex-col items-center text-red-600">
                              <BiHistory size={24} />
                              <span className="text-xs mt-1">History</span>
                            </a>
                          </>
                        ) : (
                          <div className="text-gray-400 text-sm text-center w-full">
                            No actions available
                          </div>
                        )}
                      </div>

                      {/* Mobile Logs Section */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => toggleStationLogs(station.id)}
                          className="w-full flex items-center justify-between text-blue-600 hover:text-blue-800 transition-colors py-2"
                        >
                          <span className="text-sm font-medium">Activity Logs</span>
                          {expandedStations[station.id] ? (
                            <BiChevronUp size={20} />
                          ) : (
                            <BiChevronDown size={20} />
                          )}
                        </button>
                        {expandedStations[station.id] && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <EntityLogs entityType="station" entityId={station.id} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border rounded-lg p-6 text-center">
                    <p className="text-gray-500">No stations found</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        <div className="flex-shrink-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}
