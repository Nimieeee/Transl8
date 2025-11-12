'use client';

import { useEffect, useState } from 'react';

export function DebugInfo() {
  const [info, setInfo] = useState({
    apiUrl: '',
    hasToken: false,
    env: '',
  });

  useEffect(() => {
    setInfo({
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'NOT SET',
      hasToken: !!localStorage.getItem('accessToken'),
      env: process.env.NODE_ENV || 'unknown',
    });
  }, []);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">Debug Info</div>
      <div>API URL: {info.apiUrl}</div>
      <div>Has Token: {info.hasToken ? '✅' : '❌'}</div>
      <div>Environment: {info.env}</div>
    </div>
  );
}
