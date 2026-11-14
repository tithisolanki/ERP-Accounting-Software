import React from 'react';

interface ERPSectionProps {
  title: string;
  visible?: boolean;
  className?: string;
  titleClassName?: string;
  children: React.ReactNode;
}

export const ERPSection: React.FC<ERPSectionProps> = ({
  title,
  visible = true,
  className = '',
  titleClassName = '',
  children
}) => {
  if (!visible) return null;

  return (
    <div className={`flex flex-col gap-4 border border-[#e2d5c5] bg-[#fffaf5] p-5 rounded-lg ${className}`}>
      <h3 className={`text-xs font-bold mb-2 border-b border-[#ebdccb] pb-1 uppercase tracking-wider ${titleClassName}`}>
        {title}
      </h3>
      {children}
    </div>
  );
};
