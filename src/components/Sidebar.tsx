import { useState, useEffect } from 'react';
import { Home, Plus, User, Search, MessageSquare, Compass, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

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
    <div className="hidden md:flex flex-col w-[88px] lg:w-[280px] h-full bg-[#0c0c0e] border-r border-white/10 shrink-0 p-4 lg:p-6 lg:pt-8 z-40 overflow-y-auto no-scrollbar items-center lg:items-stretch transition-all duration-300">
      <div className="flex items-center gap-3 lg:px-4 mb-8 justify-center lg:justify-start">
        <div className="size-10 lg:size-8 shrink-0 rounded-full bg-white flex items-center justify-center">
           <ShoppingBag className="size-5 lg:size-4 text-black" strokeWidth={2.5} />
        </div>
        <span className="hidden lg:block text-[18px] font-sans font-bold tracking-tight text-white">Getnayi</span>
      </div>

      <div className="flex flex-col gap-y-3 lg:gap-y-2 flex-1 w-full">
        <Link
          to="/"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-2.5 rounded-lg transition-all group",
            location.pathname === '/' ? "bg-zinc-800/80 text-white font-semibold" : "text-zinc-400 hover:text-white"
          )}
        >
          <Home className={cn("shrink-0", location.pathname === '/' ? "size-[22px]" : "size-[22px]")} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="hidden lg:block text-[15px]">For You</span>
        </Link>
        
        <Link
          to="/explore"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-2.5 rounded-lg transition-all group",
            location.pathname === '/explore' ? "bg-zinc-800/80 text-white font-semibold" : "text-zinc-400 hover:text-white"
          )}
        >
          <Compass className={cn("shrink-0", location.pathname === '/explore' ? "size-[22px]" : "size-[22px]")} strokeWidth={location.pathname === '/explore' ? 2.5 : 2} />
          <span className="hidden lg:block text-[15px]">Explore</span>
        </Link>

        <Link
          to="/trending"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-2.5 rounded-lg transition-all group",
            location.pathname === '/trending' ? "bg-zinc-800/80 text-white font-semibold" : "text-zinc-400 hover:text-white"
          )}
        >
          <Search className={cn("shrink-0", location.pathname === '/trending' ? "size-[22px]" : "size-[22px]")} strokeWidth={location.pathname === '/trending' ? 2.5 : 2} />
          <span className="hidden lg:block text-[15px]">Trending</span>
        </Link>

        <Link
          to="/notifications"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-2.5 rounded-lg transition-all relative group",
            location.pathname === '/notifications' ? "bg-zinc-800/80 text-white font-semibold" : "text-zinc-400 hover:text-white"
          )}
        >
          <div className="relative shrink-0">
            <MessageSquare className={cn("size-[22px]")} strokeWidth={location.pathname === '/notifications' ? 2.5 : 2} />
            {hasUnread && (
               <div className="absolute top-0 right-0 size-2 bg-[#ff5a36] rounded-full border border-[#0c0c0e] transform translate-x-1/3 -translate-y-1/4"></div>
            )}
          </div>
          <span className="hidden lg:block text-[15px]">Messages</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            "flex items-center justify-center lg:justify-start lg:gap-x-4 lg:px-4 size-12 lg:size-auto lg:py-2.5 rounded-lg transition-all group",
            location.pathname === '/profile' ? "bg-zinc-800/80 text-white font-semibold" : "text-zinc-400 hover:text-white"
          )}
        >
          <User className={cn("shrink-0", location.pathname === '/profile' ? "size-[22px]" : "size-[22px]")} strokeWidth={location.pathname === '/profile' ? 2.5 : 2} />
          <span className="hidden lg:block text-[15px]">Profile</span>
        </Link>
      </div>

      <div className="mt-auto pt-6 flex flex-col gap-4 w-full">
        <Link
          to="/upload"
          className="flex items-center justify-center lg:gap-x-3 size-12 lg:size-auto lg:w-full lg:py-3.5 rounded-full bg-white text-black font-semibold text-[15px] transition-transform active:scale-95 mx-auto hover:bg-zinc-100"
        >
          <Plus className="size-5 shrink-0" strokeWidth={2.5} />
          <span className="hidden lg:block">Upload</span>
        </Link>
        <div className="hidden lg:flex flex-wrap items-center justify-center gap-x-2 gap-y-2 mt-4 text-[11px] font-medium text-zinc-400 pb-2">
          <Link to="/terms" className="hover:text-zinc-300 transition-colors p-2 flex items-center min-h-[44px]">Terms</Link>
          <Link to="/privacy" className="hover:text-zinc-300 transition-colors p-2 flex items-center min-h-[44px]">Privacy Policy</Link>
          <span className="text-zinc-600 p-2 flex items-center min-h-[44px]">© 2026 GetNayi</span>
        </div>
      </div>
    </div>
  );
}
