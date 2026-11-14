import React, { forwardRef } from 'react';

interface ERPCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  subLabel?: string;
  error?: string;
}

export const ERPCheckbox = forwardRef<HTMLInputElement, ERPCheckboxProps>(
  ({ label, subLabel, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full text-xs">
        <label className={`flex items-center gap-2 p-3 rounded-lg border transition-all select-none cursor-pointer ${
          props.disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-400'
            : 'hover:bg-slate-50/50 border-slate-200/80 text-slate-700'
        } ${className}`}>
          <input
            ref={ref}
            type="checkbox"
            className="w-3.5 h-3.5 accent-indigo-650 rounded cursor-pointer disabled:cursor-not-allowed"
            {...props}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-slate-800">{label}</span>
            {subLabel && <span className="text-[12px] text-slate-500 font-medium">{subLabel}</span>}
          </div>
        </label>
        {error && <span className="text-[11px] text-red-550 font-bold">{error}</span>}
      </div>
    );
  }
);

ERPCheckbox.displayName = 'ERPCheckbox';
