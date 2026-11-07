import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, headerAction }) => {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-[12px] text-slate-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div className="flex items-center">{headerAction}</div>}
        </div>
      )}
      <div className="p-5 flex-1 bg-white">{children}</div>
    </div>
  );
};
