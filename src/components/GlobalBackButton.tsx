import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface GlobalBackButtonProps {
  className?: string;
  iconClassName?: string;
  fallbackPath?: string;
}

export function GlobalBackButton({ className, iconClassName, fallbackPath = '/' }: GlobalBackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // If we are on the home feed or a video path, we arguably don't show this, but the component is rendered manually
  // so we can just hide it if we accidentally render it on '/'
  if (location.pathname === '/') {
    return null;
  }

  const handleBack = () => {
    // If there is enough history (length > 2 because 1 is empty, 2 is current page), go back
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      // Otherwise fallback to home feed or specified path
      navigate(fallbackPath, { replace: true });
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleBack} 
      className={cn("p-[10px] rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] transition-colors border border-white/5 active:scale-95 shrink-0 flex items-center justify-center", className)}
      aria-label="Go back"
    >
      <ChevronLeft className={cn("size-5 text-white", iconClassName)} />
    </button>
  );
}
