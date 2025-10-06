import { Suspense } from "react";

import EditFillingRequest from "./EditFillingRequest";

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-center mt-10 text-lg">Loading...</p>}
    >
      <EditFillingRequest />
    </Suspense>
  );
}
