import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'slate';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate' }) => {
  const styles = {
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200/50',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/50',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/50',
    slate: 'bg-slate-50 text-slate-600 border-slate-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 font-semibold text-[11px] border rounded-full uppercase tracking-wider select-none ${styles[variant]}`}>
      {children}
    </span>
  );
};
