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
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleBack} 
      className={cn("p-3 rounded-full bg-surface-2 hover:bg-surface-2 transition-colors border border-border-subtle active:scale-95 shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50", className)}
      aria-label="Go back"
    >
      <ChevronLeft className={cn("size-5 text-text-primary", iconClassName)} />
    </button>
  );
}
