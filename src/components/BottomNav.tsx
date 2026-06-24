import { useState, useEffect } from 'react';
import { Home, Plus, User, Search, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { supabase } from '../lib/supabase';

export function BottomNav() {
  const location = useLocation();
  const [hasUnread, setHasUnread] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    async function checkUnread() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        let hasUnreadResult = false;
        let isDbCallFailed = false;

        if (session?.user) {
          const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('is_read', false);

          if (error) {
            console.warn('Error checking notifications count:', error.message);
          } else if (count !== null) {
            hasUnreadResult = count > 0;
          }
        }

        setHasUnread(hasUnreadResult);
      } catch (e) {
        console.error('Error in checkUnread:', e);
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [location]);

  return (
    <div className="md:hidden fixed bottom-0 w-full z-40 bg-[#0c0c0e] pb-[env(safe-area-inset-bottom)] border-t border-white/[0.08]">
      <div className="flex items-center justify-between h-[60px] px-2 sm:max-w-md sm:mx-auto">
        <Link
          to="/"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-colors",
            location.pathname === '/' ? "text-white" : "text-white/60 hover:text-white"
          )}
        >
          <Home className="size-6" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] font-sans font-medium">Home</span>
        </Link>
        
        <Link
          to="/explore"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-colors",
            location.pathname === '/explore' ? "text-white" : "text-white/60 hover:text-white"
          )}
        >
          <Search className="size-6" strokeWidth={location.pathname === '/explore' ? 2.5 : 2} />
          <span className="text-[10px] font-sans font-medium">Explore</span>
        </Link>

        {/* Upload Button */}
        <Link
          to="/upload"
          className="flex-1 flex flex-col items-center justify-center"
        >
          <div className="relative flex items-center justify-center w-11 h-[28px]">
            {/* Left Cyan Border */}
            <div className="absolute left-0 rounded-lg size-full bg-[#20D5EC] -translate-x-[3px]" />
            {/* Right Pink Border */}
            <div className="absolute right-0 rounded-lg size-full bg-[#d9183b] translate-x-[3px]" />
            {/* Center White */}
            <div className="absolute rounded-lg size-full bg-white flex items-center justify-center z-10 transition-transform active:scale-95">
              <Plus className="size-[18px] text-black" strokeWidth={3} />
            </div>
          </div>
        </Link>

        <Link
          to="/notifications"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-colors relative",
            location.pathname === '/notifications' ? "text-[#d9183b]" : "text-white/60 hover:text-white"
          )}
        >
          <div className="relative">
            <MessageSquare className="size-[22px] mb-0.5" strokeWidth={location.pathname === '/notifications' ? 2.5 : 2} />
            {hasUnread && (
               <div className="absolute top-0 right-0 size-2 bg-[#d9183b] rounded-full border border-black transform translate-x-1/3 -translate-y-1/4 animate-pulse"></div>
            )}
          </div>
          <span className="text-[10px] font-sans font-medium">Inbox</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-colors",
            location.pathname === '/profile' ? "text-white" : "text-white/60 hover:text-white"
          )}
        >
          <User className="size-[24px]" strokeWidth={location.pathname === '/profile' ? 2.5 : 2} />
          <span className="text-[10px] font-sans font-medium">Profile</span>
        </Link>
      </div>
    </div>
  );
}
