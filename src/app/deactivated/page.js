"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { FaExclamationTriangle, FaUserTimes } from "react-icons/fa";

// Loading component for Suspense fallback
function DeactivatedPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <div className="w-8 h-8 bg-red-300 rounded animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
          <div className="h-8 w-40 bg-red-200 rounded-full animate-pulse mx-auto" />
        </div>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-4" />
            <div className="h-16 w-full bg-gray-100 rounded animate-pulse mb-6" />
            <div className="h-20 w-full bg-red-50 rounded animate-pulse mb-6" />
            <div className="h-12 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main content component
function DeactivatedContent() {
  const router = useRouter();

  useEffect(() => {
    // Clear any existing tokens/sessions
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 px-4">
      <div className="max-w-lg w-full">
        {/* Simple Error Display */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <FaUserTimes className="text-3xl text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-red-600 mb-2">404</h1>
          <div className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-full">
            <FaExclamationTriangle className="mr-2" />
            Deactivated Here
          </div>
        </div>

        {/* Simple Error Message */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Account Deactivated
            </h2>
            
            <p className="text-gray-600 text-center mb-6 leading-relaxed">
              Your account has been deactivated. Access to this system is restricted.
            </p>

            {/* Simple Error Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-center font-medium">
                Error: Account deactivated by administrator
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>If you believe this is an error, please contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
}

// Main exported component with Suspense boundary
export default function DeactivatedPage() {
  return (
    <Suspense fallback={<DeactivatedPageSkeleton />}>
      <DeactivatedContent />
    </Suspense>
  );
}