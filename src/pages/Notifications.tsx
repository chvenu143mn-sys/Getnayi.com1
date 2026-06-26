import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertCircle, 
  BellOff, 
  Check, 
  MailOpen, 
  Trash2, 
  Bell, 
  Heart, 
  MessageSquare, 
  UserPlus, 
  Info, 
  Calendar, 
  X, 
  Eye, 
  Clock,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseVideoProduct } from '../utils/videoUtils';

const groupNotifications = (notifs: UINotification[]) => {
  const todayList: UINotification[] = [];
  const thisWeekList: UINotification[] = [];
  const olderList: UINotification[] = [];

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

    notifs.forEach(notif => {
    const diffTime = now.getTime() - notif.rawDate.getTime();
      if (diffTime < oneDayMs) {
        todayList.push(notif);
    } else if (diffTime < sevenDaysMs) {
        thisWeekList.push(notif);
    } else {
        olderList.push(notif);
    }
  });
  
  const groups: { key: string; title: string; data: UINotification[] }[] = [];
  if (todayList.length > 0) groups.push({ key: 'today', title: 'Today', data: todayList });
  if (thisWeekList.length > 0) groups.push({ key: 'week', title: 'This Week', data: thisWeekList });
  if (olderList.length > 0) groups.push({ key: 'older', title: 'Older', data: olderList });
  return groups;
};

const tabs = ['All', 'Likes', 'Comments', 'Follows', 'System'];

interface UINotification {
  id: string;
  type: string;
  iconColor?: string;
  icon?: string;
  title?: string;
  isReal: boolean;
  rejection_reason?: string;
  is_read: boolean;
  user?: {
    name: string;
    image: string;
  };
  content: string;
  time: string;
  targetImage?: string;
  video?: any;
  rawDate: Date;
}

function NotificationItem({ 
  notif, 
  onDelete, 
  onClick, 
  onToggleRead,
  onLongPress
}: { 
  notif: UINotification, 
  onDelete: (id: string, e: React.MouseEvent) => void, 
  onClick: () => void, 
  onToggleRead: (id: string, currentStatus: boolean, e: React.MouseEvent) => void,
  onLongPress: (notif: UINotification) => void
}) {
  const navigate = useNavigate();
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const isLongPressActiveRef = useRef<boolean>(false);

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    isLongPressActiveRef.current = false;
    startTimeRef.current = Date.now();
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      onLongPress(notif);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch (vErr) {
          // Ignore vibration failures silently
        }
      }
    }, 550); // 550ms delay for intentional hold
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleItemClick = (e: React.MouseEvent) => {
    if (isLongPressActiveRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActiveRef.current = false;
      return;
    }

    const duration = Date.now() - startTimeRef.current;
    if (duration < 550) {
      onClick();
    } else {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, x: -90, height: 0, transition: { opacity: { duration: 0.1 }, x: { duration: 0.16 }, height: { delay: 0.06, duration: 0.1 } } }}
      transition={{ type: "spring", stiffness: 520, damping: 42 }}
      layout
      className="relative overflow-hidden group border-b border-white/[0.015] last:border-b-0"
    >
      {/* Background Red Delete Area (revealed when swiped left) */}
      <div className="absolute inset-y-0 right-0 w-[80px] bg-red-600 flex items-center justify-center text-white font-medium z-0">
        <button
          type="button"
          onClick={(e) => onDelete(notif.id, e)}
          className="size-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-all duration-150"
        >
          <Trash2 className="size-4 text-white" />
          <span className="text-[8px] font-black uppercase tracking-wider text-white/90">Delete</span>
        </button>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={{ left: 0.08, right: 0.01 }}
        onMouseDown={startPress}
        onTouchStart={startPress}
        onMouseUp={endPress}
        onTouchEnd={endPress}
        onMouseLeave={cancelPress}
        onTouchCancel={cancelPress}
        onDragStart={cancelPress}
        whileTap={{ scale: 0.995 }}
        onClick={handleItemClick}
        className={`flex items-center py-2.5 px-4 md:px-5 select-none touch-pan-y cursor-pointer transition-all duration-150 relative z-10 ${
          !notif.is_read
            ? 'bg-[#0c0c0e] before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#ff5a36]/[0.03] before:to-transparent'
            : 'bg-[#0c0c0e]'
        }`}
      >
        {/* Left Avatar with Smart Sub-badges (TikTok/Instagram style) */}
        <div className="mr-3 relative shrink-0">
          {notif.type === 'system' ? (
            <div className="relative">
              <div className={`w-[36px] h-[36px] rounded-full flex items-center justify-center shadow-sm relative transition-colors ${
                notif.iconColor === 'red'
                  ? 'bg-rose-500/10 border border-rose-500/15 text-[#ff5a36]'
                  : 'bg-blue-500/10 border border-blue-500/15 text-blue-400'
              }`}>
                {notif.iconColor === 'red' ? (
                  <AlertCircle className="size-4.5 text-[#ff5a36]" strokeWidth={2.5} />
                ) : (
                  <ShieldCheck className="size-4.5 text-blue-400" strokeWidth={2} />
                )}
              </div>
              <span className="absolute -top-0.5 -right-0.5 size-2 bg-[#ff5a36] rounded-full border border-[#0c0c0e] shadow-sm animate-pulse" />
            </div>
          ) : (
            <div className="relative">
              <div className="w-[36px] h-[36px] rounded-full overflow-hidden shadow-sm bg-zinc-800 border border-white/5 transition-transform group-hover:scale-105 duration-200">
                <img src={notif.user?.image} alt={notif.user?.name} className="size-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
              </div>
              
              {/* Ultra-slick Miniature Activity Sub-badge (TikTok & Instagram signature UI) */}
              <div className={`absolute -bottom-1 -right-1 size-4 rounded-full flex items-center justify-center border border-[#0c0c0e] text-white shadow-md ${
                notif.type === 'like' ? 'bg-[#ff5a36]' :
                notif.type === 'comment' ? 'bg-sky-500' :
                notif.type === 'follow' ? 'bg-indigo-500' :
                'bg-zinc-600'
              }`}>
                {notif.type === 'like' && <Heart className="size-2.5 fill-white" />}
                {notif.type === 'comment' && <MessageSquare className="size-2 text-white fill-white/10" />}
                {notif.type === 'follow' && <UserPlus className="size-2 text-white" />}
              </div>
            </div>
          )}
        </div>
        
        {/* Middle Content (Perfect inline typography layout) */}
        <div className="flex-1 pr-2 min-w-0">
          {notif.title && notif.type === 'system' && (
            <h4 className="text-[11.5px] font-black text-rose-400 tracking-wide mb-0.5 uppercase">
              {notif.title}
            </h4>
          )}
          <p className="text-[12.5px] text-zinc-300 leading-snug break-words">
            {notif.user && (
              <span className="font-bold text-white mr-1.5 select-none hover:underline cursor-pointer">
                {notif.user.name}
              </span>
            )}
            <span className={notif.type === 'system' ? 'text-zinc-200 font-medium' : 'text-zinc-300'}>
              {notif.content}
            </span>
            <span className="text-zinc-400 text-[10.5px] font-semibold ml-1.5 whitespace-nowrap select-none">
              {notif.time}
            </span>
          </p>

          {notif.rejection_reason && (
            <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#ff5a36] font-black cursor-pointer hover:underline select-none">
              <span className="size-1 bg-[#ff5a36] rounded-full animate-ping" />
              <span>View moderation details • Click here</span>
            </div>
          )}
        </div>
        
        {/* Right Actions & Unread indicator */}
        <div className="flex items-center gap-2.5 shrink-0 ml-1.5">
          {/* Linked Target Video Thumbnail */}
          {notif.targetImage && (
            <div className="w-[34px] h-[34px] rounded-[4px] overflow-hidden shadow-sm bg-zinc-800 border border-white/5 group-hover:border-white/20 transition-colors">
              <img src={notif.targetImage} alt="Reference Thumbnail" className="size-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
            </div>
          )}

          {/* Social interactive pill action buttons */}
          {notif.type === 'follow' && (
            <button
              type="button"
              className="h-6 px-3 bg-[#ff5a36] hover:bg-[#ff5a36]/90 active:scale-95 text-white font-black text-[10px] rounded-full tracking-wide shadow-sm transition-all"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/profile');
              }}
            >
              Follow
            </button>
          )}

          {/* Unread pulsing dot status */}
          {!notif.is_read && (
            <button 
              type="button"
              onClick={(e) => onToggleRead(notif.id, notif.is_read, e)}
              className="p-1 rounded-full hover:bg-white/5 text-[#ff5a36] transition-colors"
              title="Mark as read"
            >
              <div className="relative size-1.5 flex items-center justify-center">
                <span className="absolute size-2.5 bg-[#ff5a36] rounded-full animate-ping opacity-75" />
                <span className="size-1.5 bg-[#ff5a36] rounded-full" />
              </div>
            </button>
          )}

          {/* Read status toggler */}
          {notif.is_read && (
            <button 
              type="button"
              onClick={(e) => onToggleRead(notif.id, notif.is_read, e)}
              className="p-1 rounded-full hover:bg-white/5 text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Mark as unread"
            >
              <MailOpen className="size-3" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [previewNotification, setPreviewNotification] = useState<UINotification | null>(null);

  // Web notification permissions state
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  

  const [isTableMissing, setIsTableMissing] = useState(false);

  async function loadNotifications() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let fetchedNotifs: any[] = [];
      let detectedMissing = false;

      if (session?.user) {
        // 1. Try complex joined query
        const complexResult = await supabase
          .from('notifications')
          .select(`
            *,
            actor:profiles!actor_id(username, avatar_url),
            video:videos(id, caption, thumbnail_url, video_url)
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (complexResult.error) {
          console.warn('[Fetch Notifications Complex Error, falling back to client-side query]:', complexResult.error.message);
          
          if (complexResult.error?.message?.includes("Could not find the table") || complexResult.error?.message?.includes("does not exist")) {
            detectedMissing = true;
          }
          
          // 2. Fall back to simple query if not a missing table err
          if (!detectedMissing) {
            const simpleResult = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false });
              
            if (simpleResult.error) {
              console.error('[Fetch Notifications Fallback Error]:', simpleResult.error.message);
              if (simpleResult.error?.message?.includes("Could not find the table") || simpleResult.error?.message?.includes("does not exist")) {
                detectedMissing = true;
              }
            } else if (simpleResult.data) {
              const rawNotifs = simpleResult.data;
              const actorIds = [...new Set(rawNotifs.flatMap(n => n.actor_id ? [n.actor_id] : []))];
              const videoIds = [...new Set(rawNotifs.flatMap(n => n.video_id ? [n.video_id] : []))];
              
              let actorsMap: Record<string, any> = {};
              let videosMap: Record<string, any> = {};
              
              if (actorIds.length > 0) {
                const { data: actorsData } = await supabase
                  .from('profiles')
                  .select('id, username, avatar_url')
                  .in('id', actorIds);
                if (actorsData) {
                  actorsData.forEach(a => { actorsMap[a.id] = a; });
                }
              }
              
              if (videoIds.length > 0) {
                const { data: videosData } = await supabase
                  .from('videos')
                  .select('id, caption, thumbnail_url, video_url')
                  .in('id', videoIds);
                if (videosData) {
                  videosData.forEach(v => { videosMap[v.id] = v; });
                }
              }
              
              fetchedNotifs = rawNotifs.map(n => ({
                ...n,
                actor: n.actor_id ? actorsMap[n.actor_id] : null,
                video: n.video_id ? videosMap[n.video_id] : null
              }));
            }
          }
        } else if (complexResult.data) {
          fetchedNotifs = complexResult.data;
        }
      } else {
        detectedMissing = true;
      }

      if (detectedMissing) {
        setIsTableMissing(true);
      }

      setDbNotifications(fetchedNotifs);
    } catch (err) {
      console.error('[Notifications Load Catch]:', err);
      setIsTableMissing(true);
      setDbNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  // 1. Initial Load & Realtime Subscription Setup
  useEffect(() => {
    loadNotifications();

    let channel: any;

    async function setupRealtimeSubscription() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Skip subscribing if table is missing or fails initial load checks
      if (isTableMissing) return;

      try {
        // Use a unique channel id suffix per mount to avoid client-side duplicate subscription errors
        const uniqueChannelId = `user-realtime-notifs-${session.user.id}-${Math.random().toString(36).substring(2, 9)}`;
        channel = supabase
          .channel(uniqueChannelId)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${session.user.id}`
            },
            (payload) => {
              console.log('[Realtime Notification Event]:', payload);
              loadNotifications();

              // Web Push notification trigger on new admin updates / interactions
              if (payload.eventType === 'INSERT' && 'Notification' in window && Notification.permission === 'granted') {
                let pushTitle = 'New Notification';
                let pushBody = 'You received a new notification.';

                const freshItem = payload.new;
                if (freshItem.type === 'admin') {
                  pushTitle = 'Video Status Update 🚨';
                  pushBody = `Your uploaded video was rejected. Reason: ${freshItem.rejection_reason || 'No reason described'}`;
                } else if (freshItem.type === 'like') {
                  pushTitle = 'New Video Like ❤️';
                  pushBody = 'A viewer liked one of your uploaded videos.';
                } else if (freshItem.type === 'comment') {
                  pushTitle = 'New Video Comment 💬';
                  pushBody = 'A viewer commented on one of your videos.';
                } else if (freshItem.type === 'follow') {
                  pushTitle = 'New Follower ✨';
                  pushBody = 'Another dynamic creator just followed you.';
                }

                try {
                  new Notification(pushTitle, {
                    body: pushBody,
                    icon: '/favicon.ico',
                    tag: freshItem.id
                  });
                } catch (err) {
                  console.error('[Desktop Notification error]:', err);
                }
              }
            }
          );

        channel.subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[Realtime Subscription Channel Error] Supabase notifications table may not exist or permit realtime sync.');
          }
        });
      } catch (err) {
        console.warn('Could not launch realtime subscription:', err);
      }
    }

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (unsubErr) {
          console.warn('[Realtime Unsubscription Failed]:', unsubErr);
        }
      }
    };
  }, [isTableMissing]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        new Notification('Browser Alerts Enabled!', {
          body: 'You will now receive modern real-time notifications about video rejections and likes.',
          icon: '/favicon.ico'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleReadStatus = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDbNotifications(prev => {
        const updated = prev.map(notif => {
          if (notif.id === id) {
            return { ...notif, is_read: !currentStatus };
          }
          return notif;
        });
        return updated;
      });

      if (!isTableMissing) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: !currentStatus })
          .eq('id', id);

        if (error) {
          console.error('Failed to update read status:', error);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      setDbNotifications(prev => {
        const updated = prev.map(notif => ({ ...notif, is_read: true }));
        return updated;
      });

      if (!isTableMissing && session?.user) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Failed to mark all as read:', error);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDbNotifications(prev => {
        const updated = prev.filter(notif => notif.id !== id);
        return updated;
      });

      if (!isTableMissing) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Failed to delete notification:', error);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formattedDbNotifs: UINotification[] = dbNotifications.map((notif) => {
    let uiType = notif.type;
    let iconColor = 'blue';
    let title: string | undefined = undefined;
    let content = 'notified you.';

    if (notif.type === 'admin') {
      uiType = 'system';
      iconColor = 'red';
      title = 'Video Rejection Update';
      content = `Your video "${parseVideoProduct(notif.video?.caption).captionText || 'Untitled Video'}" was rejected. Reason: ${notif.rejection_reason || 'No reason specified'}`;
    } else if (notif.type === 'like') {
      uiType = 'like';
      content = 'liked your video.';
    } else if (notif.type === 'comment') {
      uiType = 'comment';
      content = 'commented on your video.';
    } else if (notif.type === 'follow') {
      uiType = 'follow';
      content = 'started following you.';
    }

    let timeString = 'Just now';
    if (notif.created_at) {
      const diffMs = Date.now() - new Date(notif.created_at).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) timeString = 'Just now';
      else if (diffMin < 60) timeString = `${diffMin}m ago`;
      else {
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) timeString = `${diffHr}h ago`;
        else timeString = `${Math.floor(diffHr / 24)}d ago`;
      }
    }

    return {
      id: notif.id,
      type: uiType,
      iconColor,
      title,
      isReal: true,
      rejection_reason: notif.rejection_reason,
      is_read: !!notif.is_read,
      user: notif.actor ? {
        name: notif.actor.username || 'System Admin',
        image: notif.actor.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'
      } : undefined,
      content,
      time: timeString,
      targetImage: notif.video?.thumbnail_url || undefined,
      video: notif.video,
      rawDate: notif.created_at ? new Date(notif.created_at) : new Date()
    };
  });

  const filteredNotifications = formattedDbNotifs.filter((notif) => {
    // 1. Tab filtering
    if (activeTab === 'Likes' && notif.type !== 'like') return false;
    if (activeTab === 'Comments' && notif.type !== 'comment') return false;
    if (activeTab === 'Follows' && notif.type !== 'follow') return false;
    if (activeTab === 'System' && notif.type !== 'system') return false;

    // 2. Real-time Search Keyword filtering
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const userName = notif.user?.name?.toLowerCase() || '';
      const content = notif.content?.toLowerCase() || '';
      const title = notif.title?.toLowerCase() || '';
      const rejection = notif.rejection_reason?.toLowerCase() || '';

      return userName.includes(query) || content.includes(query) || title.includes(query) || rejection.includes(query);
    }

    return true;
  });

  const groupedGroups = groupNotifications(filteredNotifications);

  const handleNotificationClick = async (notif: UINotification) => {
    if (!notif.is_read) {
      try {
        setDbNotifications(prev => prev.map(item => {
          if (item.id === notif.id) {
            return { ...item, is_read: true };
          }
          return item;
        }));
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notif.id);
      } catch (err) {
        console.error('Failed to auto-mark as read:', err);
      }
    }

    // Automatically route to relevant target content based on metadata
    if (notif.type === 'like' || notif.type === 'comment') {
      if (notif.video?.id) {
        navigate(`/video/${notif.video.id}`);
      } else {
        navigate('/');
      }
    } else if (notif.type === 'follow') {
      navigate('/profile');
    } else if (notif.type === 'system') {
      // System/Moderator status, route to creator dashboard center
      navigate('/creator-dashboard');
      if (notif.rejection_reason) {
        setSelectedNotification(notif);
      }
    } else {
      if (notif.rejection_reason) {
        setSelectedNotification(notif);
      } else {
        navigate('/profile');
      }
    }
  };

  return (
    <div className="flex-1 w-full text-white font-sans flex flex-col h-full bg-[#0c0c0e]">
      {/* Premium Social Styled Header */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-white/[0.03] flex flex-col gap-2">
        <div className="flex items-center justify-between px-5 pt-5 pb-1 select-none">
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Inbox
          </h1>
          {dbNotifications.some(n => !n.is_read) && (
            <button type="button"
              onClick={markAllAsRead}
              className="text-xs font-bold text-[#ff5a36] hover:text-[#f35775] transition-colors flex items-center gap-1 shrink-0"
            >
              <Check className="size-3.5" strokeWidth={2.5} />
              Mark all read
            </button>
          )}
        </div>

        {/* Real-time search query capsule */}
        <div className="px-5 pb-2">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
              <Search className="size-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search senders, updates..."
              className="w-full bg-zinc-900 focus:bg-zinc-900 border border-transparent focus:border-white/10 rounded-[10px] py-1.5 pl-9 pr-9 text-xs font-medium text-white placeholder-zinc-500 outline-none transition-all duration-150"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Premium Pill Categorization Tab Tray */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-5 pb-3">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 select-none ${
                activeTab === tab
                  ? 'bg-white text-black font-extrabold shadow-sm'
                  : 'bg-zinc-900/60 border border-white/[0.04] text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
        {/* Modern Web Push Permission Prompt */}
        {permission === 'default' && (
          <div className="mx-5 my-4 p-4 bg-zinc-900/80 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#ff5a36]/15 flex items-center justify-center text-[#ff5a36]">
                <Bell className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white tracking-wide">Enable Desktop Alerts</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">Receive real-time push events when your videos are approved or rejected.</p>
              </div>
            </div>
            <button type="button"
              onClick={requestPushPermission}
              className="px-3.5 py-1.5 bg-[#ff5a36] hover:bg-[#ff5a36]/90 text-white rounded-lg text-xs font-semibold tracking-wide shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
            >
              Enable
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-400 text-sm h-full min-h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5a36] mb-3"></div>
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Clean, modern, illustrated empty state */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center py-20 text-center px-4 h-full min-h-[350px]"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#ff5a36]/5 rounded-full blur-2xl transform scale-150 animate-pulse" />
              <div className="relative size-20 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 shadow-xl">
                <BellOff className="size-9 text-zinc-400" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white tracking-wide mb-2">No notifications yet</h3>
            <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
              When there are updates regarding likes, comments, onboarding, or video moderation, you'll see them right here.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col pb-16"
          >
            {groupedGroups.map((group) => (
              <div key={group.key} className="mb-6">
                {/* Category Date Header */}
                <div className="sticky top-0 z-10 bg-[#0c0c0e]/95 backdrop-blur-sm py-2 px-5 text-xs font-semibold uppercase tracking-wider text-zinc-400 select-none">
                  {group.title}
                </div>

                <div className="flex flex-col">
                  <AnimatePresence initial={false} mode="popLayout">
                    {group.data.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notif={notif}
                        onDelete={handleDeleteNotification}
                        onToggleRead={toggleReadStatus}
                        onClick={() => handleNotificationClick(notif)}
                        onLongPress={setPreviewNotification}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Rejection Details Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/85 backdrop-blur-sm"
            onClick={() => setSelectedNotification(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#121215] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4 text-[#ff5a36]">
                <div className="size-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/15">
                  <AlertCircle className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-white tracking-wide">Video Rejection Info</h3>
              </div>
              
              <div className="space-y-4 font-sans">
                {selectedNotification.video && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                    {selectedNotification.targetImage && (
                      <div className="size-12 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-zinc-800">
                        <img src={selectedNotification.targetImage} alt="Reference" className="size-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate leading-tight">
                        {parseVideoProduct(selectedNotification.video.caption).captionText || 'Untitled Video'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1 truncate">
                        Uploaded video status update
                      </p>
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Moderator Feedback
                  </h4>
                  <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-200/90 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedNotification.rejection_reason || 'No reason described by the moderator.'}
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-normal">
                  Our moderators check all submissions against product integration guidelines. If you believe this was an error, please inspect your video link or capture details and try uploading again.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setSelectedNotification(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/5 transition rounded-xl text-sm font-medium text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Summary Pop-over Modal for Long-Press Preview */}
      <AnimatePresence>
        {previewNotification && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/85 backdrop-blur-sm"
            onClick={() => setPreviewNotification(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#16161a]/95 border border-white/10 rounded-[28px] overflow-hidden shadow-2xl p-6 flex flex-col relative backdrop-blur-xl"
            >
              {/* Close Button / Tap to close indicator */}
              <button
                type="button"
                onClick={() => setPreviewNotification(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 active:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close preview"
              >
                <X className="size-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-5 select-none">
                {/* Pop-over Top Left Icon Indicator based on type */}
                <div className={`p-3 rounded-2xl ${
                  previewNotification.type === 'system'
                    ? 'bg-rose-500/10 border border-rose-500/15 text-[#ff5a36]'
                    : previewNotification.type === 'like'
                    ? 'bg-rose-500/10 border border-rose-500/15 text-rose-400'
                    : previewNotification.type === 'comment'
                    ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400'
                    : previewNotification.type === 'follow'
                    ? 'bg-indigo-500/10 border border-indigo-500/15 text-indigo-400'
                    : 'bg-blue-500/10 border border-blue-500/15 text-blue-400'
                }`}>
                  {previewNotification.type === 'system' ? (
                    <AlertCircle className="size-5.5" />
                  ) : previewNotification.type === 'like' ? (
                    <Heart className="size-5.5 fill-rose-400" />
                  ) : previewNotification.type === 'comment' ? (
                    <MessageSquare className="size-5.5 fill-emerald-400/20" />
                  ) : previewNotification.type === 'follow' ? (
                    <UserPlus className="size-5.5" />
                  ) : (
                    <ShieldCheck className="size-5.5" />
                  )}
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#ff5a36]">
                    {previewNotification.type === 'system' ? 'System Notification' : `${previewNotification.type} Activity`}
                  </h4>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    {previewNotification.title || (previewNotification.type === 'system' ? 'Moderator Update' : 'Interaction Summary')}
                  </h3>
                </div>
              </div>

              {/* Main Content Details */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-5 space-y-3">
                {/* User avatar and name if present */}
                {(previewNotification.user || previewNotification.type !== 'system') && (
                  <div className="flex items-center gap-3 pb-3 border-b border-white/5 select-none">
                    <div className="size-10 rounded-full overflow-hidden bg-zinc-800 border border-white/5">
                      <img 
                        src={previewNotification.user?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'} 
                        alt={previewNotification.user?.name || 'System Admin'} 
                        className="size-full object-cover" 
                        referrerPolicy="no-referrer"
                      loading="lazy" decoding="async" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {previewNotification.user?.name || 'TikTok Admin'}
                      </p>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="size-3" /> {previewNotification.time}
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-[14px] text-zinc-200 leading-relaxed font-sans max-h-[160px] overflow-y-auto no-scrollbar">
                  {previewNotification.content}
                </div>

                {previewNotification.rejection_reason && (
                  <div className="mt-2.5 p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-xl text-rose-300 text-xs leading-normal">
                    <p className="font-semibold mb-1 text-rose-200">Rejection Reason:</p>
                    {previewNotification.rejection_reason}
                  </div>
                )}
              </div>

              {/* Connected Video Reference Card if any */}
              {previewNotification.video && (
                <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-white/5 rounded-2xl mb-6 select-none">
                  {previewNotification.targetImage && (
                    <div className="size-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-zinc-800 relative">
                      <img 
                        src={previewNotification.targetImage} 
                        alt="Video Thumbnail" 
                        className="size-full object-cover" 
                        referrerPolicy="no-referrer"
                      loading="lazy" decoding="async" />
                      <div className="absolute inset-0 bg-[#ff5a36]/10 flex items-center justify-center">
                        <span className="size-2.5 bg-white rounded-full animate-pulse" />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      <Info className="size-3 text-[#ff5a36]" /> Video Attachment
                    </div>
                    <p className="text-xs font-semibold text-white truncate mt-1">
                      {parseVideoProduct(previewNotification.video.caption).captionText || 'Untitled Video'}
                    </p>
                  </div>
                </div>
              )}

              {/* Call-to-actions Bar inside popover */}
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    toggleReadStatus(previewNotification.id, previewNotification.is_read, e);
                    setPreviewNotification(prev => prev ? { ...prev, is_read: !prev.is_read } : null);
                  }}
                  className={`py-3 px-4 rounded-xl border font-semibold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                    previewNotification.is_read 
                      ? 'bg-transparent border-white/10 hover:border-white/20 active:bg-white/5 text-zinc-400 hover:text-white'
                      : 'bg-white/10 border-white/10 hover:bg-white/15 active:bg-white/5 text-white'
                  }`}
                >
                  <MailOpen className="size-4" />
                  {previewNotification.is_read ? 'Mark Unread' : 'Mark Read'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleDeleteNotification(previewNotification.id, e);
                    setPreviewNotification(null);
                  }}
                  className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/15 active:bg-rose-500/5 hover:border-rose-500/20 text-[#ff5a36] border border-rose-500/10 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>

              <p className="text-[10px] text-zinc-400 text-center mt-4">
                Tap anywhere outside the box to close this preview.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
