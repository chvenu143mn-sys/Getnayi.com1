import { useState, useEffect } from 'react';
import { Home, Plus, User, Search, MessageSquare, Compass, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { theme } from '../styles/theme';

export function Sidebar() {
  const location = useLocation();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    async function checkUnread() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let hasUnreadResult = false;
        if (session?.user) {
          const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('is_read', false);

          if (!error && count !== null) {
            hasUnreadResult = count > 0;
          }
        }
        setHasUnread(hasUnreadResult);
      } catch (e) {
        console.error('Error in checkUnread:', e);
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [location]);

  return (
    <div className={cn("hidden md:flex flex-col w-[88px] lg:w-[280px] h-full border-r shrink-0 p-4 lg:p-6 lg:pt-8 z-40 overflow-y-auto no-scrollbar items-center lg:items-stretch transition-all duration-300", theme.colors.bgBase, theme.colors.borderSubtle)}>
      <div className="flex items-center gap-3 lg:px-4 mb-8 justify-center lg:justify-start">
        <div className={cn("size-10 lg:size-10 shrink-0 rounded-[12px] flex items-center justify-center shadow-sm", theme.colors.textPrimary)}>
           <ShoppingBag className={cn("size-5 lg:size-5", theme.colors.bgBase)} strokeWidth={2.5} />
        </div>
        <span className={cn(theme.typography.heading2, theme.colors.textPrimary, "hidden lg:block")}>Getnayi</span>
      </div>

      <div className="flex flex-col gap-y-3 lg:gap-y-2 flex-1 w-full mt-2">
        <Link
          to="/"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-3 rounded-xl transition-all duration-200 group",
            location.pathname === '/' ? cn(theme.colors.surface1, theme.colors.textPrimary, "font-bold") : cn(theme.colors.textSecondary, "hover:text-text-primary", theme.colors.hoverSurface1)
          )}
        >
          <Home className={cn("shrink-0")} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="hidden lg:block text-[16px] tracking-wide">For You</span>
        </Link>
        
        <Link
          to="/explore"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-3 rounded-xl transition-all duration-200 group",
            location.pathname === '/explore' ? cn(theme.colors.surface1, theme.colors.textPrimary, "font-bold") : cn(theme.colors.textSecondary, "hover:text-text-primary", theme.colors.hoverSurface1)
          )}
        >
          <Compass className={cn("shrink-0")} strokeWidth={location.pathname === '/explore' ? 2.5 : 2} />
          <span className="hidden lg:block text-[16px] tracking-wide">Explore</span>
        </Link>

        <Link
          to="/trending"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-3 rounded-xl transition-all duration-200 group",
            location.pathname === '/trending' ? cn(theme.colors.surface1, theme.colors.textPrimary, "font-bold") : cn(theme.colors.textSecondary, "hover:text-text-primary", theme.colors.hoverSurface1)
          )}
        >
          <Search className={cn("shrink-0")} strokeWidth={location.pathname === '/trending' ? 2.5 : 2} />
          <span className="hidden lg:block text-[16px] tracking-wide">Trending</span>
        </Link>

        <Link
          to="/notifications"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-3 rounded-xl transition-all duration-200 relative group",
            location.pathname === '/notifications' ? cn(theme.colors.surface1, theme.colors.textPrimary, "font-bold") : cn(theme.colors.textSecondary, "hover:text-text-primary", theme.colors.hoverSurface1)
          )}
        >
          <div className="relative shrink-0">
            <MessageSquare className={cn("size-[24px]")} strokeWidth={location.pathname === '/notifications' ? 2.5 : 2} />
            {hasUnread && (
               <div className={cn("absolute top-0 right-0 size-2.5 rounded-full border-2 transform translate-x-1/3 -translate-y-1/4", theme.colors.brandPrimary, theme.colors.bgBase)}></div>
            )}
          </div>
          <span className="hidden lg:block text-[16px] tracking-wide">Messages</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-3 rounded-xl transition-all duration-200 group",
            location.pathname === '/profile' ? cn(theme.colors.surface1, theme.colors.textPrimary, "font-bold") : cn(theme.colors.textSecondary, "hover:text-text-primary", theme.colors.hoverSurface1)
          )}
        >
          <User className={cn("shrink-0")} strokeWidth={location.pathname === '/profile' ? 2.5 : 2} />
          <span className="hidden lg:block text-[16px] tracking-wide">Profile</span>
        </Link>
      </div>

      <div className="mt-auto pt-6 flex flex-col gap-4 w-full">
        <Link
          to="/upload"
          className={cn("flex items-center justify-center lg:gap-x-3 size-12 lg:size-auto lg:w-full lg:py-3.5 rounded-[12px] font-semibold text-[16px] transition-transform active:scale-95 mx-auto hover:opacity-90 shadow-md", theme.colors.brandPrimary, "text-bg-base")}
        >
          <Plus className="size-5 shrink-0" strokeWidth={2.5} />
          <span className="hidden lg:block">Upload</span>
        </Link>
        <div className={cn("hidden lg:flex flex-wrap items-center justify-center gap-x-2 gap-y-2 mt-4 font-medium pb-2", theme.typography.label, theme.colors.textSecondary)}>
          <Link to="/terms" className="hover:text-text-primary transition-colors p-2 flex items-center min-h-[44px]">Terms</Link>
          <Link to="/privacy" className="hover:text-text-primary transition-colors p-2 flex items-center min-h-[44px]">Privacy</Link>
          <span className="p-2 flex items-center min-h-[44px]">© 2026 GetNayi</span>
        </div>
      </div>
    </div>
  );
}
