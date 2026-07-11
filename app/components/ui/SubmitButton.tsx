import React from 'react';

interface SubmitButtonProps {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  label,
  loading = false,
  disabled = false,
  onClick,
  type = 'submit',
  variant = 'primary',
}) => {
  const baseStyles = 'px-6 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-400',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${
        loading || disabled ? 'cursor-not-allowed opacity-70' : ''
      }`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Yuklanmoqda...
        </span>
      ) : (
        label
      )}
    </button>
  );
};
