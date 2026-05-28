import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface PageHeaderProps {
  title: string;
  rightElement?: React.ReactNode;
  className?: string;
  onBack?: () => void;
}

export function PageHeader({ title, rightElement, className, onBack }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn("sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-black/80 backdrop-blur-md border-b border-white/10 shrink-0 relative", className)}>
      <button 
        onClick={handleBack}
        className="p-2 -ml-2 text-white/80 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <h1 className="text-[17px] font-semibold text-white absolute left-1/2 -translate-x-1/2">{title}</h1>
      <div className="flex items-center justify-end w-10">
        {rightElement}
      </div>
    </div>
  );
}
