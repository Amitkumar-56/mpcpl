'use client';

import { useSearchParams } from 'next/navigation';

export default function TestPage() {
  const searchParams = useSearchParams();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">URL Parameter Test</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Current URL Parameters:</h2>
        <p><strong>ID:</strong> {searchParams.get('id')}</p>
        <p><strong>Full URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
      </div>
      
      <div className="mt-4">
        <h2 className="font-semibold mb-2">Test Links:</h2>
        <ul className="space-y-2">
          <li>
            <a href="/cst/filling-details?id=1" className="text-blue-600 hover:underline">
              Test with ID=1
            </a>
          </li>
          <li>
            <a href="/cst/filling-details?id=2" className="text-blue-600 hover:underline">
              Test with ID=2
            </a>
          </li>
          <li>
            <a href="/cst/filling-details" className="text-blue-600 hover:underline">
              Test without ID
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
