// src/app/stock/purchase-for-use-history/page.jsx
import { Suspense } from "react";
import PurchaseTable from "./PurchaseTable";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading purchase history...</span>
      </div>
    }>
      <PurchaseTable />
    </Suspense>
  );
}