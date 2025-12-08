import { Suspense } from 'react';
import StationViewClient from './StationViewClient';

export default function StationViewPage() {
  return (
    <Suspense fallback={null}>
      <StationViewClient />
    </Suspense>
  );
}