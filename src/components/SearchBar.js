// src/components/SearchBar.js
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchBar({ onSearch, initialValue = '', statusFilter, recordsPerPage }) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const params = new URLSearchParams(searchParams);
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    
    router.push(`${pathname}?${params.toString()}`);
    onSearch(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm('');
    
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.set('page', '1');
    
    router.push(`${pathname}?${params.toString()}`);
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by Request ID, Vehicle, Client, or Station..."
        className="border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
      />
      <button 
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 transition-colors"
      >
        Search
      </button>
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="ml-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          Clear
        </button>
      )}
    </form>
  );
}