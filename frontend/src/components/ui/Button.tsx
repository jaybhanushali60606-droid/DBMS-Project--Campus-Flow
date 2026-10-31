import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm focus:ring-sky-500',
    secondary: 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm focus:ring-slate-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-sky-500',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded-md font-medium',
    md: 'text-sm px-4 py-2 rounded-lg font-medium',
    lg: 'text-base px-5 py-2.5 rounded-lg font-semibold',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
