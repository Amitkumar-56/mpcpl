'use client';

import EntityLogs from "@/components/EntityLogs";
import { useSession } from "@/context/SessionContext";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Main component that receives params
function ProductViewContent({ params }) {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [product, setProduct] = useState(null);
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
      if (productPerms.can_view) {
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
      if (cachedPerms.can_view) {
        setHasPermission(true);
        fetchProduct();
        return;
      }
    }

    try {
      const moduleName = 'Items & Products';
      const viewRes = await fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`);
      const viewData = await viewRes.json();

      if (viewData.allowed) {
        setHasPermission(true);
        fetchProduct();
      } else {
        setHasPermission(false);
        setError('You do not have permission to view products.');
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
      const productId = params.id;
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Failed to fetch product");
      const data = await res.json();
      setProduct(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/products/edit?id=${params.id}`);
  };

  const handleBack = () => {
    router.push('/products');
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <button
                onClick={handleBack}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-gray-800 text-sm sm:text-base"
              >
                ← Back to Products
              </button>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleEdit}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
                >
                  Edit Product
                </button>
              </div>
            </div>

            {authLoading || loading ? (
              <div className="text-center py-10">Loading...</div>
            ) : !hasPermission ? (
              <div className="text-red-600 text-center py-10">
                {error || 'You do not have permission to view products.'}
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-10">{error}</div>
            ) : product ? (
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 text-gray-800">Product Details</h1>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">Product ID</h3>
                    <p className="text-base sm:text-lg font-medium text-gray-900 break-all">{product.id}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">Product Name</h3>
                    <p className="text-base sm:text-lg font-medium text-gray-900 break-words">{product.pname}</p>
                  </div>
                </div>

                <div className="mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3">Product Codes</h3>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {product.pcodes.map((code, index) => (
                      <span key={index} className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs sm:text-sm font-medium break-all">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 sm:pt-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">Activity Logs</h3>
                  <div className="overflow-x-auto">
                    <EntityLogs entityType="product" entityId={product.id} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">Product not found</div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function ProductViewPage({ params }) {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-100">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="text-center py-8 sm:py-10">Loading product details...</div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    }>
      <ProductViewContent params={params} />
    </Suspense>
  );
}