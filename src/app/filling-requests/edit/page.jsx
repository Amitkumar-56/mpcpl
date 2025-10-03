'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditFillingRequest() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

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

  // Fetch record data
  useEffect(() => {
    if (!id) return;

    const fetchRecord = async () => {
      try {
        const res = await fetch(`/api/filling-requests/${id}`);
         console.log("RESS",res);
         return;
         const data = await res.json();
        setRecord(data);
        setFormData({
          product: data.product,
          station: data.fs_id,
          vehicle_number: data.vehicle_number,
          driver_number: data.driver_number,
          qty: data.qty,
          aqty: data.aqty,
          customer: data.cid
        });
      } catch (err) {
        console.error("EROR,DEEE",err);
        // alert('Error fetching record');
      }
    };

    fetchRecord();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitData = new FormData();
    Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Filling Request</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product */}
          <div>
            <label className="block text-sm font-medium mb-2">Product</label>
            <select
              value={formData.product}
              onChange={e => setFormData({ ...formData, product: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Product</option>
              {/* populate dynamically from API */}
            </select>
          </div>

          {/* Station */}
          <div>
            <label className="block text-sm font-medium mb-2">Loading Station</label>
            <select
              value={formData.station}
              onChange={e => setFormData({ ...formData, station: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Station</option>
              {/* populate dynamically */}
            </select>
          </div>

          {/* Vehicle */}
          <div>
            <label className="block text-sm font-medium mb-2">Vehicle Number</label>
            <input
              type="text"
              value={formData.vehicle_number}
              onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Driver */}
          <div>
            <label className="block text-sm font-medium mb-2">Driver Number</label>
            <input
              type="number"
              value={formData.driver_number}
              onChange={e => setFormData({ ...formData, driver_number: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Qty */}
          <div>
            <label className="block text-sm font-medium mb-2">Qty Ltr</label>
            <input
              type="number"
              value={formData.qty}
              onChange={e => setFormData({ ...formData, qty: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Actual Qty */}
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

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium mb-2">Customer</label>
            <select
              value={formData.customer}
              onChange={e => setFormData({ ...formData, customer: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Customer</option>
              {/* populate dynamically */}
            </select>
          </div>

          {/* Files */}
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
  );
}
