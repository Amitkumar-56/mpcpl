import { Suspense } from "react";
import FillingRequests from "./editFiling";

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-center mt-10 text-lg">Loading...</p>}
    >
      <FillingRequests />
    </Suspense>
  );
}