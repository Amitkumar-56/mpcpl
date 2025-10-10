// src/app/suppliers/page.jsx
import { Suspense } from "react";
import SuppliersPage from "./Suppliers"; // Correct import (no extra space)

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <SuppliersPage />
    </Suspense>
  );
}
