import React from 'react';

interface ERPFormRowProps {
  children: React.ReactNode;
  className?: string;
}

export const ERPFormRow: React.FC<ERPFormRowProps> = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-[140px_1fr] items-center gap-y-3 gap-x-4 ${className}`}>
      {children}
    </div>
  );
};
