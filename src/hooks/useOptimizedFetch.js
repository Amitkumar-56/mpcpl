import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Optimized fetch hook with:
 * - Request deduplication
 * - Automatic timeout
 * - Error handling
 * - Loading states
 * - Caching support
 */
export function useOptimizedFetch(options = {}) {
  const {
    timeout = 15000, // 15 seconds default
    cache = false,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    onError = null
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const abortControllerRef = useRef(null);
  const cacheRef = useRef(new Map());
  const pendingRequestsRef = useRef(new Map());

  const fetchData = useCallback(async (url, fetchOptions = {}) => {
    // Check cache first
    if (cache && cacheRef.current.has(url)) {
      const cached = cacheRef.current.get(url);
      if (Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        setLoading(false);
        return cached.data;
      }
    }

    // Deduplicate requests
    if (pendingRequestsRef.current.has(url)) {
      return pendingRequestsRef.current.get(url);
    }

    try {
      setLoading(true);
      setError(null);

      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'));
        }, timeout);
      });

      // Create fetch promise
      const fetchPromise = fetch(url, {
        ...fetchOptions,
        signal,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        }
      });

      // Race between fetch and timeout
      const requestPromise = Promise.race([fetchPromise, timeoutPromise])
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((result) => {
          // Cache the result
          if (cache) {
            cacheRef.current.set(url, {
              data: result,
              timestamp: Date.now()
            });
          }
          return result;
        });

      // Store pending request
      pendingRequestsRef.current.set(url, requestPromise);

      const result = await requestPromise;
      
      setData(result);
      pendingRequestsRef.current.delete(url);
      
      return result;
    } catch (err) {
      pendingRequestsRef.current.delete(url);
      
      if (err.name === 'AbortError') {
        setError('Request was cancelled');
      } else if (err.message === 'Request timeout') {
        setError('Request timeout. Please try again.');
      } else {
        setError(err.message || 'Failed to fetch data');
      }

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [timeout, cache, cacheTime, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      pendingRequestsRef.current.clear();
    };
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    fetchData,
    loading,
    error,
    data,
    clearCache
  };
}

