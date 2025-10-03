'use client';

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AddProductPage() {
  const router = useRouter();
  const [pname, setPname] = useState('');
  const [pcodeInput, setPcodeInput] = useState('');
  const [pcodes, setPcodes] = useState([]);
  const [message, setMessage] = useState('');

  const addPcode = () => {
    if (pcodeInput.trim() !== '') {
      setPcodes([...pcodes, pcodeInput.trim()]);
      setPcodeInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pname || pcodes.length === 0) {
      setMessage('Product name and at least one code are required.');
      return;
    }

    const res = await fetch('/api/products/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pname, pcodes }),
    });

    const data = await res.json();
    setMessage(data.message);
    if (res.ok) {
      setPname('');
      setPcodes([]);
      setPcodeInput('');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <button
              onClick={() => router.push('/products')}
              className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-gray-800"
            >
              &larr; Back
            </button>

            <h2 className="text-2xl font-bold mb-4">Add New Product</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Product Name</label>
                <input
                  type="text"
                  value={pname}
                  onChange={(e) => setPname(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Product Codes</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={pcodeInput}
                    onChange={(e) => setPcodeInput(e.target.value)}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Enter product code"
                  />
                  <button
                    type="button"
                    onClick={addPcode}
                    className="px-4 py-2 bg-gray-500 text-white rounded"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Product Name</th>
                      <th className="py-2 px-4 border-b">Product Codes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pcodes.map((code, index) => (
                      <tr key={index}>
                        <td className="py-2 px-4 border-b">{pname}</td>
                        <td className="py-2 px-4 border-b">{code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex space-x-2">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded">Submit</button>
                <button
                  type="button"
                  onClick={() => { setPname(''); setPcodes([]); setPcodeInput(''); setMessage(''); }}
                  className="px-6 py-2 bg-gray-600 text-white rounded"
                >
                  Reset
                </button>
              </div>
            </form>

            {message && <p className="mt-4 text-green-600">{message}</p>}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
