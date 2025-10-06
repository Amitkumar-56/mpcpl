import { Suspense } from "react";

 
import EditStation from "./EditSection";

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-center mt-10 text-lg">Loading...</p>}
    >
      <EditStation />
    </Suspense>
  );
}
