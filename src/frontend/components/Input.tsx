import React, { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-3 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border ${
            error ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
          } rounded-lg outline-none transition-all shadow-sm text-slate-800 h-8 ${className}`}
          {...props}
        />
        {error && <span className="text-[11px] text-red-500 font-semibold">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
