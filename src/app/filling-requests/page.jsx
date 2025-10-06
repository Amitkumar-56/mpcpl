import { Suspense } from "react";

 
import FillingRequestsPage from "../cst/filling-requests/page";

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-center mt-10 text-lg">Loading...</p>}
    >
      <FillingRequestsPage />
    </Suspense>
  );
}
