# Page Loading Optimization Guide

## Issues Fixed:
1. ✅ Added request timeouts (10 seconds for data, 5 seconds for permissions)
2. ✅ Added AbortController to cancel slow requests
3. ✅ Better error handling with timeout messages
4. ✅ Optimized permission checks with timeout fallback to cache
5. ✅ Created reusable LoadingSpinner component
6. ✅ Created useOptimizedFetch hook for future use

## How to Apply to Other Pages:

### 1. Add Timeout to Data Fetching:
```javascript
const fetchData = async () => {
  try {
    setLoading(true);
    
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
    
    const response = await fetch('/api/your-endpoint', {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    const result = await response.json();
    
    if (result.success) {
      setData(result.data || []);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      showMessage('Request timeout. Please try again.', 'error');
    } else {
      showMessage('Error fetching data', 'error');
    }
  } finally {
    setLoading(false);
  }
};
```

### 2. Optimize Permission Checks:
```javascript
// Add timeout to permission checks
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds

const [viewRes, editRes, deleteRes] = await Promise.all([
  fetch(`/api/check-permissions?...`, { signal: controller.signal }),
  // ... other calls
]);

clearTimeout(timeoutId);
```

### 3. Use LoadingSpinner Component:
```javascript
import LoadingSpinner from '@/components/LoadingSpinner';

if (loading) {
  return <LoadingSpinner message="Loading data..." fullScreen={true} />;
}
```

### 4. Parallel API Calls:
Instead of sequential calls:
```javascript
// ❌ Slow - Sequential
const data1 = await fetch('/api/endpoint1');
const data2 = await fetch('/api/endpoint2');
```

Use parallel calls:
```javascript
// ✅ Fast - Parallel
const [data1, data2] = await Promise.all([
  fetch('/api/endpoint1'),
  fetch('/api/endpoint2')
]);
```

## Pages Already Optimized:
- ✅ tanker-history/page.jsx
- ✅ deepo-history/page.jsx

## Pages That Need Optimization:
- All other pages with fetch calls
- Check for:
  1. Missing timeouts
  2. Sequential API calls (should be parallel)
  3. No error handling for timeouts
  4. Missing loading indicators

