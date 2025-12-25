'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditFillingRequest() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user, loading: authLoading } = useSession();

  const [formData, setFormData] = useState({
    product: '',
    station: '',
    vehicle_number: '',
    driver_number: '',
    qty: '',
    aqty: '',
    customer: ''
  });

  const [files, setFiles] = useState({ doc1: null, doc2: null, doc3: null });
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false
  });

  // Fetch record data
  useEffect(() => {
    if (!id) return;

    const fetchRecord = async () => {
      try {
        const res = await fetch(`/api/filling-requests/edit?id=${id}`);
        if (!res.ok) {
          throw new Error(`Failed to load request: ${res.status}`);
        }
        const data = await res.json();
        const req = data.request || data;
        setRecord(req);
        setFormData({
          product: req.product || '',
          station: req.fs_id || '',
          vehicle_number: req.vehicle_number || '',
          driver_number: req.driver_number || '',
          qty: req.qty || '',
          aqty: req.aqty || '',
          customer: req.cid || ''
        });
      } catch (err) {
        console.error("EROR,DEEE",err);
        // alert('Error fetching record');
      }
    };

    fetchRecord();
  }, [id]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      checkPermissions();
    }
  }, [user, authLoading]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true });
      return;
    }

    if (user.permissions && user.permissions['Filling Requests']) {
      const fillingPerms = user.permissions['Filling Requests'];
      if (fillingPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: fillingPerms.can_view,
          can_edit: fillingPerms.can_edit,
          can_delete: fillingPerms.can_delete
        });
        return;
      }
    }

    const cacheKey = `perms_${user.id}_Filling Requests`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        return;
      }
    }

    try {
      const moduleName = 'Filling Requests';
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
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
      } else {
        setHasPermission(false);
      }
    } catch {
      setHasPermission(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitData = new FormData();
    submitData.append('aqty', formData.aqty);
    submitData.append('id', id);

    Object.keys(files).forEach(key => {
      if (files[key]) submitData.append(key, files[key]);
    });

    try {
      const res = await fetch('/api/filling-requests/edit', { method: 'POST', body: submitData });
      const result = await res.json();

      if (res.ok) {
        alert('Record updated successfully!');
        router.push('/filling-requests');
      } else {
        console.log("resulet", result);
        // alert(result.error || 'Error updating record');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating record');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, field) => {
    setFiles(prev => ({ ...prev, [field]: e.target.files[0] }));
  };

  if (!record && id) return <div className="p-6">Loading...</div>;

  if (authLoading) {
    return <div className="p-6">Checking permissions...</div>;
  }

  if (!hasPermission || !permissions.can_edit) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600">You do not have permission to edit filling requests.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 px-4 py-6 overflow-auto">
          <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded-lg">
            <h1 className="text-2xl font-bold mb-6">Edit Filling Request</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product</label>
                  <input
                    type="text"
                    value={record?.product_name || ''}
                    disabled
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Loading Station</label>
                  <input
                    type="text"
                    value={record?.loading_station || ''}
                    disabled
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    disabled
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Driver Number</label>
                  <input
                    type="text"
                    value={formData.driver_number}
                    disabled
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Qty Ltr</label>
                  <input
                    type="text"
                    value={formData.qty}
                    disabled
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Actual Qty</label>
                  <input
                    type="number"
                    value={formData.aqty}
                    onChange={e => setFormData({ ...formData, aqty: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Customer</label>
                  <input
                    type="text"
                    value={record?.customer_name || ''}
                    disabled
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                {['doc1', 'doc2', 'doc3'].map((doc, index) => (
                  <div key={doc}>
                    <label className="block text-sm font-medium mb-2">Document {index + 1}</label>
                    <input type="file" onChange={e => handleFileChange(e, doc)} className="w-full p-2 border border-gray-300 rounded-md" />
                    {record && record[doc] && (
                      <div className="mt-2">
                        <a href={record[doc]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          View Current Document
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <button type="submit" disabled={loading} className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300">
                  {loading ? 'Updating...' : 'Update Request'}
                </button>
                <button type="button" onClick={() => router.back()} className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
