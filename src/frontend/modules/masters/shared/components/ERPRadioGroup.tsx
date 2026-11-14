import React, { forwardRef } from 'react';

interface ERPRadioGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const ERPRadioGroup = forwardRef<HTMLInputElement, ERPRadioGroupProps>(
  ({ label, options, error, name, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full text-xs">
        <label className="font-bold text-slate-700 select-none">{label}</label>
        <div className="flex gap-4 items-center h-7 font-semibold">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
              <input
                ref={ref}
                type="radio"
                name={name}
                value={opt.value}
                className="w-3.5 h-3.5 accent-indigo-650 disabled:cursor-not-allowed cursor-pointer"
                {...props}
              />
              {opt.label}
            </label>
          ))}
        </div>
        {error && <span className="text-[11px] text-red-550 font-bold">{error}</span>}
      </div>
    );
  }
);

ERPRadioGroup.displayName = 'ERPRadioGroup';
