import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none';
  
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border border-transparent active:scale-[0.98]',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/50 shadow-sm active:scale-[0.98]',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-transparent active:scale-[0.98]',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm border border-transparent active:scale-[0.98]',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-transparent active:scale-[0.98]',
    ghost: 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200/60'
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-[12px]',
    md: 'px-4 py-1.5 text-xs',
    lg: 'px-5 py-2 text-sm'
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
