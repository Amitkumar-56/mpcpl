'use client';
import React, { useState, Suspense } from 'react';
import { FaWeight, FaTimes, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function GrowthRecordModal({ animalId, animalName, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    length: '',
    chest_girth: '',
    recorded_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      return toast.error('Weight is required and must be greater than 0');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/farming/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animal_id: animalId,
          weight: parseFloat(formData.weight),
          height: formData.height ? parseFloat(formData.height) : null,
          length: formData.length ? parseFloat(formData.length) : null,
          chest_girth: formData.chest_girth ? parseFloat(formData.chest_girth) : null,
          recorded_date: formData.recorded_date,
          notes: formData.notes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Growth record added successfully!');
        onSuccess && onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to add growth record');
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <FaSpinner className="animate-spin text-emerald-500 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">Loading growth form...</p>
        </div>
      </div>
    }>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
          >
            <FaTimes />
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaWeight className="text-2xl text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Add Growth Record</h2>
            <p className="text-sm text-slate-600">{animalName}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                Weight (kg) *
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.1"
                min="0"
                required
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:outline-none text-sm font-mono"
                placeholder="Enter weight in kg"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-3 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:outline-none text-sm font-mono"
                  placeholder="Height"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                  Length (cm)
                </label>
                <input
                  type="number"
                  name="length"
                  value={formData.length}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-3 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:outline-none text-sm font-mono"
                  placeholder="Length"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                  Chest (cm)
                </label>
                <input
                  type="number"
                  name="chest_girth"
                  value={formData.chest_girth}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-3 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:outline-none text-sm font-mono"
                  placeholder="Chest"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                <FaCalendarAlt className="inline mr-2" />
                Date *
              </label>
              <input
                type="date"
                name="recorded_date"
                value={formData.recorded_date}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:outline-none text-sm resize-none"
                placeholder="Add any notes about this measurement..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Suspense>
  );
}
