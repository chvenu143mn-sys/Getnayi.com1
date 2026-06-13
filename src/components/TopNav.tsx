import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show top nav on home feed or video full screen
  if (location.pathname === '/' || location.pathname.startsWith('/video/')) {
    return null;
  }

  const handleBack = () => {
    // Intelligently redirect to previous page or home if no history
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-[#0c0c0e]/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center shrink-0">
      <button 
        onClick={handleBack} 
        className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95 flex items-center justify-center -ml-2"
        aria-label="Go back"
      >
        <ChevronLeft className="size-6 text-white" />
      </button>
    </div>
  );
}
