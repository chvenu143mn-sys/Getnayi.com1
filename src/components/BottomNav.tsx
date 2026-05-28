import { Home, Plus, User, Search, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 w-full z-40 bg-black pb-[env(safe-area-inset-bottom)] border-t border-white/[0.08]">
      <div className="flex items-center justify-between h-[60px] px-2 sm:max-w-md sm:mx-auto">
        <Link
          to="/"
          className={cn(
            "flex-1 flex flex-col items-center justify-center space-y-1 transition-colors",
            location.pathname === '/' ? "text-white" : "text-white/60 hover:text-white"
          )}
        >
          <Home className="w-6 h-6" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] font-sans font-medium">Home</span>
        </Link>
        
        <Link
          to="/explore"
          className={cn(
            "flex-1 flex flex-col items-center justify-center space-y-1 transition-colors",
            location.pathname === '/explore' ? "text-white" : "text-white/60 hover:text-white"
          )}
        >
          <Search className="w-6 h-6" strokeWidth={location.pathname === '/explore' ? 2.5 : 2} />
          <span className="text-[10px] font-sans font-medium">Explore</span>
        </Link>

        {/* Upload Button */}
        <Link
          to="/upload"
          className="flex-1 flex flex-col items-center justify-center"
        >
          <div className="relative flex items-center justify-center w-11 h-[28px]">
            {/* Left Cyan Border */}
            <div className="absolute left-0 rounded-lg w-full h-full bg-[#20D5EC] -translate-x-[3px]" />
            {/* Right Pink Border */}
            <div className="absolute right-0 rounded-lg w-full h-full bg-[#EF2950] translate-x-[3px]" />
            {/* Center White */}
            <div className="absolute rounded-lg w-full h-full bg-white flex items-center justify-center z-10 transition-transform active:scale-95">
              <Plus className="w-[18px] h-[18px] text-black" strokeWidth={3} />
            </div>
          </div>
        </Link>

        <Link
          to="/notifications"
          className={cn(
            "flex-1 flex flex-col items-center justify-center space-y-1 transition-colors relative",
            location.pathname === '/notifications' ? "text-[#ef2950]" : "text-white/60 hover:text-white"
          )}
        >
          <div className="relative">
            <MessageSquare className="w-[22px] h-[22px] mb-0.5" strokeWidth={location.pathname === '/notifications' ? 2.5 : 2} />
            {location.pathname !== '/notifications' && (
               <div className="absolute top-0 right-0 w-2 h-2 bg-[#ef2950] rounded-full border border-black transform translate-x-1/3 -translate-y-1/4"></div>
            )}
          </div>
          <span className="text-[10px] font-sans font-medium">Inbox</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            "flex-1 flex flex-col items-center justify-center space-y-1 transition-colors",
            location.pathname === '/profile' ? "text-white" : "text-white/60 hover:text-white"
          )}
        >
          <User className="w-[24px] h-[24px]" strokeWidth={location.pathname === '/profile' ? 2.5 : 2} />
          <span className="text-[10px] font-sans font-medium">Profile</span>
        </Link>
      </div>
    </div>
  );
}
