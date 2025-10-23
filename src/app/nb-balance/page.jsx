import { Suspense } from "react";
import NBBalance from "./nb-balance"; // Fixed import name

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-center mt-10 text-lg">Loading...</p>}
    >
      <NBBalance /> {/* Fixed component name */}
    </Suspense>
  );
}