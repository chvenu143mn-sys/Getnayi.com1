import { useState, useEffect } from 'react';
import { Home, Plus, User, Search, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { theme } from '../styles/theme';

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
    <div className={cn("md:hidden fixed bottom-0 w-full z-40 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] border-t", theme.colors.bgBase, "bg-opacity-90", theme.colors.borderSubtle)}>
      <div className="flex items-center justify-between h-[64px] px-4 sm:max-w-md sm:mx-auto">
        <Link
          to="/"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-all duration-300 group h-full",
            location.pathname === '/' ? theme.colors.textPrimary : cn(theme.colors.textSecondary, "hover:text-text-primary")
          )}
        >
          <div className="transition-all duration-300">
            <Home className="size-[24px]" strokeWidth={location.pathname === '/' ? 3 : 2} />
          </div>
          <span className={cn("text-[10px] tracking-wide", theme.typography.label)}>Home</span>
        </Link>
        
        <Link
          to="/explore"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-all duration-300 group h-full",
            location.pathname === '/explore' ? theme.colors.textPrimary : cn(theme.colors.textSecondary, "hover:text-text-primary")
          )}
        >
          <div className="transition-all duration-300">
            <Search className="size-[24px]" strokeWidth={location.pathname === '/explore' ? 3 : 2} />
          </div>
          <span className={cn("text-[10px] tracking-wide", theme.typography.label)}>Explore</span>
        </Link>

        {/* Upload Button */}
        <Link
          to="/upload"
          className="flex-[1.2] flex flex-col items-center justify-center group h-full px-2"
          aria-label="Upload"
        >
          <div className="relative flex items-center justify-center w-[48px] h-[32px] rounded-xl shadow-sm hover:opacity-90 bg-text-primary">
            <Plus className="size-5 text-bg-base" strokeWidth={3} />
          </div>
        </Link>

        <Link
          to="/notifications"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-all duration-300 relative group h-full",
            location.pathname === '/notifications' ? theme.colors.textPrimary : cn(theme.colors.textSecondary, "hover:text-text-primary")
          )}
        >
          <div className="relative transition-all duration-300">
            <MessageSquare className="size-[24px]" strokeWidth={location.pathname === '/notifications' ? 3 : 2} />
            {hasUnread && (
               <div className={cn("absolute top-0 -right-1 size-2 rounded-full border-[1.5px] border-bg-base", theme.colors.brandPrimary)}></div>
            )}
          </div>
          <span className={cn("text-[10px] tracking-wide", theme.typography.label)}>Inbox</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-y-1 transition-all duration-300 group h-full",
            location.pathname === '/profile' ? theme.colors.textPrimary : cn(theme.colors.textSecondary, "hover:text-text-primary")
          )}
        >
          <div className="transition-all duration-300">
            <User className="size-[24px]" strokeWidth={location.pathname === '/profile' ? 3 : 2} />
          </div>
          <span className={cn("text-[10px] tracking-wide", theme.typography.label)}>Profile</span>
        </Link>
      </div>
    </div>
  );
}
