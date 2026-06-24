import { useState, useEffect } from 'react';
import { Home, Plus, User, Search, MessageSquare, Compass, Video } from 'lucide-react';
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
    <div className="hidden md:flex flex-col w-[240px] lg:w-[280px] h-full bg-[#0c0c0e] border-r border-white/10 shrink-0 p-4 pt-6 z-40 overflow-y-auto no-scrollbar">
      <Link to="/" className="flex items-center gap-3 px-4 mb-8">
        <div className="size-8 rounded-lg bg-gradient-to-tr from-[#d9183b] to-[#20D5EC] flex items-center justify-center">
           <Video className="size-5 text-white" />
        </div>
        <span className="text-xl font-display font-bold tracking-tight text-white">Getnayi</span>
      </Link>

      <div className="flex flex-col gap-y-2 flex-1">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-x-4 px-4 py-3 rounded-xl transition-all",
            location.pathname === '/' ? "bg-white/10 text-white font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <Home className="size-6" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-[16px]">For You</span>
        </Link>
        
        <Link
          to="/explore"
          className={cn(
            "flex items-center gap-x-4 px-4 py-3 rounded-xl transition-all",
            location.pathname === '/explore' ? "bg-white/10 text-white font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <Compass className="size-6" strokeWidth={location.pathname === '/explore' ? 2.5 : 2} />
          <span className="text-[16px]">Explore</span>
        </Link>

        <Link
          to="/trending"
          className={cn(
            "flex items-center gap-x-4 px-4 py-3 rounded-xl transition-all",
            location.pathname === '/trending' ? "bg-white/10 text-white font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <Search className="size-6" strokeWidth={location.pathname === '/trending' ? 2.5 : 2} />
          <span className="text-[16px]">Trending</span>
        </Link>

        <Link
          to="/notifications"
          className={cn(
            "flex items-center gap-x-4 px-4 py-3 rounded-xl transition-all relative",
            location.pathname === '/notifications' ? "bg-white/10 text-[#d9183b] font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <div className="relative">
            <MessageSquare className="size-6" strokeWidth={location.pathname === '/notifications' ? 2.5 : 2} />
            {hasUnread && (
               <div className="absolute top-0 right-0 size-2.5 bg-[#d9183b] rounded-full border-2 border-[#0c0c0e] transform translate-x-1/3 -translate-y-1/4 animate-pulse"></div>
            )}
          </div>
          <span className="text-[16px]">Messages</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            "flex items-center gap-x-4 px-4 py-3 rounded-xl transition-all",
            location.pathname === '/profile' ? "bg-white/10 text-white font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <User className="size-6" strokeWidth={location.pathname === '/profile' ? 2.5 : 2} />
          <span className="text-[16px]">Profile</span>
        </Link>
      </div>

      <div className="mt-auto pt-6">
        <Link
          to="/upload"
          className="flex items-center justify-center gap-x-2 w-full py-4 rounded-xl bg-gradient-to-r from-[#d9183b] to-[#20D5EC] text-white font-bold text-[16px] transition-transform active:scale-95 shadow-lg shadow-[#d9183b]/20"
        >
          <Plus className="size-6" strokeWidth={2.5} />
          Upload
        </Link>
      </div>
    </div>
  );
}
