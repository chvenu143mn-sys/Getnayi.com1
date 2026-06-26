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
      <div className="flex items-center justify-between h-[60px] px-3 sm:max-w-md sm:mx-auto">
        <Link
          to="/"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-all duration-300 group h-full",
            location.pathname === '/' ? "text-white" : "text-white/50 hover:text-white/80"
          )}
        >
          <div className={cn("p-1.5 rounded-xl transition-all duration-300", location.pathname === '/' ? "bg-white/10" : "group-hover:bg-white/5")}>
            <Home className="size-[22px]" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          </div>
          <span className="text-[9px] font-sans font-bold tracking-wide">Home</span>
        </Link>
        
        <Link
          to="/explore"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-all duration-300 group h-full",
            location.pathname === '/explore' ? "text-white" : "text-white/50 hover:text-white/80"
          )}
        >
          <div className={cn("p-1.5 rounded-xl transition-all duration-300", location.pathname === '/explore' ? "bg-white/10" : "group-hover:bg-white/5")}>
            <Search className="size-[22px]" strokeWidth={location.pathname === '/explore' ? 2.5 : 2} />
          </div>
          <span className="text-[9px] font-sans font-bold tracking-wide">Explore</span>
        </Link>

        {/* Upload Button */}
        <Link
          to="/upload"
          className="flex-[1.2] flex flex-col items-center justify-center group h-full"
          aria-label="Upload"
        >
          <div className="relative flex items-center justify-center w-[48px] h-[32px] bg-white rounded-full transition-transform group-active:scale-95">
            <Plus className="size-5 text-black" strokeWidth={2.5} />
          </div>
        </Link>

        <Link
          to="/notifications"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-all duration-300 relative group h-full",
            location.pathname === '/notifications' ? "text-white" : "text-white/50 hover:text-white/80"
          )}
        >
          <div className={cn("relative p-1.5 rounded-xl transition-all duration-300", location.pathname === '/notifications' ? "bg-white/10" : "group-hover:bg-white/5")}>
            <MessageSquare className="size-[22px]" strokeWidth={location.pathname === '/notifications' ? 2.5 : 2} />
            {hasUnread && (
               <div className="absolute top-1 right-1 size-2 bg-[#ff5a36] rounded-full border border-[#0c0c0e] animate-pulse"></div>
            )}
          </div>
          <span className="text-[9px] font-sans font-bold tracking-wide">Inbox</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-all duration-300 group h-full",
            location.pathname === '/profile' ? "text-white" : "text-white/50 hover:text-white/80"
          )}
        >
          <div className={cn("p-1.5 rounded-xl transition-all duration-300", location.pathname === '/profile' ? "bg-white/10" : "group-hover:bg-white/5")}>
            <User className="size-[22px]" strokeWidth={location.pathname === '/profile' ? 2.5 : 2} />
          </div>
          <span className="text-[9px] font-sans font-bold tracking-wide">Profile</span>
        </Link>
      </div>
    </div>
  );
}
