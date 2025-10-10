// src/app/customers/client-history/page.jsx
import { Suspense } from "react";
import TransactionHistory from "./TransactionHistory";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-b-4 border-gray-300"></div>
        </div>
      }
    >
      <TransactionHistory />
    </Suspense>
  );
}