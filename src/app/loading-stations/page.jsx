'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BiEdit, BiHistory, BiShow } from "react-icons/bi";

export default function LoadingStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useSession();

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
      const res = await fetch('/api/stations');
      const data = await res.json();
      setStations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching stations:', err);
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Show access denied if no permission
  if (!authLoading && user && !hasPermission) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header onMenuToggle={toggleSidebar} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view loading stations.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuToggle={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <h1 className="text-2xl font-bold mb-6">Loading Stations</h1>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              <a
                href="/loading-stations/add-station"
                className="fixed bottom-16 right-10 bg-purple-700 text-white px-4 py-3 rounded-full shadow-lg hover:bg-purple-800 z-10 flex items-center justify-center"
              >
                <span className="mr-2">+</span> Add Station
              </a>

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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stations.length > 0 ? (
                      stations.map((station) => (
                        <tr key={station.id} className="hover:bg-gray-50">
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
                          <td className="px-6 py-4 whitespace-nowrap flex space-x-3">
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

                          </td>
                        </tr>
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
                       <a href={`/loading-stations/edit?id=${station.id}`} className="text-green-600 hover:text-green-800">
  <BiEdit size={20} />
</a>

                        <a href={`/station-view/${station.id}`} className="flex flex-col items-center text-blue-600">
                          <BiShow size={24} />
                          <span className="text-xs mt-1">View</span>
                        </a>
                        <a href={`/stock-history/${station.id}`} className="flex flex-col items-center text-red-600">
                          <BiHistory size={24} />
                          <span className="text-xs mt-1">History</span>
                        </a>
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

        <Footer />
      </div>
    </div>
  );
}
