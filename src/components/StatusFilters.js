// components/StatusFilters.jsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function StatusFilters({ currentStatus, onStatusChange }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const statuses = [
    { value: 'All', label: 'All', activeClass: 'bg-gray-700 text-white', inactiveClass: 'bg-gray-200 text-gray-700 hover:bg-gray-300' },
    { value: 'Completed', label: 'Completed', activeClass: 'bg-green-500 text-white', inactiveClass: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { value: 'Processing', label: 'Processing', activeClass: 'bg-blue-500 text-white', inactiveClass: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { value: 'Pending', label: 'Pending', activeClass: 'bg-yellow-500 text-white', inactiveClass: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  ];

  const handleStatusChange = (status) => {
    const params = new URLSearchParams(searchParams);
    if (status && status !== 'All') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    
    router.push(`${pathname}?${params.toString()}`);
    onStatusChange(status === 'All' ? '' : status);
  };

  const handleReportsClick = () => {
    router.push('/reports');
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {statuses.map(status => (
        <button
          key={status.value}
          onClick={() => handleStatusChange(status.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentStatus === status.value || (!currentStatus && status.value === 'All')
              ? status.activeClass
              : status.inactiveClass
          }`}
        >
          {status.label}
        </button>
      ))}
      <button
        onClick={handleReportsClick}
        className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
      >
        Reports
      </button>
    </div>
  );
}