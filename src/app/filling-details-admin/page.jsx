import { Suspense } from "react";

import FillingDetailsAdmin from "./FillingDetailsAdmin";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FillingDetailsAdmin />
    </Suspense>
  );
}
