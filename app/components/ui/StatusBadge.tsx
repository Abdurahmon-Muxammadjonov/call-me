import React from 'react';

interface StatusBadgeProps {
  connected: boolean;
  loading?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ connected, loading = false }) => {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100">
        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-gray-600">Tekshirmoqda...</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <span className="text-sm font-medium text-green-700">Ulangan</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100">
      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
      <span className="text-sm font-medium text-red-700">Ulanmagan</span>
    </div>
  );
};
