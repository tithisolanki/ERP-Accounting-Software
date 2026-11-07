import React, { forwardRef } from 'react';

interface ERPInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const ERPInput = forwardRef<HTMLInputElement, ERPInputProps>(
  ({ label, error, helperText, required, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full text-xs">
        <label className="font-bold text-slate-700 select-none">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          ref={ref}
          required={required}
          className={`w-full px-3 py-1 bg-white border border-[#cfc0ae] focus:border-indigo-500 rounded outline-none h-7 disabled:bg-slate-100 disabled:text-slate-500 font-semibold transition-all ${
            error ? 'border-red-500 focus:border-red-500 bg-red-50/20' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-[11px] text-red-550 font-bold">{error}</span>}
        {!error && helperText && <span className="text-[11px] text-slate-400 font-medium">{helperText}</span>}
      </div>
    );
  }
);

ERPInput.displayName = 'ERPInput';
