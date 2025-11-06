import { Suspense } from 'react';
import StationViewClient from './StationViewClient';

export default function StationViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading station view...</p>
        </div>
      </div>
    }>
      <StationViewClient />
    </Suspense>
  );
}