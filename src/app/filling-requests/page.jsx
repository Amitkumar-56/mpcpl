import { Suspense } from "react";
import FillingRequests from "./editFiling";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FillingRequests />
    </Suspense>
  );
}