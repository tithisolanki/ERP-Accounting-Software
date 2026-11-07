import React, { SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
        <select
          ref={ref}
          className={`w-full px-2.5 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border ${
            error ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
          } rounded-lg outline-none transition-all shadow-sm text-slate-800 h-8 cursor-pointer ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-[11px] text-red-500 font-semibold">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
