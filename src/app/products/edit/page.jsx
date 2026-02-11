'use client';

import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Create a separate component that uses useSearchParams
function EditProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSession();
  const [product, setProduct] = useState(null);
  const [pname, setPname] = useState('');
  const [pcodes, setPcodes] = useState([]);
  const [pcodeInput, setPcodeInput] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      checkPermissions();
    }
  }, [user, authLoading, router]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      fetchProduct();
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['Items & Products']) {
      const productPerms = user.permissions['Items & Products'];
      if (productPerms.can_edit) {
        setHasPermission(true);
        fetchProduct();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Items & Products`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_edit) {
        setHasPermission(true);
        fetchProduct();
        return;
      }
    }

    try {
      const moduleName = 'Items & Products';
      const editRes = await fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`);
      const editData = await editRes.json();

      if (editData.allowed) {
        setHasPermission(true);
        fetchProduct();
      } else {
        setHasPermission(false);
        setError('You do not have permission to edit products.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setError('Failed to check permissions.');
      setLoading(false);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const productId = searchParams.get('id');
      if (!productId) {
        setError('Product ID is required');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Failed to fetch product");
      const data = await res.json();
      setProduct(data);
      setPname(data.pname);
      setPcodes(data.pcodes || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addPcode = () => {
    if (pcodeInput.trim() !== '' && !pcodes.includes(pcodeInput.trim())) {
      setPcodes([...pcodes, pcodeInput.trim()]);
      setPcodeInput('');
    }
  };

  const removePcode = (indexToRemove) => {
    setPcodes(pcodes.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pname || pcodes.length === 0) {
      setMessage('Product name and at least one code are required.');
      return;
    }

    try {
      const productId = searchParams.get('id');
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pname, pcodes }),
      });

      const data = await res.json();
      setMessage(data.message);
      if (res.ok) {
        setTimeout(() => {
          router.push('/products');
        }, 1500);
      }
    } catch (err) {
      setMessage('Failed to update product');
    }
  };

  const handleBack = () => {
    router.push('/products');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-gray-800"
              >
                ← Back to Products
              </button>
            </div>

            <h2 className="text-2xl font-bold mb-4">Edit Product</h2>

            {authLoading || loading ? (
              <div className="text-center py-10">Loading...</div>
            ) : !hasPermission ? (
              <div className="text-red-600 text-center py-10">
                {error || 'You do not have permission to edit products.'}
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-10">{error}</div>
            ) : product ? (
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
                  <label className="block mb-2 font-medium">Current Product Codes</label>
                  <div className="space-y-2">
                    {pcodes.map((code, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-gray-700">{code}</span>
                        <button
                          type="button"
                          onClick={() => removePcode(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
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
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded">Update Product</button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-2 bg-gray-600 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10">Product not found</div>
            )}

            {message && (
              <div className={`mt-4 p-3 rounded ${message.includes('success') || message.includes('updated') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {message}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function EditProductPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <div className="text-center py-10">Loading product data...</div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    }>
      <EditProductForm />
    </Suspense>
  );
}