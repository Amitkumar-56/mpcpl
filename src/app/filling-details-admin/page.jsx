import { Suspense } from "react";

import FillingDetailsAdmin from "./FillingDetailsAdmin";

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-center mt-10 text-lg">Loading...</p>}
    >
      <FillingDetailsAdmin />
    </Suspense>
  );
}
