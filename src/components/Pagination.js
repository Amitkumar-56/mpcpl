// src/components/Pagination.js
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalRecords,
  recordsPerPage 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const pageNumbers = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString}`);
    onPageChange(newPage);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
      <div className="text-sm text-gray-600">
        Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} entries
      </div>
      
      <nav aria-label="Pagination">
        <ul className="flex items-center space-x-1">
          {/* Previous Button */}
          <li>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
          </li>

          {/* Page Numbers */}
          {pageNumbers.map(page => (
            <li key={page}>
              <button
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded border ${
                  currentPage === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            </li>
          ))}

          {/* Next Button */}
          <li>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}