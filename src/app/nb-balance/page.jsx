import { Suspense } from "react";
import NBBalance from "./nb-balance"; // Fixed import name

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NBBalance /> {/* Fixed component name */}
    </Suspense>
  );
}