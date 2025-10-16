//src/app/stock/purchase/page.jsx
import { Suspense } from "react";
import PurchaseContent from "./PurchaseContent"; // ✅ Removed extra space

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-center mt-10 text-lg">Loading...</p>}
    >
      <PurchaseContent />
    </Suspense>
  );
}
