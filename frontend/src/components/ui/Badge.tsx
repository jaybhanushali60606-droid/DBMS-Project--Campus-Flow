import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => {
  const variantStyles = {
    primary: 'bg-sky-100 text-sky-800 border-sky-200',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    danger: 'bg-rose-100 text-rose-800 border-rose-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    purple: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};

export const DefaulterBadge: React.FC<{ percentage: number; threshold?: number }> = ({
  percentage,
  threshold = 75,
}) => {
  const isDefaulter = percentage < threshold;
  return isDefaulter ? (
    <span className="inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
      {percentage}% (Defaulter &lt; {threshold}%)
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-medium text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
      {percentage}% (Eligible)
    </span>
  );
};
