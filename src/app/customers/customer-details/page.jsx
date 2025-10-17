//src/app/customers/customer-details/page.jsx
import { Suspense } from "react";
import CustomerDetailsClient from "./CustomerDetailsClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading page...</p>
          </div>
        </div>
      }
    >
      <CustomerDetailsClient />
    </Suspense>
  );
}