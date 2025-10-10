import { Suspense } from "react";
import PurchaseContent from "./PurchaseContent"; // ✅ Removed extra space

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <PurchaseContent />
    </Suspense>
  );
}
