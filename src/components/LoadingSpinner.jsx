import React from 'react';

const LoadingSpinner = ({ message = "Loading...", size = "md", fullScreen = false }) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} mx-auto`}></div>
          <p className="mt-4 text-gray-600 text-sm">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} mx-auto`}></div>
        {message && <p className="mt-4 text-gray-600 text-sm">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner;

