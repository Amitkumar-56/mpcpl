// src/app/customers/customer-details/page.jsx
import { Suspense } from "react";
import CustomerDetailsClient from "./CustomerDetailsClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <CustomerDetailsClient />
    </Suspense>
  );
}