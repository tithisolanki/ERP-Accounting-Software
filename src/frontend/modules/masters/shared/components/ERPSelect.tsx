import React, { forwardRef } from 'react';

interface ERPSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string | number; label: string }[];
  error?: string;
  helperText?: string;
}

export const ERPSelect = forwardRef<HTMLSelectElement, ERPSelectProps>(
  ({ label, options, error, helperText, required, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full text-xs">
        <label className="font-bold text-slate-700 select-none">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          ref={ref}
          required={required}
          className={`w-full px-2 py-1 bg-white border border-[#cfc0ae] focus:border-indigo-500 rounded outline-none h-7 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 font-semibold transition-all ${
            error ? 'border-red-500 focus:border-red-500 bg-red-50/20' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-[11px] text-red-550 font-bold">{error}</span>}
        {!error && helperText && <span className="text-[12px] text-slate-500 font-medium">{helperText}</span>}
      </div>
    );
  }
);

ERPSelect.displayName = 'ERPSelect';
