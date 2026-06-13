import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Video } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoPlayerSkeleton } from '../components/VideoPlayerSkeleton';
import { Play, Menu, Search, Tag, ShoppingBag, X } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { parseVideoProduct } from '../utils/videoUtils';

export default function Feed() {
  const { videoId } = useParams<{ videoId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const storeParam = searchParams.get('store');
  const tagParam = searchParams.get('tag');
  
  const [activeTab, setActiveTab] = useState<'for_you' | 'trending'>('for_you');
  
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  const [videos, setVideos] = useState<Video[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const PAGE_SIZE = 10;

  // Pull-to-refresh states and refs
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const { ref, inView } = useInView({
    threshold: 0.1,
  });

  const feedRef = useRef<HTMLDivElement>(null);

  // Track active video based on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollTop;
    const windowHeight = container.clientHeight;
    const currentIndex = Math.round(scrollPosition / windowHeight);
    
    if (currentIndex !== activeIndex) {
      setActiveIndex(currentIndex);
    }
  };

  // Touch event handlers for pull-to-refresh gesture
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing) return;
    const container = feedRef.current;
    if (container && container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling.current || touchStartY.current === null || isRefreshing) return;
    
    const container = feedRef.current;
    if (!container || container.scrollTop > 0) {
      isPulling.current = false;
      touchStartY.current = null;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      // Resistance factor to make pull feel physical/natural
      const distance = Math.min(diff * 0.4, 120);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;
    
    isPulling.current = false;
    touchStartY.current = null;

    if (pullDistance >= 70) {
      setIsRefreshing(true);
      setPullDistance(50); // Keep indicator slightly visible while loading
      
      try {
        await fetchVideos(null, true);
      } catch (err) {
        console.error('Pull-to-refresh failed:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name').order('name');
      if (data) setCategories(data);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    setVideos([]);
    setCursor(null);
    setHasMore(true);
    fetchVideos(null);
  }, [activeTab, categoryParam, storeParam, tagParam]);

  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore && cursor !== null) {
      fetchVideos(cursor);
    }
  }, [inView, hasMore, loading, loadingMore, cursor]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVideos = async (currentCursor: string | null, isSwipeRefresh = false) => {
    if (!currentCursor && !isSwipeRefresh) setLoading(true);
    else if (currentCursor) setLoadingMore(true);

    setError(null);
    
    // Cancel previous fetch if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let fetchedVideos: Video[] = [];
      if (videoId && !currentCursor) {
        // Fetch the specific video via API to bypass any client RLS restrictions
        const specRes = await fetch(`/api/videos/${videoId}`);
        if (!specRes.ok) {
          console.warn('Failed to fetch specific video. It might be deleted or restricted.');
        } else {
          const specData = await specRes.json();
          if (specData.data && !controller.signal.aborted) {
            fetchedVideos.push(specData.data);
          }
        }
      }

      // Fetch from API instead of direct Supabase query for feed to use Redis cache & cursor pagination
      const params = new URLSearchParams();
      params.append('tab', activeTab);
      params.append('limit', PAGE_SIZE.toString());
      if (categoryParam) params.append('categoryId', categoryParam);
      if (storeParam) params.append('store', storeParam);
      if (tagParam) params.append('tag', tagParam);
      if (currentCursor) params.append('cursor', currentCursor);

      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/feed?${params.toString()}`, {
        signal: controller.signal,
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`
        } : undefined
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch feed: ${await res.text()}`);
      }

      if (controller.signal.aborted) return;
      const { data, nextCursor } = await res.json();
      
      let combinedData = data || [];
      if (videoId && !currentCursor) {
         combinedData = combinedData.filter((v: any) => v.id !== videoId);
      }
      
      // Filter out any videos where status is not 'active' (published)
      combinedData = combinedData.filter((v: any) => v.status === 'active' || v.post_status === 'published');

      const combined = !currentCursor ? [...fetchedVideos, ...combinedData] : combinedData;
      
      if (!currentCursor) {
        setVideos(combined);
      } else {
        setVideos((prev) => {
          const existingIds = new Set(prev.map(v => v.id));
          const newVideos = combined.filter((v: any) => !existingIds.has(v.id));
          return [...prev, ...newVideos];
        });
      }
      
      setHasMore(!!nextCursor);
      setCursor(nextCursor);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message.includes('Failed to fetch')) {
        // Ignore aborts or unmount network cancellations
        return;
      }
      console.error('Error fetching videos:', err);
      if (!currentCursor) setError(err.message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  if (loading && cursor === null && videos.length === 0) {
    return (
      <div className="h-full bg-[#0c0c0e] relative overflow-hidden">
        {/* Top Header Skeleton */}
        <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-black/60 via-black/30 to-transparent pt-[env(safe-area-inset-top,40px)] pb-6">
          <div className="flex justify-between items-center px-4 mt-2">
            <div className="w-8 shrink-0 ml-1" />
            <div className="flex items-center gap-x-5">
              <div className="w-16 h-5 bg-white/10 rounded animate-pulse"></div>
              <div className="w-16 h-5 bg-white/10 rounded animate-pulse"></div>
            </div>
            <div className="size-8 bg-white/10 rounded-full animate-pulse mr-1" />
          </div>
        </div>
        
        <VideoPlayerSkeleton className="h-full border-none" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0c0c0e] px-4 text-center gap-y-6 font-sans">
        <p className="text-zinc-500 font-medium tracking-wide">Couldn't load feed</p>
        <button type="button" aria-label="button"  
          onClick={() => fetchVideos(null)}
          className="px-6 py-3 bg-white text-black rounded-full font-semibold active:scale-95 transition-transform"
        >
          Tap to retry
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0c0c0e] px-6 text-center">
        <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
          <Play className="size-8 text-white/30 ml-1.5" />
        </div>
        <p className="text-white/90 font-sans font-bold text-[18px] mb-2 tracking-tight">No published videos found</p>
        <p className="text-[14px] font-sans tracking-wide text-white/50 leading-relaxed max-w-[240px]">We couldn't find any active content right now. Check back later or adjust your filters.</p>
      </div>
    );
  }

  const activeVideo = videos[activeIndex];
  const activeVideoCaption = activeVideo ? parseVideoProduct(activeVideo.caption).captionText : '';
  const activeVideoSchema = activeVideo ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: activeVideoCaption || 'Video on Aisles',
    description: activeVideoCaption || 'Discover and shop products through immersive video experiences.',
    thumbnailUrl: [
      activeVideo.thumbnail_url || 'https://aisles.app/og-image.jpg'
    ],
    uploadDate: activeVideo.created_at || new Date().toISOString(),
    contentUrl: activeVideo.video_url,
    duration: 'PT30S', // Default representation for short-form video
    creator: activeVideo.profiles?.username ? {
      '@type': 'Person',
      name: activeVideo.profiles.username,
      url: `https://aisles.app/creator/${activeVideo.profiles.username}`
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Aisles',
      logo: {
        '@type': 'ImageObject',
        url: 'https://aisles.app/logo.png'
      }
    }
  } : undefined;

  return (
    <div className="relative w-full h-full bg-[#0c0c0e] pb-0">
      {activeVideo && (
        <SEO 
          title={`${activeVideoCaption ? activeVideoCaption.substring(0, 50) + '...' : 'Aisles Video'} | Aisles`}
          description={activeVideoCaption || 'Watch this video on Aisles, the premier video commerce platform.'}
          image={activeVideo.thumbnail_url}
          type="video.other"
          url={`https://aisles.app/video/${activeVideo.id}`}
          structuredData={activeVideoSchema}
          breadcrumbs={[
             { name: 'Home', item: 'https://aisles.app' },
             { name: 'Explore', item: 'https://aisles.app/explore' },
             { name: 'Video', item: `https://aisles.app/video/${activeVideo.id}` }
          ]}
        />
      )}
      
      {/* Pull-To-Refresh Indicator */}
      <div 
        className="absolute top-[calc(env(safe-area-inset-top,40px)+60px)] left-0 right-0 z-30 flex justify-center pointer-events-none transition-all duration-150 ease-out"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance > 0 ? Math.min(pullDistance / 50, 1) : 0
        }}
      >
        <div className="bg-zinc-950/90 border border-white/10 text-white rounded-full p-2.5 shadow-xl backdrop-blur-md flex items-center justify-center size-10">
          <svg 
            className={cn(
              "size-5 text-white transition-transform duration-75",
              isRefreshing ? "animate-spin" : ""
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${pullDistance * 4}deg)`
            }}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
      </div>
      
      {/* Top Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-black/60 via-black/30 to-transparent pt-[env(safe-area-inset-top,40px)] pb-6">
        <div className="flex justify-between items-center px-4 pointer-events-auto mt-2">
          <div className="w-8 shrink-0" />
          
          <div className="flex items-center gap-x-5">
            <button type="button" aria-label="button" 
              onClick={() => setActiveTab('trending')}
              className={cn(
                "relative pb-1.5 font-sans text-[17px] transition-all",
                activeTab === 'trending' ? "text-white font-bold" : "text-white/60 font-semibold"
              )}
            >
              Trending
              {activeTab === 'trending' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-[25%] right-[25%] h-[2.5px] bg-white rounded-full" />
              )}
            </button>
            
            <button type="button" aria-label="button" 
              onClick={() => setActiveTab('for_you')}
              className={cn(
                "relative pb-1.5 font-sans text-[17px] transition-all",
                activeTab === 'for_you' ? "text-white font-bold" : "text-white/60 font-semibold"
              )}
            >
              For You
              {activeTab === 'for_you' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-[25%] right-[25%] h-[2.5px] bg-white rounded-full" />
              )}
            </button>
          </div>

          <Link to="/explore" className="p-2 text-white transition-colors active:scale-95 -mr-2">
            <Search className="size-[24px]" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Categories scrollbar */}
        {!storeParam && !tagParam && categories.length > 0 && (
          <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-2 pointer-events-auto px-4 py-2 mt-1 snap-x">
             <button type="button" aria-label="category"
                onClick={() => {
                   const updated = new URLSearchParams(searchParams);
                   updated.delete('category');
                   setSearchParams(updated);
                }}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all shadow-md backdrop-blur-md snap-start shrink-0 flex items-center",
                  !categoryParam 
                    ? "bg-white text-black border-white" 
                    : "bg-black/40 text-white border border-white/20 hover:bg-black/60"
                )}
             >
                All
             </button>
            {categories.map(cat => (
              <button type="button" aria-label="category" key={cat.id}
                onClick={() => {
                   const updated = new URLSearchParams(searchParams);
                   updated.set('category', cat.id);
                   setSearchParams(updated);
                }}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all shadow-md backdrop-blur-md border snap-start shrink-0 flex items-center",
                  categoryParam === cat.id 
                    ? "bg-white text-black border-white" 
                    : "bg-black/40 text-white/90 border-white/20 hover:bg-black/60"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Filter overlay indicator */}
        {(storeParam || tagParam) && (
          <div className="mx-4 mt-2 bg-zinc-950/90 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 flex items-center justify-between pointer-events-auto shadow-2xl animate-fadeIn select-none">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-[#ef2950] font-sans font-extrabold">Active Filter</span>
              <span className="text-white text-[13.5px] font-sans font-extrabold tracking-tight flex items-center gap-2 mt-0.5">
                {storeParam ? (
                  <>
                    <ShoppingBag className="size-3.5 text-zinc-400" />
                    <span>Store: {storeParam}</span>
                  </>
                ) : (
                  <>
                    <Tag className="size-3.5 text-zinc-400" />
                    <span>Tag: #{tagParam}</span>
                  </>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = new URLSearchParams(searchParams);
                updated.delete('category');
                updated.delete('store');
                updated.delete('tag');
                setSearchParams(updated);
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
            >
              <X className="size-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      <div 
        ref={feedRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute inset-0 overflow-y-auto snap-y snap-mandatory no-scrollbar touch-pan-y" 
        dir="ltr"
      >
        {videos.map((video, index) => {
          return <VideoPlayer key={video.id} video={video} isActive={index === activeIndex} />;
        })}
        {hasMore && (
          <div ref={ref}>
            <VideoPlayerSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}
