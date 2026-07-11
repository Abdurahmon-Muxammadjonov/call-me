import React from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const typeStyles = {
    success: 'bg-green-100 text-green-800 border border-green-300',
    error: 'bg-red-100 text-red-800 border border-red-300',
    info: 'bg-blue-100 text-blue-800 border border-blue-300',
  };

  return (
    <div className={`${typeStyles[type]} px-4 py-3 rounded-lg shadow-md flex items-center justify-between`}>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-3 text-xl font-bold opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
