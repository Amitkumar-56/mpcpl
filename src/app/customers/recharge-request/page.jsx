import { Suspense } from "react";
import RechargeRequestPage from "./RechargeRequestPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-600">Loading customer data...</div>}>
      <RechargeRequestPage />
    </Suspense>
  );
}
